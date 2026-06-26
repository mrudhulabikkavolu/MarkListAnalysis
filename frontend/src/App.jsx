import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ProfilePage from './pages/ProfilePage';

import AdminHome from './pages/admin/AdminHome';
import ExcelUpload from './pages/admin/ExcelUpload';
import StudentsPage from './pages/admin/StudentsPage';
import SubjectsPage from './pages/admin/SubjectsPage';
import ReportsPage from './pages/admin/ReportsPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';

import FacultyHome from './pages/faculty/FacultyHome';
import MarksEntryPage from './pages/faculty/MarksEntryPage';
import MarksSheetPage from './pages/faculty/MarksSheetPage';
import FacultyHistory from './pages/faculty/FacultyHistory';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/faculty'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminHome />} />
        <Route path="upload" element={<ExcelUpload />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route
        path="/faculty"
        element={
          <ProtectedRoute role="faculty">
            <DashboardLayout role="faculty" />
          </ProtectedRoute>
        }
      >
        <Route index element={<FacultyHome />} />
        <Route path="marks" element={<MarksEntryPage />} />
        <Route path="marks/:subjectId/:examType" element={<MarksSheetPage />} />
        <Route path="history" element={<FacultyHistory />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
