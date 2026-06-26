import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ConfirmModal from '../../components/common/ConfirmModal';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ search: '', branch: '', semester: '', page: 1 });
  const [options, setOptions] = useState({ branches: [], semesters: [] });
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getStudents(filters);
      setStudents(res.data.students);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    adminAPI.getFilters().then((r) => setOptions(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchStudents(); }, [filters]);

  const handleUpdate = async () => {
    try {
      await adminAPI.updateStudent(editModal.id, editModal);
      toast.success('Student updated');
      setEditModal(null);
      fetchStudents();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleDelete = async () => {
    try {
      await adminAPI.deleteStudent(deleteId);
      toast.success('Student deleted');
      fetchStudents();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-2xl font-bold mb-6">Student Records</h1>

      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search by roll number or name..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filters.branch}
            onChange={(e) => setFilters({ ...filters, branch: e.target.value, page: 1 })}
            className="input-field md:w-40"
          >
            <option value="">All Branches</option>
            {options.branches?.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select
            value={filters.semester}
            onChange={(e) => setFilters({ ...filters, semester: e.target.value, page: 1 })}
            className="input-field md:w-40"
          >
            <option value="">All Semesters</option>
            {options.semesters?.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : students.length === 0 ? (
        <EmptyState title="No students found" description="Upload an Excel file to import student data." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Roll No</th><th>Name</th><th>Academic Year</th><th>Year</th><th>Branch</th><th>Sem</th>
                  <th>Section</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="font-mono text-sm">{s.roll_number}</td>
                    <td>{s.name}</td>
                    <td>{s.academic_year}</td>
                    <td>{s.year}</td>
                    <td>{s.branch}</td>
                    <td>{s.semester}</td>
                    <td>{s.section_name}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => setEditModal({ ...s })} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(s.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4 border-t">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setFilters({ ...filters, page: p })}
                  className={`px-3 py-1 rounded text-sm ${filters.page === p ? 'bg-institutional-primary text-white' : 'hover:bg-gray-100'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card p-6 w-full max-w-md">
            <h3 className="font-semibold mb-4">Edit Student</h3>
            <div className="space-y-3">
              <input className="input-field" value={editModal.roll_number} onChange={(e) => setEditModal({ ...editModal, roll_number: e.target.value })} placeholder="Roll Number" />
              <input className="input-field" value={editModal.name} onChange={(e) => setEditModal({ ...editModal, name: e.target.value })} placeholder="Name" />
              <input className="input-field" value={editModal.branch} onChange={(e) => setEditModal({ ...editModal, branch: e.target.value })} placeholder="Branch" />
              <input className="input-field" value={editModal.semester} onChange={(e) => setEditModal({ ...editModal, semester: e.target.value })} placeholder="Semester" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleUpdate} className="btn-primary flex-1">Save</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Student"
        message="Are you sure you want to delete this student record?"
        confirmText="Delete"
        danger
      />
    </motion.div>
  );
}
