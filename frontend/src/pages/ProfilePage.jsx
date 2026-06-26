import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authAPI.getProfile()
      .then((res) => setProfile(res.data))
      .catch(() => setProfile({ user }))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <LoadingSpinner />;

  const data = profile?.user || user;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Profile</h1>
      <div className="card max-w-lg p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-institutional-primary flex items-center justify-center text-white text-3xl font-bold">
            {data?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{data?.username}</h2>
            <span className="inline-block mt-1 px-3 py-0.5 bg-navy-100 dark:bg-navy-900 text-navy-700 dark:text-navy-200 text-xs font-medium rounded-full capitalize">
              {data?.role}
            </span>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <FiUser className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Username</p>
              <p className="font-medium">{data?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <FiMail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-medium">{data?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <FiShield className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Access Level</p>
              <p className="font-medium capitalize">{data?.role} Portal</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
