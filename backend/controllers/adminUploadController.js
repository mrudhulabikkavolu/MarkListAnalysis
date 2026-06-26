import pool from '../config/db.js';
import {
  parseStudentExcel,
  parseFacultyExcel,
  hashFileBuffer,
  normalizeSection,
  subjectCodeFromName,
} from '../utils/excelParser.js';
import { normalizeFacultyId } from '../utils/validators.js';
import { purgeAllUploadData, deleteSubjectsCascade } from '../utils/dataCleanup.js';

const getOrCreateAcademicYear = async (conn, yearLabel) => {
  const label = yearLabel || '2025-2026';
  const [existing] = await conn.query('SELECT id FROM academic_years WHERE year_label = ?', [label]);
  if (existing.length) return existing[0].id;
  const [result] = await conn.query('INSERT INTO academic_years (year_label) VALUES (?)', [label]);
  return result.insertId;
};

const getOrCreateSection = async (conn, { name, branch, semester, academicYearId }) => {
  const [existing] = await conn.query(
    'SELECT id FROM sections WHERE name = ? AND branch = ? AND semester = ? AND academic_year_id = ?',
    [name, branch, semester, academicYearId]
  );
  if (existing.length) return existing[0].id;
  const [result] = await conn.query(
    'INSERT INTO sections (name, branch, semester, academic_year_id) VALUES (?, ?, ?, ?)',
    [name, branch, semester, academicYearId]
  );
  return result.insertId;
};

const getOrCreateFacultyByCode = async (conn, facultyCode, facultyName) => {
  const [existing] = await conn.query('SELECT id FROM faculty WHERE faculty_code = ?', [facultyCode]);
  if (existing.length) {
    await conn.query('UPDATE faculty SET name = ? WHERE id = ?', [facultyName, existing[0].id]);
    return existing[0].id;
  }
  const [result] = await conn.query(
    'INSERT INTO faculty (faculty_code, name) VALUES (?, ?)',
    [facultyCode, facultyName]
  );
  return result.insertId;
};

const checkDuplicateUpload = async (conn, type, hash) => {
  const [dup] = await conn.query(
    'SELECT id, file_name FROM excel_uploads WHERE upload_type = ? AND file_hash = ?',
    [type, hash]
  );
  return dup[0] || null;
};


