import XLSX from 'xlsx';
import crypto from 'crypto';

const normalizeKey = (key) =>
  String(key || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Keep CSC-A, 1, 2 — only map single letters A–F to numbers */
export const normalizeSection = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '1';
  if (/^[A-F]$/i.test(raw)) {
    const letterMap = { A: '1', B: '2', C: '3', D: '4', E: '5', F: '6' };
    return letterMap[raw.toUpperCase()] || raw;
  }
  return raw;
};

export const normalizeBranch = (v) => String(v ?? '').trim().toUpperCase();
export const normalizeSemester = (v) => String(v ?? '').trim();
export const normalizeStudyYear = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return '1';
  const roman = { I: '1', II: '2', III: '3', IV: '4' };
  const upper = s.toUpperCase().replace(/\s*(YEAR|YR)\s*/gi, '');
  if (roman[upper]) return roman[upper];
  const digit = s.match(/\d+/);
  return digit ? digit[0] : s;
};

const COLUMN_ALIASES = {
  student: {
    academicYear: [
      'academic_year', 'academicyear', 'academic year', 'ay', 'batch', 'session',
      'academic session', 'year_label',
    ],
    studyYear: [
      'year', 'yr', 'study_year', 'studyyear', 'class', 'class year', 'year of study',
      'current year', 'student year', 'ii year', '2nd year', '1st year',
    ],
    branch: [
      'branch', 'branch_name', 'branchname', 'department', 'dept', 'program',
      'branch code', 'discipline', 'course branch',
    ],
    semester: ['semester', 'sem', 'sem_no', 'semester no', 'semester number', 'sem no'],
    section: ['section', 'sec', 'section name', 'sec_name', 'division', 'sec name'],
    rollNumber: [
      'roll_number', 'rollnumber', 'roll no', 'rollno', 'roll', 'regd no',
      'registration no', 'register number', 'htno', 'hall ticket', 'reg no',
      'student roll', 'roll num',
    ],
    studentName: [
      'student_name', 'studentname', 'name', 'student name', 'stu_name',
      'candidate name', 'student', 'full name', 'name of student',
    ],
  },
  faculty: {
    academicYear: [
      'academic_year', 'academicyear', 'academic year', 'ay', 'batch', 'session',
    ],
    studyYear: ['year', 'yr', 'study_year', 'class', 'class year', 'year of study'],
    branch: ['branch', 'branch_name', 'department', 'dept', 'program', 'branch code'],
    semester: ['semester', 'sem', 'sem_no', 'semester no'],
    section: ['section', 'sec', 'section name', 'division'],
    facultyCode: [
      'faculty_id', 'facultyid', 'faculty id', 'fac_id', 'facid', 'emp_id',
      'employee id', 'staff id', 'teacher id', 'gvpwfac',
    ],
    facultyName: [
      'faculty_name', 'facultyname', 'faculty name', 'name', 'teacher name',
      'staff name', 'professor', 'instructor', 'faculty',
    ],
    subject: [
      'subject', 'subject_name', 'subjectname', 'subject name', 'course',
      'paper', 'sub name', 'course name', 'paper name',
    ],
    subjectCode: [
      'subject_code', 'subjectcode', 'sub code', 'course code', 'paper code', 'code',
    ],
  },
};

const findColumn = (row, aliases) => {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const found = keys.find((k) => normalizeKey(k) === normalizeKey(alias));
    if (found != null && row[found] !== '') return row[found];
  }
  return null;
};

const detectMappedHeaders = (rows, type) => {
  if (!rows.length) return {};
  const first = rows[0];
  const map = COLUMN_ALIASES[type];
  const detected = {};
  for (const [field, aliases] of Object.entries(map)) {
    const keys = Object.keys(first);
    const match = keys.find((k) => aliases.some((a) => normalizeKey(k) === normalizeKey(a)));
    if (match) detected[field] = match;
  }
  return detected;
};

const parseSheetRows = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
};

export const hashFileBuffer = (buffer) =>
  crypto.createHash('sha256').update(buffer).digest('hex');

