import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiEye, FiDownload, FiCheck, FiEdit3 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function ReportsPage() {
  const [dashboard, setDashboard] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewReport, setViewReport] = useState(null);
  const [editMarks, setEditMarks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [filters, setFilters] = useState({ status: 'all', faculty: '', subject: '', section: '', branch: '' });
  const [tab, setTab] = useState('list');

  const load = async () => {
    setLoading(true);
    try {
      const [dashRes, repRes] = await Promise.all([
        adminAPI.getReportDashboard(),
        adminAPI.getReports(filters),
      ]);
      setDashboard(dashRes.data);
      setReports(repRes.data.reports);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters]);

  const handleView = async (id, edit = false) => {
    try {
      const res = await adminAPI.getReportDetails(id);
      setViewReport(res.data);
      setEditMarks(res.data.marks ?? []);
      setIsEditing(edit);
    } catch {
      toast.error('Failed to load report');
    }
  };

  const normalizeInput = (value) => {
    const raw = String(value ?? '').trim();
    return raw;
  };

  const handleEditMarkChange = (index, field, value) => {
    const updated = [...editMarks];
    updated[index] = { ...updated[index], [field]: normalizeInput(value) };

    const examType = viewReport?.submission?.exam_type;
    if (examType === 'mid1' || examType === 'mid2') {
      const written = parseFloat(updated[index].written_marks) || 0;
      const assignment = parseFloat(updated[index].assignment_marks) || 0;
      updated[index].total_marks = Number.isNaN(written + assignment) ? '' : written + assignment;
    } else if (examType === 'lab1' || examType === 'lab2') {
      const lab = parseFloat(updated[index].lab_marks);
      updated[index].total_marks = Number.isNaN(lab) ? '' : lab;
    } else if (examType === 'final_mid' || examType === 'final_lab') {
      updated[index].total_marks = normalizeInput(value);
    }

    setEditMarks(updated);
  };

  const handleSaveReport = async () => {
    if (!viewReport) return;
    setSavingEdit(true);
    try {
      await adminAPI.updateReportMarks(viewReport.submission.id, { marks: editMarks });
      toast.success('Report updated successfully');
      setIsEditing(false);
      await handleView(viewReport.submission.id, false);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update report');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleApprove = async (id) => {
    await adminAPI.approveReport(id);
    toast.success('Approved');
    load();
    setViewReport(null);
  };

  const handleDownload = async (id) => {
    const res = await adminAPI.downloadReport(id);
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${id}.xlsx`;
    a.click();
  };

  const statusBadge = (status) => {
    const s = {
      submitted: 'bg-amber-100 text-amber-700',
      approved: 'bg-emerald-100 text-emerald-700',
      draft: 'bg-gray-100 text-gray-600',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${s[status]}`}>{status}</span>;
  };

  const marksForDisplay = isEditing ? editMarks : viewReport?.marks;
  const showFinalMidBreakdown = viewReport?.submission?.exam_type === 'final_mid';
  const showWritten = !showFinalMidBreakdown && marksForDisplay?.some((m) => m.written_marks != null && m.written_marks !== '');
  const showAssignment = !showFinalMidBreakdown && marksForDisplay?.some((m) => m.assignment_marks != null && m.assignment_marks !== '');
  const showLab = !showFinalMidBreakdown && marksForDisplay?.some((m) => m.lab_marks != null && m.lab_marks !== '');

  const formatFinalMidPercents = (row) => {
    const mid1 = parseFloat(row.mid1_total) || 0;
    const mid2 = parseFloat(row.mid2_total) || 0;
    const higher = Math.max(mid1, mid2);
    const lower = Math.min(mid1, mid2);
    return {
      percent80: Number.isInteger(higher * 0.8) ? higher * 0.8 : Number((higher * 0.8).toFixed(2)),
      percent20: Number.isInteger(lower * 0.2) ? lower * 0.2 : Number((lower * 0.2).toFixed(2)),
    };
  };

  if (loading && !dashboard) return <LoadingSpinner />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-2xl font-bold mb-6">Report Management</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5 text-center">
          <p className="text-3xl font-bold text-emerald-600">{dashboard?.summary?.submitted ?? 0}</p>
          <p className="text-sm text-gray-500">Submitted</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-3xl font-bold text-amber-600">{dashboard?.summary?.pending ?? 0}</p>
          <p className="text-sm text-gray-500">Pending (Drafts)</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-3xl font-bold text-institutional-primary">{dashboard?.summary?.totalAssignments ?? 0}</p>
          <p className="text-sm text-gray-500">Faculty Assignments</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 border-b">
        {['list', 'faculty', 'subject', 'section'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${
              tab === t ? 'border-institutional-primary text-institutional-primary' : 'border-transparent text-gray-500'
            }`}
          >
            {t === 'list' ? 'All Reports' : `By ${t}`}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <>
          <div className="card p-4 mb-4 flex flex-wrap gap-3">
            <select className="input-field w-36" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="pending">Pending</option>
            </select>
            <input className="input-field w-40" placeholder="Faculty" value={filters.faculty} onChange={(e) => setFilters({ ...filters, faculty: e.target.value })} />
            <input className="input-field w-40" placeholder="Subject" value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })} />
            <input className="input-field w-28" placeholder="Section" value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })} />
            <input className="input-field w-32" placeholder="Branch" value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value })} />
          </div>

          {reports.length === 0 ? (
            <EmptyState title="No reports" />
          ) : (
            <div className="card overflow-hidden">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Faculty</th><th>Subject</th><th>Branch</th><th>Sem</th><th>Section</th>
                    <th>Exam</th><th>Status</th><th>Submitted</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td>{r.faculty_name}<br /><span className="text-xs text-gray-400">{r.faculty_code}</span></td>
                      <td>{r.subject_name}</td>
                      <td>{r.branch}</td>
                      <td>{r.semester}</td>
                      <td>{r.section_name}</td>
                      <td>{r.exam_type_label}</td>
                      <td>{statusBadge(r.status)}</td>
                      <td className="text-sm">{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'}</td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => handleView(r.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><FiEye /></button>
                          <button onClick={() => handleDownload(r.id)} className="p-2 hover:bg-gray-50 rounded"><FiDownload /></button>
                          {r.status !== 'approved' && (
                            <button onClick={() => handleView(r.id, true)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"><FiEdit3 /></button>
                          )}
                          {r.status === 'submitted' && (
                            <button onClick={() => handleApprove(r.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded"><FiCheck /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'faculty' && (
        <div className="card overflow-hidden">
          <table className="erp-table">
            <thead><tr><th>Faculty ID</th><th>Name</th><th>Submitted</th><th>Pending</th></tr></thead>
            <tbody>
              {dashboard?.byFaculty?.map((f, i) => (
                <tr key={i}>
                  <td className="font-mono">{f.faculty_code || '—'}</td>
                  <td>{f.faculty_name}</td>
                  <td className="text-emerald-600 font-medium">{f.submitted}</td>
                  <td className="text-amber-600 font-medium">{f.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'subject' && (
        <div className="card overflow-hidden">
          <table className="erp-table">
            <thead><tr><th>Subject</th><th>Branch</th><th>Sem</th><th>Section</th><th>Submitted</th><th>Pending</th></tr></thead>
            <tbody>
              {dashboard?.bySubject?.map((s, i) => (
                <tr key={i}>
                  <td>{s.subject_name}</td><td>{s.branch}</td><td>{s.semester}</td><td>{s.section_name}</td>
                  <td>{s.submitted}</td><td>{s.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'section' && (
        <div className="card overflow-hidden">
          <table className="erp-table">
            <thead><tr><th>Academic Year</th><th>Branch</th><th>Sem</th><th>Section</th><th>Students</th><th>Submitted Reports</th></tr></thead>
            <tbody>
              {dashboard?.bySection?.map((s, i) => (
                <tr key={i}>
                  <td>{s.academic_year}</td><td>{s.branch}</td><td>{s.sem}</td><td>{s.section}</td>
                  <td>{s.students}</td><td>{s.submitted_reports}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">Report — {viewReport.submission?.subject_name}</h3>
                {isEditing && <p className="text-sm text-indigo-600">Editing marks for this report</p>}
              </div>
              <button onClick={() => { setViewReport(null); setIsEditing(false); }} className="rounded px-3 py-1 bg-gray-100 hover:bg-gray-200">✕</button>
            </div>
            <div className="overflow-auto p-4">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Roll</th><th>Name</th>
                    {showFinalMidBreakdown ? (
                      <>
                        <th>Mid 1</th>
                        <th>Mid 2</th>
                        <th>80%</th>
                        <th>20%</th>
                        <th>Final Total</th>
                      </>
                    ) : (
                      <>
                        {showWritten && <th>Mid</th>}
                        {showAssignment && <th>Assignment</th>}
                        {showLab && <th>Lab</th>}
                        <th>Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {marksForDisplay?.map((m, index) => (
                    <tr key={m.id ?? `${m.student_id}-${index}`}>
                      <td>{m.roll_number}</td><td>{m.student_name}</td>
                      {showWritten && (
                        <td>
                          {isEditing ? (
                            <input
                              className="input-field w-20"
                              value={m.written_marks ?? ''}
                              onChange={(e) => handleEditMarkChange(index, 'written_marks', e.target.value)}
                            />
                          ) : (
                            m.written_marks ?? '—'
                          )}
                        </td>
                      )}
                      {showAssignment && (
                        <td>
                          {isEditing ? (
                            <input
                              className="input-field w-20"
                              value={m.assignment_marks ?? ''}
                              onChange={(e) => handleEditMarkChange(index, 'assignment_marks', e.target.value)}
                            />
                          ) : (
                            m.assignment_marks ?? '—'
                          )}
                        </td>
                      )}
                      {showLab && (
                        <td>
                          {isEditing ? (
                            <input
                              className="input-field w-20"
                              value={m.lab_marks ?? ''}
                              onChange={(e) => handleEditMarkChange(index, 'lab_marks', e.target.value)}
                            />
                          ) : (
                            m.lab_marks ?? '—'
                          )}
                        </td>
                      )}
                      {showFinalMidBreakdown && (() => {
                        const percents = formatFinalMidPercents(m);
                        return (
                          <>
                            <td>{m.mid1_total ?? '—'}</td>
                            <td>{m.mid2_total ?? '—'}</td>
                            <td>{percents.percent80}</td>
                            <td>{percents.percent20}</td>
                          </>
                        );
                      })()}
                      <td className="font-semibold">
                        {isEditing && (viewReport.submission?.exam_type === 'final_mid' || viewReport.submission?.exam_type === 'final_lab') ? (
                          <input
                            className="input-field w-20"
                            value={m.total_marks ?? ''}
                            onChange={(e) => handleEditMarkChange(index, 'total_marks', e.target.value)}
                          />
                        ) : (
                          m.total_marks ?? '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isEditing && (
              <div className="p-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setEditMarks(viewReport.marks ?? []); }}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveReport}
                  disabled={savingEdit}
                  className="btn-primary"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