const createUploadRecord = async (conn, type, fileName, fileHash, academicYear, rowCount, userId) => {
  const [uploadResult] = await conn.query(
    `INSERT INTO excel_uploads (upload_type, file_name, file_hash, academic_year, row_count, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
    [type, fileName, fileHash, academicYear, rowCount, userId]
  );
  return uploadResult.insertId;
};

const processStudentUpload = async (conn, file, userId, fileHash) => {
  const { rows, detectedColumns } = parseStudentExcel(file.buffer);
  if (!rows.length) throw new Error('No valid student rows found.');

  const yearLabel = rows[0].academicYear || '2025-2026';
  const uploadId = await createUploadRecord(conn, 'student', file.originalname, fileHash, yearLabel, rows.length, userId);

  let studentsCreated = 0;
  const seen = new Set();

  for (const row of rows) {
    const academicYearId = await getOrCreateAcademicYear(conn, row.academicYear || '2025-2026');
    const sectionId = await getOrCreateSection(conn, {
      name: row.section,
      branch: row.branch,
      semester: row.semester,
      academicYearId,
    });

    const key = `${row.rollNumber}-${academicYearId}-${row.studyYear}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const [existing] = await conn.query(
      'SELECT id FROM students WHERE roll_number = ? AND academic_year_id = ? AND study_year = ?',
      [row.rollNumber, academicYearId, row.studyYear]
    );

    if (!existing.length) {
      await conn.query(
        `INSERT INTO students (roll_number, name, academic_year_id, study_year, branch, semester, section_id, upload_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.rollNumber, row.studentName, academicYearId, row.studyYear, row.branch, row.semester, sectionId, uploadId]
      );
      studentsCreated++;
    } else {
      await conn.query(
        `UPDATE students SET name = ?, branch = ?, semester = ?, section_id = ?, upload_id = ? WHERE id = ?`,
        [row.studentName, row.branch, row.semester, sectionId, uploadId, existing[0].id]
      );
    }
  }

  return {
    message: 'Student Excel processed successfully.',
    detectedColumns,
    stats: { rowsProcessed: rows.length, studentsCreated, uploadId },
  };
};

const processFacultyUpload = async (conn, file, userId, fileHash) => {
  const { rows, detectedColumns } = parseFacultyExcel(file.buffer);
  if (!rows.length) throw new Error('No valid faculty rows found.');

  const yearLabel = rows[0].academicYear || '2025-2026';
  const uploadId = await createUploadRecord(conn, 'faculty', file.originalname, fileHash, yearLabel, rows.length, userId);

  let assignmentsCreated = 0;
  let subjectsCreated = 0;

  for (const row of rows) {
    const facultyCode = normalizeFacultyId(row.facultyCode);
    const code = row.subjectCode || subjectCodeFromName(row.subject);
    const academicYearId = await getOrCreateAcademicYear(conn, row.academicYear || '2025-2026');
    const sectionId = await getOrCreateSection(conn, {
      name: row.section,
      branch: row.branch,
      semester: row.semester,
      academicYearId,
    });

    const facultyDbId = await getOrCreateFacultyByCode(conn, facultyCode, row.facultyName);

    const [existingSubject] = await conn.query(
      'SELECT id FROM subjects WHERE code = ? AND section_id = ?',
      [code, sectionId]
    );

    let subjectId;
    if (existingSubject.length) {
      subjectId = existingSubject[0].id;
      await conn.query(
        'UPDATE subjects SET name = ?, faculty_id = ?, study_year = ?, branch = ?, semester = ? WHERE id = ?',
        [row.subject, facultyDbId, row.studyYear, row.branch, row.semester, subjectId]
      );
    } else {
      const [subRes] = await conn.query(
        `INSERT INTO subjects (name, code, branch, semester, study_year, section_id, faculty_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [row.subject, code, row.branch, row.semester, row.studyYear, sectionId, facultyDbId]
      );
      subjectId = subRes.insertId;
      subjectsCreated++;
    }

    const [assignExists] = await conn.query(
      `SELECT id FROM faculty_assignments
       WHERE academic_year_id = ? AND study_year = ? AND branch = ? AND semester = ? AND section = ?
       AND faculty_code = ? AND subject_name = ?`,
      [academicYearId, row.studyYear, row.branch, row.semester, row.section, facultyCode, row.subject]
    );

    if (!assignExists.length) {
      await conn.query(
        `INSERT INTO faculty_assignments
         (upload_id, academic_year_id, study_year, branch, semester, section, faculty_db_id, faculty_code, faculty_name, subject_name, subject_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uploadId, academicYearId, row.studyYear, row.branch, row.semester, row.section, facultyDbId, facultyCode, row.facultyName, row.subject, subjectId]
      );
      assignmentsCreated++;
    }

    await conn.query(
      'INSERT IGNORE INTO faculty_subject_mapping (faculty_id, subject_id) VALUES (?, ?)',
      [facultyDbId, subjectId]
    );
  }

  return {
    message: 'Faculty Excel processed successfully.',
    detectedColumns,
    stats: { rowsProcessed: rows.length, assignmentsCreated, subjectsCreated, uploadId },
  };
};

export const uploadStudentExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

  const conn = await pool.getConnection();
  try {
    const fileHash = hashFileBuffer(req.file.buffer);
    const dup = await checkDuplicateUpload(conn, 'student', fileHash);
    if (dup) {
      return res.status(409).json({ message: `This file was already uploaded as "${dup.file_name}". Delete it first to re-upload.` });
    }

    await conn.beginTransaction();
    const response = await processStudentUpload(conn, req.file, req.user.id, fileHash);
    await conn.commit();
    res.json(response);
  } catch (err) {
    await conn.rollback();
    console.error('Student upload error:', err);
    res.status(400).json({ message: err.message || 'Failed to process student Excel.' });
  } finally {
    conn.release();
  }
};

export const uploadFacultyExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

  const conn = await pool.getConnection();
  try {
    const fileHash = hashFileBuffer(req.file.buffer);
    const dup = await checkDuplicateUpload(conn, 'faculty', fileHash);
    if (dup) {
      return res.status(409).json({ message: `This file was already uploaded as "${dup.file_name}". Delete it first to re-upload.` });
    }

    await conn.beginTransaction();
    const response = await processFacultyUpload(conn, req.file, req.user.id, fileHash);
    await conn.commit();
    res.json(response);
  } catch (err) {
    await conn.rollback();
    console.error('Faculty upload error:', err);
    res.status(400).json({ message: err.message || 'Failed to process faculty Excel.' });
  } finally {
    conn.release();
  }
};

export const getUploads = async (req, res) => {
  try {
    const [uploads] = await pool.query(
      `SELECT eu.*, u.username as uploaded_by_name
       FROM excel_uploads eu
       LEFT JOIN users u ON eu.uploaded_by = u.id
       ORDER BY eu.created_at DESC`
    );

    for (const row of uploads) {
      if (row.upload_type === 'student') {
        const [[c]] = await pool.query('SELECT COUNT(*) as cnt FROM students WHERE upload_id = ?', [row.id]);
        row.student_count = c?.cnt ?? 0;
      } else {
        const [[c]] = await pool.query('SELECT COUNT(*) as cnt FROM faculty_assignments WHERE upload_id = ?', [row.id]);
        row.assignment_count = c?.cnt ?? 0;
        // Fallback: if no faculty_assignments were recorded, try to infer subjects created
        // around the upload time (helps when assignments are created elsewhere or in a different process)
        if (!row.assignment_count) {
          try {
            const uploadedAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
            const before = new Date(uploadedAt.getTime() - 5 * 60 * 1000); // 5 minutes before
            const after = new Date(uploadedAt.getTime() + 5 * 60 * 1000); // 5 minutes after
            const [s] = await pool.query(
              'SELECT COUNT(*) as cnt FROM subjects WHERE created_at BETWEEN ? AND ?',
              [before, after]
            );
            row.subject_count = s?.[0]?.cnt ?? 0;
          } catch (e) {
            row.subject_count = 0;
          }
        }
      }
    }
    res.json({ uploads });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({
        message: 'Run database/migrations_v2.sql to enable upload management.',
        uploads: [],
      });
    }
    res.status(500).json({ message: 'Failed to fetch uploads.' });
  }
};

export const deleteUpload = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const [upload] = await conn.query('SELECT * FROM excel_uploads WHERE id = ?', [id]);
    if (!upload.length) return res.status(404).json({ message: 'Upload not found.' });

    await conn.beginTransaction();
    const record = upload[0];

    if (record.upload_type === 'student') {
      await conn.query('DELETE FROM students WHERE upload_id = ?', [id]);
    } else {
      const [assignments] = await conn.query(
        'SELECT subject_id FROM faculty_assignments WHERE upload_id = ? AND subject_id IS NOT NULL',
        [id]
      );
      const subjectIds = [...new Set(assignments.map((a) => a.subject_id).filter(Boolean))];
      await conn.query('DELETE FROM faculty_assignments WHERE upload_id = ?', [id]);
      await deleteSubjectsCascade(conn, subjectIds);
    }

    await conn.query('DELETE FROM excel_uploads WHERE id = ?', [id]);
    await conn.commit();
    res.json({ message: `"${record.file_name}" and all related records removed.` });
  } catch (err) {
    await conn.rollback();
    console.error('Delete upload error:', err);
    res.status(500).json({ message: err.message || 'Failed to delete upload.' });
  } finally {
    conn.release();
  }
};

/** Delete ALL upload-derived data — fresh start (keeps user accounts) */
export const deleteAllData = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await purgeAllUploadData(conn);
    await conn.commit();
    res.json({
      message: 'All uploaded data cleared. Students, faculty assignments, subjects, sections, and marks have been removed. User accounts are kept.',
    });
  } catch (err) {
    await conn.rollback();
    console.error('Delete all error:', err);
    res.status(500).json({ message: err.message || 'Failed to clear data.' });
  } finally {
    conn.release();
  }
};