/** student_master_data.xlsx and compatible formats */
export const parseStudentExcel = (buffer) => {
  const rows = parseSheetRows(buffer);
  if (!rows.length) throw new Error('Excel file is empty.');

  const detected = detectMappedHeaders(rows, 'student');
  const parsed = rows
    .map((row) => ({
      academicYear: String(findColumn(row, COLUMN_ALIASES.student.academicYear) || '').trim(),
      studyYear: normalizeStudyYear(findColumn(row, COLUMN_ALIASES.student.studyYear)),
      branch: normalizeBranch(findColumn(row, COLUMN_ALIASES.student.branch)),
      semester: normalizeSemester(findColumn(row, COLUMN_ALIASES.student.semester)),
      section: normalizeSection(findColumn(row, COLUMN_ALIASES.student.section)),
      rollNumber: String(findColumn(row, COLUMN_ALIASES.student.rollNumber) || '').trim(),
      studentName: String(findColumn(row, COLUMN_ALIASES.student.studentName) || '').trim(),
    }))
    .filter((r) => r.rollNumber && r.studentName && r.branch && r.semester);

  if (!parsed.length) {
    const headers = Object.keys(rows[0] || {}).join(', ');
    throw new Error(
      `No valid student rows. Found columns: [${headers}]. Required: roll number, student name, branch, semester.`
    );
  }

  return { rows: parsed, detectedColumns: detected, fileHint: 'student_master_data' };
};

/** modified_faclist.xlsx and compatible formats */
export const parseFacultyExcel = (buffer) => {
  const rows = parseSheetRows(buffer);
  if (!rows.length) throw new Error('Excel file is empty.');

  const detected = detectMappedHeaders(rows, 'faculty');
  const parsed = rows
    .map((row) => {
      const subjectName = String(findColumn(row, COLUMN_ALIASES.faculty.subject) || '').trim();
      const subjectCodeRaw = findColumn(row, COLUMN_ALIASES.faculty.subjectCode);
      return {
        academicYear: String(findColumn(row, COLUMN_ALIASES.faculty.academicYear) || '').trim(),
        studyYear: normalizeStudyYear(findColumn(row, COLUMN_ALIASES.faculty.studyYear)),
        branch: normalizeBranch(findColumn(row, COLUMN_ALIASES.faculty.branch)),
        semester: normalizeSemester(findColumn(row, COLUMN_ALIASES.faculty.semester)),
        section: normalizeSection(findColumn(row, COLUMN_ALIASES.faculty.section)),
        facultyCode: String(findColumn(row, COLUMN_ALIASES.faculty.facultyCode) || '').trim().toUpperCase(),
        facultyName: String(findColumn(row, COLUMN_ALIASES.faculty.facultyName) || '').trim(),
        subject: subjectName,
        subjectCode: subjectCodeRaw
          ? String(subjectCodeRaw).trim().toUpperCase()
          : null,
      };
    })
    .filter((r) => r.facultyCode && r.facultyName && r.subject && r.branch && r.semester);

  if (!parsed.length) {
    const headers = Object.keys(rows[0] || {}).join(', ');
    throw new Error(
      `No valid faculty rows. Found columns: [${headers}]. Required: faculty id, faculty name, subject, branch, semester.`
    );
  }

  return { rows: parsed, detectedColumns: detected, fileHint: 'modified_faclist' };
};

export const subjectCodeFromName = (name) =>
  String(name)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 20) || 'SUBJECT';

export const exportMarksToExcel = (data, meta) => {
  const wb = XLSX.utils.book_new();
  const headerRows = [
    ['MARK LIST ANALYSIS - GVPCEW EXAMINATION BRANCH'],
    [`Subject: ${meta.subjectName || ''}`],
    [`Faculty: ${meta.facultyName || ''} (${meta.facultyCode || ''})`],
    [`Academic Year: ${meta.academicYear || ''} | Branch: ${meta.branch || ''} | Sem: ${meta.semester || ''} | Section: ${meta.section || ''}`],
    [`Exam Type: ${meta.examType || ''}`],
    [],
  ];
  const tableHeader = data.columns || ['S.No', 'Roll Number', 'Student Name'];
  const sheetData = [
    ...headerRows,
    tableHeader,
    ...data.rows.map((r) => tableHeader.map((c) => r[c] ?? '')),
  ];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = tableHeader.map((_, i) => ({ wch: i === 2 ? 28 : 14 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Marks Sheet');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};
