import pool from '../config/db.js';
import { exportMarksToExcel } from '../utils/excelParser.js';
import { EXAM_TYPES, validateMidMarks, validateLabMarks, calculateTotal, calculateFinalMidBreakdown } from '../utils/marksCalculator.js';

export const getStudents = async (req, res) => {
  try {
    const { search, branch, semester, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (s.roll_number LIKE ? OR s.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (branch) {
      where += ' AND s.branch = ?';
      params.push(branch);
    }
    if (semester) {
      where += ' AND s.semester = ?';
      params.push(semester);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM students s ${where}`,
      params
    );

    const [students] = await pool.query(
      `SELECT s.*, s.study_year as year, sec.name as section_name, ay.year_label as academic_year
       FROM students s
       JOIN sections sec ON s.section_id = sec.id
       JOIN academic_years ay ON s.academic_year_id = ay.id
       ${where}
       ORDER BY s.roll_number
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      students,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch students.' });
  }
};

export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, branch, semester, roll_number } = req.body;
    await pool.query(
      'UPDATE students SET name = ?, branch = ?, semester = ?, roll_number = ? WHERE id = ?',
      [name, branch, semester, roll_number, id]
    );
    res.json({ message: 'Student updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update student.' });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    await pool.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ message: 'Student deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete student.' });
  }
};

export const getSubjects = async (req, res) => {
  try {
    const [subjects] = await pool.query(
      `SELECT sub.*, sec.name as section_name, f.name as faculty_name
       FROM subjects sub
       JOIN sections sec ON sub.section_id = sec.id
       LEFT JOIN faculty f ON sub.faculty_id = f.id
       ORDER BY sub.branch, sub.semester, sub.name`
    );
    res.json({ subjects });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch subjects.' });
  }
};

export const createSubject = async (req, res) => {
  try {
    const { name, code, branch, semester, section_id, faculty_id } = req.body;
    const [result] = await pool.query(
      'INSERT INTO subjects (name, code, branch, semester, section_id, faculty_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, code, branch, semester, section_id, faculty_id || null]
    );
    if (faculty_id) {
      await pool.query(
        'INSERT IGNORE INTO faculty_subject_mapping (faculty_id, subject_id) VALUES (?, ?)',
        [faculty_id, result.insertId]
      );
    }
    res.status(201).json({ message: 'Subject created.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create subject.' });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, branch, semester, section_id, faculty_id } = req.body;
    await pool.query(
      'UPDATE subjects SET name=?, code=?, branch=?, semester=?, section_id=?, faculty_id=? WHERE id=?',
      [name, code, branch, semester, section_id, faculty_id, id]
    );
    if (faculty_id) {
      await pool.query(
        'INSERT IGNORE INTO faculty_subject_mapping (faculty_id, subject_id) VALUES (?, ?)',
        [faculty_id, id]
      );
    }
    res.json({ message: 'Subject updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update subject.' });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    await pool.query('DELETE FROM subjects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Subject deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete subject.' });
  }
};

export const getFacultyList = async (req, res) => {
  try {
    const [faculty] = await pool.query('SELECT id, faculty_code, name, email FROM faculty ORDER BY name');
    res.json({ faculty });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch faculty.' });
  }
};

export const getSections = async (req, res) => {
  try {
    const [sections] = await pool.query(
      `SELECT sec.*, ay.year_label FROM sections sec
       JOIN academic_years ay ON sec.academic_year_id = ay.id
       ORDER BY sec.branch, sec.semester`
    );
    res.json({ sections });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sections.' });
  }
};

