import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUsers, FiBook, FiFileText, FiUpload, FiLayers } from 'react-icons/fi';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const quickLinks = [
  { to: '/admin/upload', icon: FiUpload, label: 'Upload Excel', desc: 'Import student & subject data' },
  { to: '/admin/students', icon: FiUsers, label: 'View Students', desc: 'Manage student records' },
  { to: '/admin/reports', icon: FiFileText, label: 'Reports', desc: 'Review faculty submissions' },
];

export default function AdminHome() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getAnalytics()
      .then((res) => setStats(res.data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total Students', value: stats?.students ?? '—', icon: FiUsers, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Faculty', value: stats?.faculty ?? '—', icon: FiUsers, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Total Subjects', value: stats?.subjects ?? '—', icon: FiBook, color: 'bg-violet-50 text-violet-600' },
    { label: 'Total Reports', value: stats?.reports ?? '—', icon: FiFileText, color: 'bg-amber-50 text-amber-600' },
    { label: 'Total Sections', value: stats?.sections ?? '—', icon: FiLayers, color: 'bg-rose-50 text-rose-600' },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Administration Dashboard</h1>
        <p className="text-gray-500 mt-1">Examination Branch — Mark List Analysis System</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-5"
          >
            <div className={`inline-flex p-2.5 rounded-lg ${card.color} mb-3`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <Link key={link.to} to={link.to} className="card p-6 hover:shadow-elevated transition-shadow group">
            <link.icon className="w-8 h-8 text-institutional-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{link.label}</h3>
            <p className="text-sm text-gray-500 mt-1">{link.desc}</p>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
