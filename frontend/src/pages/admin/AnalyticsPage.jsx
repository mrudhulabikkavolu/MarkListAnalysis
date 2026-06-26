import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const COLORS = ['#1e3a5f', '#2c5282', '#486581', '#627d98', '#829ab1'];

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getAnalytics()
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const stats = data?.stats || {};
  const charts = data?.charts || {};

  const statCards = [
    { label: 'Students', value: stats.students },
    { label: 'Faculty', value: stats.faculty },
    { label: 'Subjects', value: stats.subjects },
    { label: 'Reports', value: stats.reports },
    { label: 'Sections', value: stats.sections },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-2xl font-bold mb-6">Dashboard Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="card p-5 text-center">
            <p className="text-3xl font-bold text-institutional-primary">{s.value ?? 0}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Students by Branch</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={charts.branchData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="branch" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold mb-4">Students by Semester</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={charts.semesterData || []}
                dataKey="count"
                nameKey="semester"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ semester, count }) => `${semester}: ${count}`}
              >
                {(charts.semesterData || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

    </motion.div>
  );
}
