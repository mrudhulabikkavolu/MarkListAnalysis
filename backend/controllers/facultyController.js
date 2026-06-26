import pool from '../config/db.js';
import {
  calculateTotal,
  calculateFinalMidBreakdown,
  calculateFinalLab,
  validateMidMarks,
  validateLabMarks,
  EXAM_TYPES,
} from '../utils/marksCalculator.js';
import { exportMarksToExcel } from '../utils/excelParser.js';

const getFacultyProfile = async (userId) => {
  const [fac] = await pool.query(
    'SELECT id, name, email, faculty_code FROM faculty WHERE user_id = ?',
    [userId]
  );
  return fac[0] || null;
};

/** Students matched via JOIN keys: academic_year + study_year + branch + semester + section */
const fetchStudentsForSubject = async (subjectId, facultyId) => {
  const [assignmentRows] = await pool.query(
    `SELECT academic_year_id, study_year, branch, semester, section
     FROM faculty_assignments
     WHERE subject_id = ? AND faculty_db_id = ?
     ORDER BY id DESC LIMIT 1`,
    [subjectId, facultyId]
  );

  if (assignmentRows.length) {
    const assignment = assignmentRows[0];
    const [students] = await pool.query(
      `SELECT DISTINCT st.id, st.roll_number, st.name
       FROM students st
       INNER JOIN sections sec ON st.section_id = sec.id
       WHERE st.academic_year_id = ?
         AND UPPER(TRIM(COALESCE(st.study_year, ''))) = UPPER(TRIM(COALESCE(?, '')))
         AND UPPER(TRIM(st.branch)) = UPPER(TRIM(?))
         AND UPPER(TRIM(st.semester)) = UPPER(TRIM(?))
         AND UPPER(TRIM(sec.name)) = UPPER(TRIM(?))
       ORDER BY st.roll_number`,
      [assignment.academic_year_id, assignment.study_year, assignment.branch, assignment.semester, assignment.section]
    );
    if (students.length) return students;
  }

  const [students] = await pool.query(
    `SELECT DISTINCT st.id, st.roll_number, st.name
     FROM students st
     INNER JOIN sections sec ON st.section_id = sec.id
     INNER JOIN subjects sub ON sub.id = ?
     WHERE st.academic_year_id = sec.academic_year_id
       AND st.section_id = sub.section_id
       AND UPPER(TRIM(st.branch)) = UPPER(TRIM(sub.branch))
       AND TRIM(st.semester) = TRIM(sub.semester)
       AND TRIM(COALESCE(st.study_year, '')) = TRIM(COALESCE(sub.study_year, ''))
     ORDER BY st.roll_number`,
    [subjectId]
  );

  if (students.length) return students;

  const [fallback] = await pool.query(
    `SELECT DISTINCT st.id, st.roll_number, st.name
     FROM students st
     INNER JOIN subjects sub ON sub.id = ?
     WHERE st.section_id = sub.section_id
       AND UPPER(TRIM(st.branch)) = UPPER(TRIM(sub.branch))
       AND TRIM(st.semester) = TRIM(sub.semester)
     ORDER BY st.roll_number`,
    [subjectId]
  );
  return fallback;
};

