import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiUser, FiHash } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import RoleSelector from '../../components/auth/RoleSelector';
import PasswordInput from '../../components/auth/PasswordInput';
import { validateCollegeEmail, validateFacultyId, buildFacultyId } from '../../utils/validators';

export default function SignupPage() {
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '', role: 'admin', facultyId: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = 'Name is required';
    const emailErr = validateCollegeEmail(form.email);
    if (emailErr) e.email = emailErr;
    if (form.role === 'faculty') {
      const facErr = validateFacultyId(form.facultyId);
      if (facErr) e.facultyId = facErr;
    }
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await signup({
        username: form.username,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        facultyId: form.role === 'faculty' ? buildFacultyId(form.facultyId) : undefined,
      });
      localStorage.setItem('savedEmail', form.email.trim().toLowerCase());
      if (form.role === 'faculty') {
        localStorage.setItem('savedFacultyId', String(form.facultyId).replace(/[^0-9]/g, '').slice(0, 4));
      }
      toast.success('Account created');
      navigate(user.role === 'admin' ? '/admin' : '/faculty');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-institutional-primary">Mark List Analysis</h1>
          <p className="text-sm text-gray-500">GVPCEW Registration</p>
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-bold mb-6">Sign Up</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <RoleSelector value={form.role} onChange={(r) => setForm({ ...form, role: r })} />

            <div>
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input value={form.username} onChange={update('username')} className={`input-field pl-10 ${errors.username ? 'border-red-500' : ''}`} />
              </div>
              {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">College Email <span className="text-xs text-gray-400">(login username)</span></label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="email" value={form.email} onChange={update('email')} className={`input-field pl-10 ${errors.email ? 'border-red-500' : ''}`} placeholder="name@gvpcew.ac.in" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Use this email to sign in later.</p>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            {form.role === 'faculty' && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Faculty ID</label>
                <div className="relative">
                  <FiHash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">GVPW/FAC/</span>
                    <input
                      value={form.facultyId}
                      onChange={(e) => setForm({ ...form, facultyId: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) })}
                      className={`input-field pl-[10.5rem] font-mono ${errors.facultyId ? 'border-red-500' : ''}`}
                      placeholder="0001"
                    />
                  </div>
                </div>
                {errors.facultyId && <p className="text-xs text-red-500 mt-1">{errors.facultyId}</p>}
              </div>
            )}

            <PasswordInput label="Password" value={form.password} onChange={update('password')} error={errors.password} />
            <PasswordInput label="Confirm Password" value={form.confirmPassword} onChange={update('confirmPassword')} error={errors.confirmPassword} />

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm">
            <Link to="/login" className="text-institutional-primary font-medium">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