export const getReportDashboard = async (req, res) => {
  try {
    const [[submitted]] = await pool.query(
      "SELECT COUNT(*) as count FROM submissions WHERE status IN ('submitted','approved')"
    );
    const [[pending]] = await pool.query(
      "SELECT COUNT(*) as count FROM submissions WHERE status = 'draft'"
    );
    const [[totalAssignments]] = await pool.query('SELECT COUNT(*) as count FROM faculty_assignments');

    const [byFaculty] = await pool.query(
      `SELECT f.faculty_code, f.name as faculty_name,
              SUM(CASE WHEN subm.status IN ('submitted','approved') THEN 1 ELSE 0 END) as submitted,
              SUM(CASE WHEN subm.status = 'draft' THEN 1 ELSE 0 END) as pending
       FROM faculty f
       LEFT JOIN submissions subm ON subm.faculty_id = f.id
       GROUP BY f.id, f.faculty_code, f.name
       ORDER BY f.name`
    );

    const [bySubject] = await pool.query(
      `SELECT s.name as subject_name, s.branch, s.semester, sec.name as section_name,
              COUNT(CASE WHEN subm.status IN ('submitted','approved') THEN 1 END) as submitted,
              COUNT(CASE WHEN subm.status = 'draft' OR subm.id IS NULL THEN 1 END) as pending
       FROM subjects s
       JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN submissions subm ON subm.subject_id = s.id
       GROUP BY s.id, s.name, s.branch, s.semester, sec.name
       ORDER BY s.branch, s.name`
    );

    const [bySection] = await pool.query(
      `SELECT ay.year_label as academic_year, sec.branch, sec.semester as sem, sec.name as section,
              COUNT(DISTINCT st.id) as students,
              COUNT(DISTINCT CASE WHEN subm.status IN ('submitted','approved') THEN subm.id END) as submitted_reports
       FROM sections sec
       JOIN academic_years ay ON sec.academic_year_id = ay.id
       LEFT JOIN students st ON st.section_id = sec.id
       LEFT JOIN subjects sub ON sub.section_id = sec.id
       LEFT JOIN submissions subm ON subm.subject_id = sub.id
       GROUP BY sec.id, ay.year_label, sec.branch, sec.semester, sec.name
       ORDER BY ay.year_label DESC, sec.branch`
    );

    res.json({
      summary: {
        submitted: submitted.count,
        pending: pending.count,
        totalAssignments: totalAssignments.count,
      },
      byFaculty,
      bySubject,
      bySection,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch report dashboard.' });
  }
};

export const getReports = async (req, res) => {
  try {
    const { status, faculty, subject, section, branch } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (status === 'submitted') where += " AND subm.status IN ('submitted','approved')";
    else if (status === 'pending') where += " AND subm.status = 'draft'";
    else if (status !== 'all') where += " AND subm.status IN ('submitted','approved','draft')";

    if (faculty) {
      where += ' AND f.name LIKE ?';
      params.push(`%${faculty}%`);
    }
    if (subject) {
      where += ' AND s.name LIKE ?';
      params.push(`%${subject}%`);
    }
    if (section) {
      where += ' AND sec.name = ?';
      params.push(section);
    }
    if (branch) {
      where += ' AND s.branch = ?';
      params.push(branch);
    }

    const [reports] = await pool.query(
      `SELECT subm.id, subm.exam_type, subm.status, subm.submitted_at, subm.updated_at,
              f.name as faculty_name, f.faculty_code, s.name as subject_name, s.code as subject_code,
              s.branch, s.semester, sec.name as section_name, ay.year_label as academic_year
       FROM submissions subm
       JOIN faculty f ON subm.faculty_id = f.id
       JOIN subjects s ON subm.subject_id = s.id
       JOIN sections sec ON s.section_id = sec.id
       JOIN academic_years ay ON sec.academic_year_id = ay.id
       ${where}
       ORDER BY subm.updated_at DESC`,
      params
    );

    res.json({
      reports: reports.map((r) => ({
        ...r,
        exam_type_label: EXAM_TYPES[r.exam_type] || r.exam_type,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch reports.' });
  }
};

const normalizeAdminDisplayTotal = (value, examType) => {
  const numeric = parseFloat(value);
  if (examType === 'final_mid' && !Number.isNaN(numeric) && !Number.isInteger(numeric)) {
    return Math.ceil(numeric);
  }
  return value;
};

export const getReportDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const [submission] = await pool.query(
      `SELECT subm.*, f.name as faculty_name, s.name as subject_name, s.code as subject_code,
              s.branch, s.semester, sec.name as section_name
       FROM submissions subm
       JOIN faculty f ON subm.faculty_id = f.id
       JOIN subjects s ON subm.subject_id = s.id
       JOIN sections sec ON s.section_id = sec.id
       WHERE subm.id = ?`,
      [id]
    );
    if (!submission.length) return res.status(404).json({ message: 'Report not found.' });

    const [marks] = await pool.query(
      `SELECT st.roll_number, st.name as student_name, m.id, m.student_id, m.submission_id,
        m.written_marks, m.assignment_marks, m.lab_marks, m.total_marks
       FROM marks m
       JOIN students st ON m.student_id = st.id
       WHERE m.submission_id = ?
       ORDER BY st.roll_number`,
      [id]
    );

    const processedMarks = await Promise.all(
      marks.map(async (m) => {
        const normalized = normalizeAdminDisplayTotal(m.total_marks, submission[0].exam_type);
        if (submission[0].exam_type === 'final_mid') {
          const [[mid1]] = await pool.query(
            `SELECT m1.total_marks FROM marks m1 JOIN submissions s1 ON m1.submission_id = s1.id
             WHERE m1.student_id = ? AND s1.subject_id = ? AND s1.exam_type = 'mid1'
             ORDER BY s1.id DESC LIMIT 1`,
            [m.student_id, submission[0].subject_id]
          );
          const [[mid2]] = await pool.query(
            `SELECT m2.total_marks FROM marks m2 JOIN submissions s2 ON m2.submission_id = s2.id
             WHERE m2.student_id = ? AND s2.subject_id = ? AND s2.exam_type = 'mid2'
             ORDER BY s2.id DESC LIMIT 1`,
            [m.student_id, submission[0].subject_id]
          );
          const breakdown = calculateFinalMidBreakdown(mid1?.total_marks, mid2?.total_marks);
          return {
            ...m,
            total_marks: normalized,
            mid1_total: mid1?.total_marks ?? null,
            mid2_total: mid2?.total_marks ?? null,
            percent80: breakdown.percent80,
            percent20: breakdown.percent20,
          };
        }
        return {
          ...m,
          total_marks: normalized,
        };
      })
    );

    res.json({ submission: submission[0], marks: processedMarks });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch report.' });
  }
};

export const approveReport = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE submissions SET status = 'approved', approved_at = NOW(), approved_by = ? WHERE id = ?`,
      [req.user.id, id]
    );
    const [sub] = await pool.query('SELECT * FROM submissions WHERE id = ?', [id]);
    if (sub.length) {
      await pool.query(
        'INSERT IGNORE INTO reports (submission_id) VALUES (?)',
        [id]
      );
    }
    res.json({ message: 'Report approved successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve report.' });
  }
};

const normalizeAdminMark = (value) => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (raw === '' || raw === 'AB' || raw === 'A') return null;
  const parsed = parseFloat(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

const updateFinalMidSubmission = async (conn, studentId, subjectId) => {
  const [[mid1]] = await conn.query(
    `SELECT m.total_marks, sub.id as submission_id FROM marks m JOIN submissions sub ON m.submission_id = sub.id
     WHERE m.student_id = ? AND m.subject_id = ? AND sub.exam_type = 'mid1'
     ORDER BY sub.id DESC LIMIT 1`,
    [studentId, subjectId]
  );
  const [[mid2]] = await conn.query(
    `SELECT m.total_marks, sub.id as submission_id FROM marks m JOIN submissions sub ON m.submission_id = sub.id
     WHERE m.student_id = ? AND m.subject_id = ? AND sub.exam_type = 'mid2'
     ORDER BY sub.id DESC LIMIT 1`,
    [studentId, subjectId]
  );

  const calc = calculateFinalMidBreakdown(mid1?.total_marks, mid2?.total_marks);
  await conn.query(
    `UPDATE marks m
     JOIN submissions sub ON m.submission_id = sub.id
     SET m.total_marks = ?
     WHERE m.student_id = ? AND m.subject_id = ? AND m.exam_type = 'final_mid'`,
    [calc.finalTotal, studentId, subjectId]
  );
  await conn.query(
    `UPDATE submissions sub
     JOIN marks m ON m.submission_id = sub.id
     SET sub.updated_at = NOW()
     WHERE m.student_id = ? AND m.subject_id = ? AND m.exam_type = 'final_mid'`,
    [studentId, subjectId]
  );
};

export const updateReportMarks = async (req, res) => {
  try {
    const { id } = req.params;
    const { marks } = req.body;
    if (!Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({ message: 'No marks provided.' });
    }

    const [submissionRows] = await pool.query('SELECT * FROM submissions WHERE id = ?', [id]);
    if (!submissionRows.length) return res.status(404).json({ message: 'Report not found.' });

    const submission = submissionRows[0];
    if (submission.status === 'approved') {
      return res.status(403).json({ message: 'Approved reports cannot be updated.' });
    }

    const examType = submission.exam_type;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const row of marks) {
        const studentId = row.student_id;
        if (!studentId) continue;

        let written = null;
        let assignment = null;
        let lab = null;
        let total = null;

        if (examType === 'mid1' || examType === 'mid2') {
          written = normalizeAdminMark(row.written_marks);
          assignment = normalizeAdminMark(row.assignment_marks);
          const errors = validateMidMarks(written, assignment);
          if (errors.length) {
            throw new Error(errors[0]);
          }
          total = calculateTotal(written, assignment);
        } else if (examType === 'lab1' || examType === 'lab2') {
          lab = normalizeAdminMark(row.lab_marks);
          const errors = validateLabMarks(lab);
          if (errors.length) {
            throw new Error(errors[0]);
          }
          total = lab;
        } else if (examType === 'final_mid') {
          total = normalizeAdminMark(row.total_marks);
          if (total !== null && (total < 0 || total > 30)) {
            throw new Error('Final Mid total must be between 0 and 30');
          }
        } else if (examType === 'final_lab') {
          total = normalizeAdminMark(row.total_marks);
          if (total !== null && (total < 0 || total > 50)) {
            throw new Error('Final Internal total must be between 0 and 50');
          }
        }

        const [existingMarks] = await conn.query(
          'SELECT id FROM marks WHERE submission_id = ? AND student_id = ?',
          [id, studentId]
        );
        if (!existingMarks.length) continue;

        await conn.query(
          `UPDATE marks SET written_marks=?, assignment_marks=?, lab_marks=?, total_marks=? WHERE id=?`,
          [written, assignment, lab, total, existingMarks[0].id]
        );
        if (examType === 'mid1' || examType === 'mid2') {
          const [subjectRows] = await conn.query('SELECT subject_id FROM submissions WHERE id = ?', [id]);
          const subjectId = subjectRows[0]?.subject_id;
          if (subjectId) {
            await updateFinalMidSubmission(conn, studentId, subjectId);
          }
        }
      }

      await conn.query('UPDATE submissions SET updated_at = NOW() WHERE id = ?', [id]);
      await conn.commit();
      res.json({ message: 'Report marks updated successfully.' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Failed to update report.' });
  }
};

export const downloadReportExcel = async (req, res) => {
  try {
    const { id } = req.params;
    const [submission] = await pool.query(
      `SELECT subm.exam_type, f.name as faculty_name, s.name as subject_name, s.code as subject_code,
              s.branch, s.semester, sec.name as section_name
       FROM submissions subm
       JOIN faculty f ON subm.faculty_id = f.id
       JOIN subjects s ON subm.subject_id = s.id
       JOIN sections sec ON s.section_id = sec.id
       WHERE subm.id = ?`,
      [id]
    );
    if (!submission.length) return res.status(404).json({ message: 'Not found.' });

    const sub = submission[0];
    const isLab = ['lab1', 'lab2', 'final_lab'].includes(sub.exam_type);

    const [marks] = await pool.query(
      `SELECT st.roll_number, st.name as student_name, m.*
       FROM marks m JOIN students st ON m.student_id = st.id
       WHERE m.submission_id = ? ORDER BY st.roll_number`,
      [id]
    );

    const columns = isLab
      ? ['S.No', 'Roll Number', 'Student Name', 'Lab Marks', 'Total']
      : ['S.No', 'Roll Number', 'Student Name', 'Written (20)', 'Assignment (10)', 'Total (30)'];

    const normalizeTotalForExport = (value) => {
      const numeric = parseFloat(value);
      if (sub.exam_type === 'final_mid' && !Number.isNaN(numeric) && !Number.isInteger(numeric)) {
        return Math.ceil(numeric);
      }
      return value;
    };

    const rows = marks.map((m, i) => {
      if (isLab) {
        return {
          'S.No': i + 1,
          'Roll Number': m.roll_number,
          'Student Name': m.student_name,
          'Lab Marks': m.lab_marks,
          Total: normalizeTotalForExport(m.total_marks),
        };
      }
      return {
        'S.No': i + 1,
        'Roll Number': m.roll_number,
        'Student Name': m.student_name,
        'Written (20)': m.written_marks,
        'Assignment (10)': m.assignment_marks,
        'Total (30)': normalizeTotalForExport(m.total_marks),
      };
    });

    const buffer = exportMarksToExcel(
      { columns, rows },
      {
        subjectName: sub.subject_name,
        subjectCode: sub.subject_code,
        facultyName: sub.faculty_name,
        branch: sub.branch,
        semester: sub.semester,
        section: sub.section_name,
        examType: EXAM_TYPES[sub.exam_type],
      }
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report_${id}.xlsx`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: 'Failed to export report.' });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const [[students]] = await pool.query('SELECT COUNT(*) as count FROM students');
    const [[faculty]] = await pool.query('SELECT COUNT(*) as count FROM faculty');
    const [[subjects]] = await pool.query('SELECT COUNT(*) as count FROM subjects');
    const [[reports]] = await pool.query("SELECT COUNT(*) as count FROM submissions WHERE status IN ('submitted','approved')");
    const [[sections]] = await pool.query('SELECT COUNT(*) as count FROM sections');

    const [branchData] = await pool.query(
      'SELECT branch, COUNT(*) as count FROM students GROUP BY branch'
    );
    const [semesterData] = await pool.query(
      'SELECT semester, COUNT(*) as count FROM students GROUP BY semester'
    );
    const [reportTrend] = await pool.query(
      `SELECT DATE(submitted_at) as date, COUNT(*) as count
       FROM submissions WHERE submitted_at IS NOT NULL
       GROUP BY DATE(submitted_at) ORDER BY date DESC LIMIT 7`
    );

    res.json({
      stats: {
        students: students.count,
        faculty: faculty.count,
        subjects: subjects.count,
        reports: reports.count,
        sections: sections.count,
      },
      charts: {
        branchData,
        semesterData,
        reportTrend: reportTrend.reverse(),
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch analytics.' });
  }
};

export const getFilterOptions = async (req, res) => {
  try {
    const [branches] = await pool.query('SELECT DISTINCT branch FROM students ORDER BY branch');
    const [semesters] = await pool.query('SELECT DISTINCT semester FROM students ORDER BY semester');
    res.json({
      branches: branches.map((b) => b.branch),
      semesters: semesters.map((s) => s.semester),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch filters.' });
  }
};