export const getMyAssignments = async (req, res) => {
  try {
    const faculty = await getFacultyProfile(req.user.id);
    if (!faculty) {
      return res.status(404).json({
        message: 'Faculty profile not found. Admin must upload modified_faclist.xlsx with your Faculty ID.',
      });
    }

    const [assignments] = await pool.query(
      `SELECT fa.id, fa.subject_id, ay.year_label as academic_year, fa.study_year as year,
              fa.branch, fa.semester as sem, fa.section, fa.subject_name as subject,
              fa.faculty_code, fa.faculty_name,
              sub.code as subject_code,
              GREATEST(
                (SELECT COUNT(DISTINCT st.id)
                 FROM students st
                 INNER JOIN sections st_sec ON st.section_id = st_sec.id
                 WHERE st.academic_year_id = fa.academic_year_id
                   AND UPPER(TRIM(COALESCE(st.study_year, ''))) = UPPER(TRIM(COALESCE(fa.study_year, '')))
                   AND UPPER(TRIM(st.branch)) = UPPER(TRIM(fa.branch))
                   AND UPPER(TRIM(st.semester)) = UPPER(TRIM(fa.semester))
                   AND UPPER(TRIM(st_sec.name)) = UPPER(TRIM(fa.section))
                ),
                (SELECT COUNT(DISTINCT st2.id)
                 FROM students st2
                 INNER JOIN subjects sub_cnt ON sub_cnt.id = fa.subject_id
                 WHERE st2.section_id = sub_cnt.section_id
                   AND st2.academic_year_id = fa.academic_year_id
                   AND UPPER(TRIM(st2.branch)) = UPPER(TRIM(sub_cnt.branch))
                   AND UPPER(TRIM(st2.semester)) = UPPER(TRIM(sub_cnt.semester))
                )
              ) as total_students
       FROM faculty_assignments fa
       JOIN academic_years ay ON fa.academic_year_id = ay.id
       LEFT JOIN subjects sub ON fa.subject_id = sub.id
       WHERE fa.faculty_db_id = ?
       ORDER BY ay.year_label DESC, fa.branch, fa.semester, fa.section, fa.subject_name`,
      [faculty.id]
    );

    res.json({
      faculty: {
        id: faculty.id,
        name: faculty.name,
        facultyCode: faculty.faculty_code,
        email: faculty.email,
      },
      assignments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch assignments.' });
  }
};

export const getMySubjects = async (req, res) => getMyAssignments(req, res);

export const getMarksSheet = async (req, res) => {
  try {
    const { subjectId, examType } = req.params;
    const faculty = await getFacultyProfile(req.user.id);
    if (!faculty) return res.status(404).json({ message: 'Faculty not found.' });

    const [owned] = await pool.query(
      'SELECT id FROM faculty_assignments WHERE faculty_db_id = ? AND subject_id = ?',
      [faculty.id, subjectId]
    );
    if (!owned.length) {
      return res.status(403).json({ message: 'This subject is not assigned to you.' });
    }

    const [subject] = await pool.query(
      `SELECT sub.*, sec.name as section_name, ay.year_label as academic_year
       FROM subjects sub
       JOIN sections sec ON sub.section_id = sec.id
       JOIN academic_years ay ON sec.academic_year_id = ay.id
       WHERE sub.id = ?`,
      [subjectId]
    );
    if (!subject.length) return res.status(404).json({ message: 'Subject not found.' });

    const submission = await getOrCreateSubmission(faculty.id, subjectId, examType);
    const isLocked = submission.status === 'submitted' || submission.status === 'approved';

    const students = await fetchStudentsForSubject(subjectId, faculty.id);

    const [existingMarks] = await pool.query('SELECT * FROM marks WHERE submission_id = ?', [submission.id]);
    const marksMap = {};
    existingMarks.forEach((m) => { marksMap[m.student_id] = m; });

    const isLab = ['lab1', 'lab2'].includes(examType);
    const isFinalMid = examType === 'final_mid';
    const isFinalLab = examType === 'final_lab';

    let sheet = students.map((st, idx) => {
      const existing = marksMap[st.id] || {};
      const base = {
        serialNumber: idx + 1,
        studentId: st.id,
        rollNumber: st.roll_number,
        studentName: st.name,
      };
      if (isLab) return { ...base, labMarks: existing.lab_marks ?? '', totalMarks: existing.total_marks ?? '' };
      if (isFinalMid) {
        return { ...base, mid1Total: 0, mid2Total: 0, percent80: 0, percent20: 0, totalMarks: existing.total_marks ?? '' };
      }
      return {
        ...base,
        midMarks: existing.written_marks ?? '',
        assignmentMarks: existing.assignment_marks ?? '',
        totalMarks: existing.total_marks ?? calculateTotal(existing.written_marks, existing.assignment_marks) ?? '',
      };
    });

    if (isFinalMid) {
      sheet = await Promise.all(
        sheet.map(async (row) => {
          const [[mid1]] = await pool.query(
            `SELECT m.total_marks FROM marks m JOIN submissions sub ON m.submission_id = sub.id
             WHERE m.student_id = ? AND m.subject_id = ? AND sub.exam_type = 'mid1'
             ORDER BY sub.id DESC LIMIT 1`,
            [row.studentId, subjectId]
          );
          const [[mid2]] = await pool.query(
            `SELECT m.total_marks FROM marks m JOIN submissions sub ON m.submission_id = sub.id
             WHERE m.student_id = ? AND m.subject_id = ? AND sub.exam_type = 'mid2'
             ORDER BY sub.id DESC LIMIT 1`,
            [row.studentId, subjectId]
          );
          const calc = calculateFinalMidBreakdown(mid1?.total_marks, mid2?.total_marks);
          return { ...row, mid1Total: mid1?.total_marks ?? 0, mid2Total: mid2?.total_marks ?? 0, ...calc, totalMarks: calc.finalTotal };
        })
      );
    }

    if (isFinalLab) {
      sheet = await Promise.all(
        sheet.map(async (row) => {
          const [[lab1]] = await pool.query(
            `SELECT m.lab_marks FROM marks m JOIN submissions sub ON m.submission_id = sub.id
             WHERE m.student_id = ? AND m.subject_id = ? AND sub.exam_type = 'lab1'
             ORDER BY sub.id DESC LIMIT 1`,
            [row.studentId, subjectId]
          );
          const [[lab2]] = await pool.query(
            `SELECT m.lab_marks FROM marks m JOIN submissions sub ON m.submission_id = sub.id
             WHERE m.student_id = ? AND m.subject_id = ? AND sub.exam_type = 'lab2'
             ORDER BY sub.id DESC LIMIT 1`,
            [row.studentId, subjectId]
          );
          const best = calculateFinalLab(lab1?.lab_marks, lab2?.lab_marks);
          return { ...row, internal1: lab1?.lab_marks ?? 0, internal2: lab2?.lab_marks ?? 0, bestOf: best, totalMarks: best };
        })
      );
    }

    res.json({
      submission,
      subject: subject[0],
      examType,
      examTypeLabel: EXAM_TYPES[examType],
      sheet,
      studentCount: students.length,
      isLab: isLab || isFinalLab,
      isMid: ['mid1', 'mid2'].includes(examType),
      isFinalMid,
      isFinalLab,
      isCalculated: isFinalMid || isFinalLab,
      isLocked,
      emptyReason: students.length === 0
        ? 'No students found. Upload student_master_data.xlsx with matching branch, semester, section, and year.'
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load marks sheet.' });
  }
};

export const getOrCreateSubmission = async (facultyId, subjectId, examType) => {
  const [existing] = await pool.query(
    `SELECT * FROM submissions WHERE faculty_id = ? AND subject_id = ? AND exam_type = ?
     ORDER BY id DESC LIMIT 1`,
    [facultyId, subjectId, examType]
  );
  if (existing.length) return existing[0];
  const [result] = await pool.query(
    'INSERT INTO submissions (faculty_id, subject_id, exam_type, status) VALUES (?, ?, ?, ?)',
    [facultyId, subjectId, examType, 'draft']
  );
  const [sub] = await pool.query('SELECT * FROM submissions WHERE id = ?', [result.insertId]);
  return sub[0];
};

export const saveMarks = async (req, res) => {
  try {
    const { subjectId, examType, marks, status } = req.body;
    const faculty = await getFacultyProfile(req.user.id);
    if (!faculty) return res.status(404).json({ message: 'Faculty not found.' });

    const submission = await getOrCreateSubmission(faculty.id, subjectId, examType);
    if (submission.status === 'submitted' || submission.status === 'approved') {
      return res.status(403).json({ message: 'Marks sheet is locked after submission.' });
    }

    const isLab = ['lab1', 'lab2'].includes(examType);
    const isFinalMid = examType === 'final_mid';
    const isFinalLab = examType === 'final_lab';

    if (!isFinalMid && !isFinalLab) {
      for (const row of marks) {
        if (isLab) {
          const errs = validateLabMarks(row.labMarks);
          if (errs.length) return res.status(400).json({ message: errs[0] });
        } else {
          const errs = validateMidMarks(row.midMarks ?? row.writtenMarks, row.assignmentMarks);
          if (errs.length) return res.status(400).json({ message: errs[0] });
        }
      }
    }

    // Final Mid submission must only be allowed after Mid1 and Mid2 exist for all students
    if (isFinalMid && status === 'submitted') {
      for (const row of marks) {
        const [[mid1Exists]] = await pool.query(
          `SELECT 1 FROM marks m JOIN submissions s ON m.submission_id = s.id
           WHERE m.student_id = ? AND m.subject_id = ? AND s.exam_type = 'mid1' AND m.total_marks IS NOT NULL LIMIT 1`,
          [row.studentId, subjectId]
        );
        const [[mid2Exists]] = await pool.query(
          `SELECT 1 FROM marks m JOIN submissions s ON m.submission_id = s.id
           WHERE m.student_id = ? AND m.subject_id = ? AND s.exam_type = 'mid2' AND m.total_marks IS NOT NULL LIMIT 1`,
          [row.studentId, subjectId]
        );
        if (!mid1Exists || !mid2Exists) {
          return res.status(400).json({ message: 'Final Mid cannot be submitted until Mid 1 and Mid 2 are completed for all students.' });
        }
      }
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const row of marks) {
        let written = null, assignment = null, lab = null, total = null;
        if (isLab) {
          const labRaw = String(row.labMarks || '').trim().toUpperCase();
          const labValue = labRaw !== '' && labRaw !== 'AB' && labRaw !== 'A' && !Number.isNaN(parseFloat(labRaw))
            ? parseFloat(labRaw)
            : (labRaw === 'AB' || labRaw === 'A') ? 0 : null;
          lab = labValue;
          total = labValue;
        } else if (isFinalMid || isFinalLab) {
          total = parseFloat(row.totalMarks) || 0;
          written = isFinalMid ? total : null;
          lab = isFinalLab ? total : null;
        } else {
          const mid = String((row.midMarks ?? row.writtenMarks) || '').trim().toUpperCase();
          written = mid !== '' && mid !== 'AB' && mid !== 'A' && !Number.isNaN(parseFloat(mid)) ? parseFloat(mid) : null;
          const assignmentRaw = String(row.assignmentMarks || '').trim().toUpperCase();
          assignment = assignmentRaw !== '' && assignmentRaw !== 'AB' && assignmentRaw !== 'A' && !Number.isNaN(parseFloat(assignmentRaw))
            ? parseFloat(assignmentRaw)
            : null;
          total = calculateTotal(written, assignment);
        }
        const [existing] = await conn.query(
          'SELECT id FROM marks WHERE submission_id = ? AND student_id = ?',
          [submission.id, row.studentId]
        );
        if (existing.length) {
          await conn.query(
            `UPDATE marks SET written_marks=?, assignment_marks=?, lab_marks=?, total_marks=?, exam_type=? WHERE id=?`,
            [written, assignment, lab, total, examType, existing[0].id]
          );
        } else {
          await conn.query(
            `INSERT INTO marks (student_id, subject_id, submission_id, exam_type, written_marks, assignment_marks, lab_marks, total_marks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [row.studentId, subjectId, submission.id, examType, written, assignment, lab, total]
          );
        }
      }
      const newStatus = status === 'submitted' ? 'submitted' : 'draft';
      await conn.query(
        'UPDATE submissions SET status = ?, submitted_at = COALESCE(?, submitted_at) WHERE id = ?',
        [newStatus, status === 'submitted' ? new Date() : null, submission.id]
      );
      await conn.commit();
      const messages = { submitted: 'Submitted and locked.', update: 'Marks updated.', draft: 'Marks saved.' };
      res.json({ message: messages[status] || messages.draft, submissionId: submission.id, locked: status === 'submitted' });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save marks.' });
  }
};

export const getSubmissionHistory = async (req, res) => {
  try {
    const faculty = await getFacultyProfile(req.user.id);
    if (!faculty) return res.status(404).json({ message: 'Faculty not found.' });
    const [submissions] = await pool.query(
      `SELECT subm.*, s.name as subject_name, s.branch, s.semester, sec.name as section_name, ay.year_label as academic_year
       FROM submissions subm
       JOIN subjects s ON subm.subject_id = s.id
       JOIN sections sec ON s.section_id = sec.id
       JOIN academic_years ay ON sec.academic_year_id = ay.id
       WHERE subm.faculty_id = ?
       ORDER BY subm.updated_at DESC`,
      [faculty.id]
    );
    res.json({ submissions: submissions.map((s) => ({ ...s, exam_type_label: EXAM_TYPES[s.exam_type] })) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch history.' });
  }
};

export const exportMarksExcel = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const faculty = await getFacultyProfile(req.user.id);
    const [submission] = await pool.query(
      `SELECT subm.*, f.name as faculty_name, f.faculty_code, s.name as subject_name,
              s.branch, s.semester, sec.name as section_name, ay.year_label as academic_year
       FROM submissions subm
       JOIN faculty f ON subm.faculty_id = f.id
       JOIN subjects s ON subm.subject_id = s.id
       JOIN sections sec ON s.section_id = sec.id
       JOIN academic_years ay ON sec.academic_year_id = ay.id
       WHERE subm.id = ? AND subm.faculty_id = ?`,
      [submissionId, faculty?.id]
    );
    if (!submission.length) return res.status(404).json({ message: 'Not found.' });
    const sub = submission[0];
    const [marks] = await pool.query(
      `SELECT st.roll_number, st.name as student_name, m.* FROM marks m
       JOIN students st ON m.student_id = st.id WHERE m.submission_id = ? ORDER BY st.roll_number`,
      [submissionId]
    );
    const columns = ['S.No', 'Roll Number', 'Name', 'Mid Marks (20)', 'Assignment (10)', 'Total (30)'];
    const rows = marks.map((m, i) => ({
      'S.No': i + 1, 'Roll Number': m.roll_number, Name: m.student_name,
      'Mid Marks (20)': m.written_marks, 'Assignment (10)': m.assignment_marks, 'Total (30)': m.total_marks,
    }));
    const buffer = exportMarksToExcel({ columns, rows }, {
      subjectName: sub.subject_name, facultyName: sub.faculty_name, facultyCode: sub.faculty_code,
      academicYear: sub.academic_year, branch: sub.branch, semester: sub.semester, section: sub.section_name,
      examType: EXAM_TYPES[sub.exam_type],
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=marks_${submissionId}.xlsx`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: 'Failed to export.' });
  }
};
