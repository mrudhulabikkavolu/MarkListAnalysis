import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBook, FiUsers, FiChevronRight } from 'react-icons/fi';
import { facultyAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function FacultyHome() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    facultyAPI.getAssignments()
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const openSubject = (row) => {
    navigate(`/faculty/marks?subjectId=${row.subject_id}`, {
      state: {
        subjectId: row.subject_id,
        assignment: {
          ...row,
          subject: row.subject,
          academic_year: row.academic_year,
          branch: row.branch,
          sem: row.sem,
          section: row.section,
        },
      },
    });
  };

  if (loading) return <LoadingSpinner />;

  const faculty = data?.faculty;
  const assignments = data?.assignments || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card p-6 mb-6 bg-gradient-to-r from-institutional-sidebar to-navy-800 text-white">
        <h1 className="text-2xl font-bold">Welcome {faculty?.name || 'Faculty'}</h1>
        <p className="text-navy-200 mt-1 font-mono text-sm">{faculty?.facultyCode}</p>
        <p className="text-navy-300 text-sm mt-2">Your assigned subjects from uploaded faculty data</p>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          title="No subjects assigned"
          description="Ask admin to upload modified_faclist.xlsx with your Faculty ID, then log in with the same ID."
        />
      ) : (
        <>
          <h2 className="text-lg font-semibold mb-4">My Subjects ({assignments.length})</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {assignments.map((row) => (
              <motion.button
                key={row.id}
                type="button"
                whileHover={{ y: -2 }}
                onClick={() => openSubject(row)}
                className="card p-5 text-left hover:shadow-elevated transition-all border-l-4 border-institutional-primary w-full"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    <FiBook className="w-5 h-5 text-institutional-primary shrink-0" />
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{row.subject}</h3>
                  </div>
                  <FiChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs">Branch</p>
                    <p className="font-medium">{row.branch}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Section</p>
                    <p className="font-medium">{row.section}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Semester</p>
                    <p className="font-medium">{row.sem}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Year</p>
                    <p className="font-medium">{row.year}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-400 text-xs">Academic Year</p>
                    <p className="font-medium">{row.academic_year}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-gray-600">
                    <FiUsers className="w-4 h-4" />
                    {row.total_students ?? 0} Students
                  </span>
                  <span className="text-sm font-medium text-institutional-primary">Enter Marks →</span>
                </div>
              </motion.button>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
