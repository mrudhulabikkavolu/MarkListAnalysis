import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiHash, FiBarChart2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import RoleSelector from '../../components/auth/RoleSelector';
import PasswordInput from '../../components/auth/PasswordInput';
import { validateCollegeEmail, validateFacultyId, buildFacultyId } from '../../utils/validators';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [role, setRole] = useState('admin');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, backendLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('savedEmail');
    if (saved) setEmail(saved);
    const savedFac = localStorage.getItem('savedFacultyId');
    if (savedFac) setFacultyId(String(savedFac));
  }, []);

  useEffect(() => {
    // when switching to faculty role, autofill faculty id if available
    const savedFac = localStorage.getItem('savedFacultyId');
    if (role === 'faculty' && savedFac) setFacultyId(String(savedFac));
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailErr = validateCollegeEmail(email);
    if (emailErr) return toast.error(emailErr);
    if (role === 'faculty') {
      const facErr = validateFacultyId(facultyId);
      if (facErr) return toast.error(facErr);
    }
    if (!password) return toast.error('Please enter password');

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setLoading(true);
    try {
      const user = await login({
        email: email.trim().toLowerCase(),
        password,
        role,
        rememberMe,
        facultyId: role === 'faculty' ? buildFacultyId(facultyId) : undefined,
      });
      localStorage.setItem('savedEmail', email.trim().toLowerCase());
      if (role === 'faculty') {
        // store the raw numeric faculty id (no prefix)
        localStorage.setItem('savedFacultyId', String(facultyId).replace(/[^0-9]/g, '').slice(0, 4));
      }
      toast.success('Login successful');
      navigate(user.role === 'admin' ? '/admin' : '/faculty');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#15223f] text-white p-12">
        <div className="absolute right-[-4rem] top-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute left-[-3rem] bottom-10 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative z-10 flex h-full flex-col justify-center gap-8">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 shadow-sm shadow-black/20 border border-white/10">
              <FiBarChart2 className="w-8 h-8 text-cyan-200" />
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold tracking-tight">Mark List Analysis</h1>
              <p className="mt-2 text-sm text-slate-300">GVPCEW Examination Branch Portal</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-white/5 p-6 shadow-[0_20px_60px_-35px_rgba(255,255,255,0.45)]">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Exam insights made simple</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Access marks reports, verify results, and manage exam data with a calm, focused interface built for academic teams.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-slate-200">
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <p>Quickly review submissions and approve reports from one dashboard.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <p>Keep faculty and admin login flow elegant with college email access.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <p>Save your email for faster sign-in next time.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="card p-8">
            <h2 className="text-2xl font-bold">Sign In</h2>
            <p className="text-sm text-gray-500 mt-1 mb-6">GVPCEW Examination Branch</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5">Role</label>
                <RoleSelector value={role} onChange={setRole} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">College Email</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-10"
                    placeholder="name@gvpcew.ac.in"
                    autoComplete="email"
                  />
                </div>
              </div>

              {role === 'faculty' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Faculty ID</label>
                  <div className="relative">
                    <FiHash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">GVPW/FAC/</span>
                      <input
                        value={facultyId}
                        onChange={(e) => setFacultyId(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                        className="input-field pl-[10.5rem] font-mono"
                        placeholder="0001"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>
              )}

              <PasswordInput label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>

              <button type="submit" disabled={loading || backendLoading} className="btn-primary w-full">
                {loading ? 'Signing in...' : backendLoading ? 'Starting server…' : 'Sign In'}
              </button>
              {backendLoading && (
                <p className="text-xs text-gray-500 mt-2">Waiting for backend initialization to complete. Please try again in a moment.</p>
              )}
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              <Link to="/signup" className="text-institutional-primary font-medium hover:underline">Create account</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
