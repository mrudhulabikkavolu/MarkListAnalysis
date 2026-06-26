import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiDownload, FiEdit2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { facultyAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function FacultyHistory() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    facultyAPI.getHistory()
      .then((r) => setSubmissions(r.data.submissions))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (id) => {
    try {
      const res = await facultyAPI.exportExcel(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${id}.xlsx`;
      a.click();
    } catch {
      toast.error('Download failed');
    }
  };

  const statusStyle = {
    draft: 'bg-gray-100 text-gray-600',
    submitted: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
  };

  if (loading) return <LoadingSpinner />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-2xl font-bold mb-6">Submission History</h1>

      {submissions.length === 0 ? (
        <EmptyState title="No submissions yet" description="Your marks entries will appear here." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Subject</th><th>Branch</th><th>Semester</th><th>Section</th>
                  <th>Exam Type</th><th>Status</th><th>Last Updated</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.subject_name} <span className="text-xs text-gray-400">({s.subject_code})</span></td>
                    <td>{s.branch}</td>
                    <td>{s.semester}</td>
                    <td>{s.section_name}</td>
                    <td>{s.exam_type_label}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusStyle[s.status]}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="text-sm text-gray-500">{new Date(s.updated_at).toLocaleString()}</td>
                    <td>
                      <div className="flex gap-2">
                        {s.status === 'draft' && (
                          <Link
                            to={`/faculty/marks/${s.subject_id}/${s.exam_type}`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </Link>
                        )}
                        <button onClick={() => handleDownload(s.id)} className="p-1.5 text-gray-600 hover:bg-gray-50 rounded">
                          <FiDownload className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
