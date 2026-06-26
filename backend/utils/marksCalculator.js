export const calculateTotal = (midMarks, assignment) => {
  const m = parseFloat(midMarks) || 0;
  const a = parseFloat(assignment) || 0;
  return Math.min(30, parseFloat((m + a).toFixed(2)));
};

export const calculateFinalMid = (mid1Total, mid2Total) => {
  const m1 = parseFloat(mid1Total) || 0;
  const m2 = parseFloat(mid2Total) || 0;
  const higher = Math.max(m1, m2);
  const lower = Math.min(m1, m2);
  const raw = higher * 0.8 + lower * 0.2;
  return Number.isInteger(raw) ? raw : Math.ceil(raw);
};

export const calculateFinalMidBreakdown = (mid1Total, mid2Total) => {
  const m1 = parseFloat(mid1Total) || 0;
  const m2 = parseFloat(mid2Total) || 0;
  const higher = Math.max(m1, m2);
  const lower = Math.min(m1, m2);
  const raw = higher * 0.8 + lower * 0.2;
  return {
    higher,
    lower,
    percent80: parseFloat((higher * 0.8).toFixed(2)),
    percent20: parseFloat((lower * 0.2).toFixed(2)),
    finalTotal: Number.isInteger(raw) ? raw : Math.ceil(raw),
  };
};

export const calculateFinalLab = (lab1, lab2) => Math.max(parseFloat(lab1) || 0, parseFloat(lab2) || 0);

const parseMarkValue = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === '' || normalized === 'AB' || normalized === 'A' || normalized === 'ABSENT') return null;
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

export const validateMidMarks = (midMarks, assignment) => {
  const errors = [];
  const mid = parseMarkValue(midMarks);
  const assignmentValue = parseMarkValue(assignment);
  if (mid !== null && (mid < 0 || mid > 20)) {
    errors.push('Mid marks must be between 0 and 20');
  }
  // Assignment marks are required and must be numeric between 1 and 10 inclusive
  if (assignmentValue === null) {
    errors.push('Assignment marks are required and must be a number between 1 and 10');
  } else if (assignmentValue < 1 || assignmentValue > 10) {
    errors.push('Assignment marks must be between 1 and 10');
  }
  return errors;
};

export const validateLabMarks = (labMarks) => {
  const lab = parseMarkValue(labMarks);
  if (lab !== null && (lab < 0 || lab > 50)) {
    return ['Internal marks must be between 0 and 50'];
  }
  return [];
};

export const EXAM_TYPES = {
  mid1: 'Mid 1',
  mid2: 'Mid 2',
  lab1: 'Lab Internal 1',
  lab2: 'Lab Internal 2',
  final_mid: 'Final Mid',
  final_lab: 'Final Internal',
};
