import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSave, FiSend, FiDownload, FiArrowLeft, FiEdit2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { facultyAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmModal from '../../components/common/ConfirmModal';

const EXAM_LABELS = {
  mid1: 'Mid 1', mid2: 'Mid 2', lab1: 'Lab Internal 1', lab2: 'Lab Internal 2',
  final_mid: 'Final Mid', final_lab: 'Final Internal',
};

export default function MarksSheetPage() {
  const { subjectId, examType } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [sheet, setSheet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [activeCell, setActiveCell] = useState({ row: -1, field: '' });
  const inputRefs = useRef([]);

  const getEditableFields = () => {
    if (data?.isLab && !data?.isFinalLab) return ['labMarks'];
    if (data?.isMid) return ['midMarks', 'assignmentMarks'];
    return [];
  };

  const getFieldLabel = (field) => {
    if (field === 'labMarks') return 'Internal marks';
    if (field === 'midMarks') return 'Mid marks';
    if (field === 'assignmentMarks') return 'Assignment marks';
    return 'Marks';
  };

  const focusCell = (rowIndex, field) => {
    const targetRef = inputRefs.current?.[rowIndex]?.[field];
    if (targetRef?.current) {
      targetRef.current.focus();
      setActiveCell({ row: rowIndex, field });
    }
  };

  const getNextPosition = (rowIndex, field, direction = 'forward') => {
    const fields = getEditableFields();
    if (!fields.length) return null;
    const fieldIndex = fields.indexOf(field);
    if (fieldIndex === -1) return null;

    let nextRow = rowIndex;
    let nextField = field;

    if (direction === 'forward') {
      if (fieldIndex < fields.length - 1) {
        nextField = fields[fieldIndex + 1];
      } else {
        nextField = fields[0];
        nextRow += 1;
      }
    } else {
      if (fieldIndex > 0) {
        nextField = fields[fieldIndex - 1];
      } else {
        nextRow -= 1;
        nextField = fields[fields.length - 1];
      }
    }

    if (nextRow < 0 || nextRow >= sheet.length) return null;
    return { row: nextRow, field: nextField };
  };

  const moveFocus = (rowIndex, field, key, shiftKey) => {
    let next = null;
    if (key === 'Enter' || key === 'ArrowDown') next = { row: rowIndex + 1, field };
    if (key === 'ArrowUp') next = { row: rowIndex - 1, field };
    if (key === 'ArrowRight') next = getNextPosition(rowIndex, field, 'forward');
    if (key === 'ArrowLeft') next = getNextPosition(rowIndex, field, 'backward');
    if (key === 'Tab') next = getNextPosition(rowIndex, field, shiftKey ? 'backward' : 'forward');
    if (!next) return false;
    focusCell(next.row, next.field);
    return true;
  };

  const normalizeInputValue = (rawValue) => {
    const cleaned = String(rawValue || '').trim().toUpperCase();
    if (/^A(B?)?$/.test(cleaned) || cleaned === 'ABSENT') return 'AB';
    if (/^[0-9]*$/.test(cleaned)) return cleaned;
    return cleaned.replace(/[^0-9]/g, '');
  };

  const parseMaybeNumber = (value) => {
    if (value === '' || value == null) return null;
    if (String(value).trim().toUpperCase() === 'AB') return null;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleValueChange = (idx, field, rawValue) => {
    const value = normalizeInputValue(rawValue);
    const max = field === 'labMarks' ? 50 : field === 'midMarks' ? 20 : 10;
    const min = field === 'assignmentMarks' ? 1 : 0;
    const numeric = value !== '' && value !== 'AB' ? parseInt(value, 10) : null;
    // Assignment must be strictly 1-10 and cannot be AB/empty
    if (field === 'assignmentMarks') {
      if (value === '' || value === 'AB' || numeric === null) {
        toast.error('Assignment marks are required and must be 1–10');
        return;
      }
      if (numeric < 1 || numeric > 10) {
        toast.error('Assignment marks must be 1–10');
        return;
      }
    } else if (numeric !== null && (numeric < min || numeric > max)) {
      toast.error(`${getFieldLabel(field)} must be ${min}–${max} or AB`);
      return;
    }
    updateRow(idx, field, value);
  };

  const handlePaste = (rowIndex, field) => (event) => {
    const rawText = event.clipboardData.getData('text');
    if (!rawText.includes('\n') && !rawText.includes('\t')) return;
    event.preventDefault();

    const values = rawText
      .split(/\r?\n|\t/)
      .map((item) => normalizeInputValue(item.trim()))
      .filter((item) => item !== '');

    if (!values.length) return;

    const max = field === 'labMarks' ? 50 : field === 'midMarks' ? 20 : 10;
    const min = field === 'assignmentMarks' ? 1 : 0;
    const updatedSheet = [...sheet];
    values.forEach((value, offset) => {
      const targetRow = rowIndex + offset;
      if (targetRow >= updatedSheet.length) return;
      const numeric = value !== '' && value !== 'AB' ? parseInt(value, 10) : null;
      if (numeric !== null && (numeric < min || numeric > max)) {
        toast.error(`${getFieldLabel(field)} must be ${min}–${max}`);
        return;
      }
      updatedSheet[targetRow] = {
        ...updatedSheet[targetRow],
        [field]: value,
      };
      if (data?.isMid) {
        const row = updatedSheet[targetRow];
        const m = parseMaybeNumber(row.midMarks);
        const a = parseMaybeNumber(row.assignmentMarks);
        updatedSheet[targetRow].totalMarks = (m !== null || a !== null) ? ((m || 0) + (a || 0)).toFixed(2) : '';
      }
      if (data?.isLab && !data?.isCalculated && field === 'labMarks') {
        const lab = parseMaybeNumber(value);
        updatedSheet[targetRow].totalMarks = lab !== null ? lab.toString() : '';
      }
    });
    setSheet(updatedSheet);
    if (rowIndex + values.length < sheet.length) {
      focusCell(rowIndex + values.length, field);
    }
  };

  const load = () => {
    setLoading(true);
    facultyAPI.getMarksSheet(subjectId, examType)
      .then((res) => {
        setData(res.data);
        setSheet(res.data.sheet);
      })
      .catch(() => toast.error('Failed to load marks sheet'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [subjectId, examType]);

  const updateRow = (idx, field, value) => {
    if (data?.isLocked) return;
    const updated = [...sheet];
    const row = { ...updated[idx], [field]: value };

    if (data?.isMid) {
      const m = parseMaybeNumber(row.midMarks);
      const a = parseMaybeNumber(row.assignmentMarks);
      if (field === 'midMarks' && row.midMarks !== '' && String(row.midMarks).trim().toUpperCase() !== 'AB' && (m === null || m < 0 || m > 20)) return toast.error('Mid marks: 0–20');
      if (field === 'assignmentMarks') {
        if (row.assignmentMarks === '' || String(row.assignmentMarks).trim().toUpperCase() === 'AB' || a === null) return toast.error('Assignment marks are required and must be 1–10');
        if (a < 1 || a > 10) return toast.error('Assignment: 1–10');
      }
      row.totalMarks = (m !== null || a !== null) ? ((m || 0) + (a || 0)).toFixed(2) : '';
    }
    if (data?.isLab && !data?.isCalculated && field === 'labMarks') {
      if (value !== '' && value !== 'AB') {
        const lab = parseFloat(value);
        if (lab < 0 || lab > 50) return toast.error('Internal marks: 0–50 or AB');
      }
      const labValue = parseMaybeNumber(value);
      row.totalMarks = labValue !== null ? labValue.toString() : '';
    }

    updated[idx] = row;
    setSheet(updated);
  };

  const handleCellKeyDown = (idx, field) => (event) => {
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Enter', 'Tab'];
    if (!keys.includes(event.key)) return;
    const moved = moveFocus(idx, field, event.key, event.shiftKey);
    if (moved) event.preventDefault();
  };

  const handleCellFocus = (idx, field) => () => {
    setActiveCell({ row: idx, field });
  };

  const handleSave = async (status) => {
    setSaving(true);
    try {
      // Client-side guard: Final Mid submission requires Mid1 and Mid2 completed
      if (status === 'submitted' && data?.isFinalMid) {
        const missing = sheet.some((r) => !r.mid1Total || !r.mid2Total);
        if (missing) {
          toast.error('Cannot submit Final Mid: Mid 1 and Mid 2 must be completed for all students.');
          setSaving(false);
          return;
        }
      }
      const res = await facultyAPI.saveMarks({ subjectId: parseInt(subjectId), examType, marks: sheet, status });
      toast.success(res.data.message);
      if (status === 'submitted') navigate('/faculty/history');
      else load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
      setConfirmSubmit(false);
    }
  };

  const handleExport = async () => {
    if (!data?.submission?.id) return toast.error('Save marks first');
    try {
      const res = await facultyAPI.exportExcel(data.submission.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `marks_${examType}.xlsx`;
      a.click();
    } catch {
      toast.error('Export failed');
    }
  };

  if (loading) return <LoadingSpinner text="Loading students from database..." />;

  if (!loading && data?.studentCount === 0) {
    return (
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <FiArrowLeft /> Back
        </button>
        <div className="card p-8 text-center">
          <p className="text-lg font-semibold text-gray-800">No students found</p>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
            {data?.emptyReason || 'Upload student_master_data.xlsx with matching branch, semester, section, and year.'}
          </p>
        </div>
      </div>
    );
  }

  const locked = data?.isLocked;
  const assignment = location.state?.assignment;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button
        onClick={() => navigate('/faculty/marks', { state: { subjectId, assignment } })}
        className="flex items-center gap-2 text-sm text-gray-500 mb-4"
      >
        <FiArrowLeft /> Back
      </button>

      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{EXAM_LABELS[examType]} — Marks Sheet</h1>
          {locked && <span className="text-sm text-amber-600 font-medium">🔒 Submitted — Locked</span>}
        </div>
        {!locked && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleSave('draft')} disabled={saving} className="btn-secondary flex items-center gap-2">
              <FiSave /> Save
            </button>
            <button onClick={() => handleSave('update')} disabled={saving} className="btn-secondary flex items-center gap-2">
              <FiEdit2 /> Update
            </button>
            <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
              <FiDownload /> Export
            </button>
            <button onClick={() => setConfirmSubmit(true)} disabled={saving} className="btn-primary flex items-center gap-2">
              <FiSend /> Submit
            </button>
          </div>
        )}
        {locked && (
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <FiDownload /> Export Excel
          </button>
        )}
      </div>

      {data?.isFinalMid && (
        <div className="card p-3 mb-4 text-sm bg-blue-50 border-l-4 border-blue-500">
          Final Mid = (Highest Mid × 0.8) + (Lowest Mid × 0.2)
        </div>
      )}
      {data?.isFinalLab && (
        <div className="card p-3 mb-4 text-sm bg-blue-50 border-l-4 border-blue-500">
          Final Internal = MAX(Internal-1, Internal-2)
        </div>
      )}

      <div className="card p-4 mb-4 bg-slate-50 border border-slate-200 text-sm text-slate-700">
        <p className="font-medium">Keyboard entry tips</p>
        <p className="mt-1 text-slate-600">Use <span className="font-semibold">Enter</span>, <span className="font-semibold">Tab</span>, and arrow keys to move between fields. Paste a column of values from Excel into any mark cell.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th>S.No</th><th>Roll Number</th><th>Name</th>
                {data?.isFinalMid && (
                  <><th>Mid-1</th><th>Mid-2</th><th>80%</th><th>20%</th><th>Final Total (30)</th></>
                )}
                {data?.isFinalLab && (
                  <><th>Internal-1</th><th>Internal-2</th><th>Best Of</th><th>Final Total</th></>
                )}
                {data?.isLab && !data?.isFinalLab && <th>Internal Marks (50)</th>}
                {data?.isMid && (
                  <><th>Mid Marks (20)</th><th>Assignment (10)</th><th>Total (30)</th></>
                )}
              </tr>
            </thead>
            <tbody>
              {sheet.map((row, idx) => (
                <tr key={row.studentId}>
                  <td className="text-center text-gray-500">{row.serialNumber}</td>
                  <td className="font-mono text-sm">{row.rollNumber}</td>
                  <td>{row.studentName}</td>

                  {data?.isFinalMid && (
                    <>
                      <td>{row.mid1Total}</td>
                      <td>{row.mid2Total}</td>
                      <td>{row.percent80}</td>
                      <td>{row.percent20}</td>
                      <td className={`font-semibold ${row.totalMarks === 'AB' ? 'text-red-600' : ''}`}>{row.totalMarks}</td>
                    </>
                  )}
                  {data?.isFinalLab && (
                    <>
                      <td>{row.internal1}</td>
                      <td>{row.internal2}</td>
                      <td className="font-semibold">{row.bestOf}</td>
                      <td className={`font-semibold ${row.totalMarks === 'AB' ? 'text-red-600' : ''}`}>{row.totalMarks}</td>
                    </>
                  )}
                  {data?.isLab && !data?.isFinalLab && (
                    <td>
                      <input
                        type="text"
                        maxLength={2}
                        value={row.labMarks}
                        ref={(element) => {
                          inputRefs.current[idx] = inputRefs.current[idx] || {};
                          inputRefs.current[idx].labMarks = { current: element };
                        }}
                        onChange={(e) => handleValueChange(idx, 'labMarks', e.target.value)}
                        onKeyDown={handleCellKeyDown(idx, 'labMarks')}
                        onPaste={handlePaste(idx, 'labMarks')}
                        onFocus={handleCellFocus(idx, 'labMarks')}
                        className={`input-field w-28 py-1.5 text-center ${activeCell.row === idx && activeCell.field === 'labMarks' ? 'border-navy-500 ring-2 ring-navy-200' : ''} ${row.labMarks === 'AB' ? 'text-red-600 font-semibold' : ''}`}
                        disabled={locked}
                      />
                    </td>
                  )}
                  {data?.isMid && (
                    <>
                      <td>
                        <input
                          type="text"
                          maxLength={2}
                          value={row.midMarks}
                          ref={(element) => {
                            inputRefs.current[idx] = inputRefs.current[idx] || {};
                            inputRefs.current[idx].midMarks = { current: element };
                          }}
                          onChange={(e) => handleValueChange(idx, 'midMarks', e.target.value)}
                          onKeyDown={handleCellKeyDown(idx, 'midMarks')}
                          onPaste={handlePaste(idx, 'midMarks')}
                          onFocus={handleCellFocus(idx, 'midMarks')}
                          className={`input-field w-24 py-1.5 text-center ${activeCell.row === idx && activeCell.field === 'midMarks' ? 'border-navy-500 ring-2 ring-navy-200' : ''} ${row.midMarks === 'AB' ? 'text-red-600 font-semibold' : ''}`}
                          disabled={locked}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          maxLength={2}
                          value={row.assignmentMarks}
                          ref={(element) => {
                            inputRefs.current[idx] = inputRefs.current[idx] || {};
                            inputRefs.current[idx].assignmentMarks = { current: element };
                          }}
                          onChange={(e) => handleValueChange(idx, 'assignmentMarks', e.target.value)}
                          onKeyDown={handleCellKeyDown(idx, 'assignmentMarks')}
                          onPaste={handlePaste(idx, 'assignmentMarks')}
                          onFocus={handleCellFocus(idx, 'assignmentMarks')}
                          className={`input-field w-24 py-1.5 text-center ${activeCell.row === idx && activeCell.field === 'assignmentMarks' ? 'border-navy-500 ring-2 ring-navy-200' : ''} ${row.assignmentMarks === 'AB' ? 'text-red-600 font-semibold' : ''}`}
                          disabled={locked}
                        />
                      </td>
                      <td className={`font-semibold ${row.totalMarks === 'AB' ? 'text-red-600' : 'text-institutional-primary'}`}>{row.totalMarks || '—'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={() => handleSave('submitted')}
        title="Submit Marks Sheet"
        message="After submission, this sheet will be locked and cannot be edited. Continue?"
        confirmText="Submit"
      />
    </motion.div>
  );
}
