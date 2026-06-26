import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMenu, FiX, FiHome, FiUpload, FiUsers, FiBook, FiFileText,
  FiBarChart2, FiUser, FiLogOut, FiSun, FiMoon, FiClipboard,
  FiClock, FiChevronDown,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const adminNav = [
  { to: '/admin', icon: FiHome, label: 'Dashboard', end: true },
  { to: '/admin/upload', icon: FiUpload, label: 'Excel Upload' },
  { to: '/admin/students', icon: FiUsers, label: 'Students' },
  { to: '/admin/subjects', icon: FiBook, label: 'Subjects' },
  { to: '/admin/reports', icon: FiFileText, label: 'Reports' },
  { to: '/admin/analytics', icon: FiBarChart2, label: 'Analytics' },
];

const facultyNav = [
  { to: '/faculty', icon: FiHome, label: 'Dashboard', end: true },
  { to: '/faculty/marks', icon: FiClipboard, label: 'Marks Entry' },
  { to: '/faculty/history', icon: FiClock, label: 'History' },
];

export default function DashboardLayout({ role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const navItems = role === 'admin' ? adminNav : facultyNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-institutional-sidebar text-white transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-lg font-bold tracking-tight">Mark List Analysis</h1>
                <p className="text-xs text-navy-300 mt-0.5">Examination Branch Portal</p>
              </div>
              <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-navy-200 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10 text-xs text-navy-300">
            <p className="capitalize">{role} Portal</p>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <button className="lg:hidden p-2 -ml-2" onClick={() => setSidebarOpen(true)}>
              <FiMenu className="w-6 h-6" />
            </button>

            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {role === 'admin' ? 'Administration Dashboard' : 'Faculty Marks Portal'}
              </h2>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                aria-label="Toggle theme"
              >
                {darkMode ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="w-8 h-8 rounded-full bg-institutional-primary flex items-center justify-center text-white text-sm font-semibold">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {user?.username}
                  </span>
                  <FiChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-elevated border border-gray-100 dark:border-gray-800 py-1 z-20"
                      >
                        <button
                          onClick={() => { navigate(`/${role}/profile`); setProfileOpen(false); }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <FiUser className="w-4 h-4" /> Profile
                        </button>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <FiLogOut className="w-4 h-4" /> Logout
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
