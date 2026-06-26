import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ConfirmModal from '../../components/common/ConfirmModal';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [subRes, facRes, secRes] = await Promise.all([
        adminAPI.getSubjects(),
        adminAPI.getFaculty(),
        adminAPI.getSections(),
      ]);
      setSubjects(subRes.data.subjects);
      setFaculty(facRes.data.faculty);
      setSections(secRes.data.sections);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const emptyForm = { name: '', code: '', branch: '', semester: '', section_id: '', faculty_id: '' };

  const handleSave = async () => {
    try {
      if (modal.id) {
        await adminAPI.updateSubject(modal.id, modal);
        toast.success('Subject updated');
      } else {
        await adminAPI.createSubject(modal);
        toast.success('Subject created');
      }
      setModal(null);
      load();
    } catch {
      toast.error('Save failed');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Subject Management</h1>
        <button onClick={() => setModal(emptyForm)} className="btn-primary flex items-center gap-2">
          <FiPlus /> Add Subject
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : subjects.length === 0 ? (
        <EmptyState title="No subjects" description="Upload Excel or add subjects manually." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Code</th><th>Name</th><th>Branch</th><th>Semester</th>
                  <th>Section</th><th>Faculty</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono">{s.code}</td>
                    <td>{s.name}</td>
                    <td>{s.branch}</td>
                    <td>{s.semester}</td>
                    <td>{s.section_name}</td>
                    <td>{s.faculty_name || '—'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => setModal({ ...s, section_id: s.section_id, faculty_id: s.faculty_id || '' })} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
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
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-4">{modal.id ? 'Edit' : 'Add'} Subject</h3>
            <div className="space-y-3">
              <input className="input-field" placeholder="Subject Name" value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} />
              <input className="input-field" placeholder="Subject Code" value={modal.code} onChange={(e) => setModal({ ...modal, code: e.target.value })} />
              <input className="input-field" placeholder="Branch" value={modal.branch} onChange={(e) => setModal({ ...modal, branch: e.target.value })} />
              <input className="input-field" placeholder="Semester" value={modal.semester} onChange={(e) => setModal({ ...modal, semester: e.target.value })} />
              <select className="input-field" value={modal.section_id} onChange={(e) => setModal({ ...modal, section_id: e.target.value })}>
                <option value="">Select Section</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>{sec.branch} - {sec.semester} - Section {sec.name}</option>
                ))}
              </select>
              <select className="input-field" value={modal.faculty_id} onChange={(e) => setModal({ ...modal, faculty_id: e.target.value })}>
                <option value="">Assign Faculty</option>
                {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} className="btn-primary flex-1">Save</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => { await adminAPI.deleteSubject(deleteId); toast.success('Deleted'); load(); }}
        title="Delete Subject"
        message="This will remove the subject and related mappings."
        confirmText="Delete"
        danger
      />
    </motion.div>
  );
}
