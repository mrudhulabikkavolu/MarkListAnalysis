export const COLLEGE_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gvpcew\.ac\.in$/;
export const FACULTY_ID_REGEX = /^GVPW\/FAC\/\d{4}$/;
export const FACULTY_ID_SHORT_REGEX = /^\d{1,4}$/;

export const validateCollegeEmail = (email) => {
  const e = String(email || '').trim().toLowerCase();
  if (!COLLEGE_EMAIL_REGEX.test(e)) {
    return 'Only @gvpcew.ac.in college email addresses are allowed.';
  }
  return null;
};

export const buildFacultyId = (facultyId) => {
  const value = String(facultyId || '').trim().toUpperCase();
  if (FACULTY_ID_REGEX.test(value)) return value;
  if (FACULTY_ID_SHORT_REGEX.test(value)) {
    return `GVPW/FAC/${value.padStart(4, '0')}`;
  }
  const cleaned = value.replace(/^GVPW\/FAC\//, '');
  if (FACULTY_ID_SHORT_REGEX.test(cleaned)) {
    return `GVPW/FAC/${cleaned.padStart(4, '0')}`;
  }
  return value;
};

export const validateFacultyId = (facultyId, strict = true) => {
  const id = String(facultyId || '').trim().toUpperCase();
  if (id.length < 1) return 'Faculty ID is required.';
  if (strict && !FACULTY_ID_REGEX.test(buildFacultyId(id))) {
    return 'Faculty ID must be in format GVPW/FAC/0001 or 0001';
  }
  return null;
};

export const normalizeFacultyId = (facultyId) => buildFacultyId(facultyId);
