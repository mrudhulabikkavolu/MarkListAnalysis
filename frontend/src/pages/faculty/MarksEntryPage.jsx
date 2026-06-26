import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { facultyAPI } from '../../services/api';

const EXAM_TYPES = [
  { id: 'mid1', label: 'Mid 1' },
  { id: 'mid2', label: 'Mid 2' },
  { id: 'lab1', label: 'Lab Internal 1' },
  { id: 'lab2', label: 'Lab Internal 2' },
  { id: 'final_mid', label: 'Final Mid' },
  { id: 'final_lab', label: 'Final Internal' },
];

export default function MarksEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialSubjectId = location.state?.subjectId || params.get('subjectId');
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [assignment, setAssignment] = useState(location.state?.assignment || null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);

  useEffect(() => {
    if (subjectId && !assignment) {
      setLoadingAssignment(true);
      facultyAPI.getAssignments()
        .then((res) => {
          const found = res.data.assignments?.find((row) => String(row.subject_id) === String(subjectId));
          if (found) {
            setAssignment({
              ...found,
              subject: found.subject,
              academic_year: found.academic_year,
              branch: found.branch,
              sem: found.sem,
              section: found.section,
            });
          }
        })
        .catch(() => {
          toast.error('Could not load subject details.');
        })
        .finally(() => setLoadingAssignment(false));
    }
  }, [subjectId, assignment]);

  if (!subjectId) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500 mb-4">Select a subject from your dashboard first.</p>
        <button onClick={() => navigate('/faculty')} className="btn-primary">Go to Dashboard</button>
      </div>
    );
  }

  if (loadingAssignment && !assignment) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500 mb-4">Loading subject details...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500 mb-4">Unable to load assignment details for this subject.</p>
        <button onClick={() => navigate('/faculty')} className="btn-primary">Go to Dashboard</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button onClick={() => navigate('/faculty')} className="flex items-center gap-2 text-sm text-gray-500 mb-4 hover:text-gray-700">
        <FiArrowLeft /> Back to assignments
      </button>

      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-lg">{assignment?.subject}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {assignment?.academic_year} · {assignment?.branch} · Sem {assignment?.sem} · Section {assignment?.section}
        </p>
      </div>

      <h3 className="font-semibold mb-3">Select Examination Type</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {EXAM_TYPES.map((exam) => (
          <button
            key={exam.id}
            onClick={() => navigate(`/faculty/marks/${subjectId}/${exam.id}`)}
            className="card p-5 text-left hover:shadow-elevated border-l-4 border-institutional-primary transition-shadow"
          >
            <span className="font-semibold">{exam.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
