import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FiUploadCloud, FiFile, FiTrash2, FiUsers, FiUserCheck, FiRefreshCw, FiAlertCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmModal from '../../components/common/ConfirmModal';

export default function ExcelUpload() {
  const [studentFile, setStudentFile] = useState(null);
  const [facultyFile, setFacultyFile] = useState(null);
  const [uploading, setUploading] = useState({ student: false, faculty: false });
  const [uploads, setUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [uploadsError, setUploadsError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const studentRef = useRef(null);
  const facultyRef = useRef(null);

  const loadUploads = useCallback(async () => {
    setLoadingUploads(true);
    setUploadsError(null);
    try {
      const res = await adminAPI.getUploads();
      setUploads(res.data.uploads || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not load uploaded files';
      setUploadsError(msg);
      setUploads([]);
    } finally {
      setLoadingUploads(false);
    }
  }, []);

  useEffect(() => { loadUploads(); }, [loadUploads]);

  const handleUpload = async (type) => {
    const file = type === 'student' ? studentFile : facultyFile;
    if (!file) return toast.error('Select a file first');

    setUploading((u) => ({ ...u, [type]: true }));
    try {
      const api = type === 'student' ? adminAPI.uploadStudentExcel : adminAPI.uploadFacultyExcel;
      const res = await api(file);
      toast.success(res.data.message);
      if (type === 'student') {
        setStudentFile(null);
        if (studentRef.current) studentRef.current.value = '';
      } else {
        setFacultyFile(null);
        if (facultyRef.current) facultyRef.current.value = '';
      }
      loadUploads();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading((u) => ({ ...u, [type]: false }));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await adminAPI.deleteUpload(deleteTarget.id);
      toast.success(`Removed "${deleteTarget.file_name}"`);
      loadUploads();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove file');
      throw err;
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (deletingAll) return;
    setDeletingAll(true);
    try {
      await adminAPI.deleteAllData();
      toast.success('All uploaded data removed. System is fresh for new uploads.');
      loadUploads();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete all data');
      throw err;
    } finally {
      setDeletingAll(false);
    }
  };

  const studentUploads = uploads.filter((u) => u.upload_type === 'student');
  const facultyUploads = uploads.filter((u) => u.upload_type === 'faculty');

  const UploadBox = ({ title, icon: Icon, type, file, setFile, inputRef, columns, example }) => (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-6 h-6 text-institutional-primary" />
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-institutional-primary transition-colors"
      >
        <FiUploadCloud className="w-10 h-10 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">Click to select Excel file</p>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
      </div>
      {file && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <FiFile className="w-4 h-4 shrink-0" />
          <span className="text-sm flex-1 truncate">{file.name}</span>
          <button onClick={() => handleUpload(type)} disabled={uploading[type]} className="btn-primary text-sm shrink-0">
            {uploading[type] ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}
      <div className="mt-4 overflow-x-auto">
        <p className="text-xs text-gray-500 mb-2">Required columns:</p>
        <table className="erp-table text-xs">
          <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody><tr className="text-gray-500">{example.map((v, i) => <td key={i}>{v}</td>)}</tr></tbody>
        </table>
      </div>
    </div>
  );

  const UploadedFileRow = ({ u }) => (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
      <td>
        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${
          u.upload_type === 'student' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
        }`}>
          {u.upload_type}
        </span>
      </td>
      <td className="font-medium">{u.file_name}</td>
      <td>{u.academic_year || '—'}</td>
      <td className="text-sm text-gray-500">{new Date(u.created_at).toLocaleString()}</td>
      <td className="text-sm text-gray-500">{u.uploaded_by_name || '—'}</td>
      <td>
        <button
          type="button"
          onClick={() => setDeleteTarget(u)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors"
          title="Remove this upload and all related data"
        >
          <FiTrash2 className="w-4 h-4" />
          Remove
        </button>
      </td>
    </tr>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-2xl font-bold mb-2">Excel Upload</h1>
      <p className="text-gray-500 mb-6">
        Upload student and faculty data separately. Manage previously uploaded files below.
      </p>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <UploadBox
          title="Student Excel (student_master_data.xlsx)"
          icon={FiUsers}
          type="student"
          file={studentFile}
          setFile={setStudentFile}
          inputRef={studentRef}
          columns={['academic_year', 'year', 'branch', 'semester', 'section', 'roll_number', 'student_name']}
          example={['2025-2026', '1', 'CSE', '3', '1', '23BQ1A4201', 'Surya']}
        />
        <UploadBox
          title="Faculty Excel (modified_faclist.xlsx)"
          icon={FiUserCheck}
          type="faculty"
          file={facultyFile}
          setFile={setFacultyFile}
          inputRef={facultyRef}
          columns={['academic_year', 'year', 'branch', 'semester', 'section', 'faculty_id', 'faculty_name', 'subject']}
          example={['2025-2026', '1', 'CSE', '3', '1', 'GVPW/FAC/0001', 'Ramesh', 'DBMS']}
        />
      </div>
      {(uploading.student || uploading.faculty) && <LoadingSpinner text="Processing Excel..." />}

      {/* Uploaded files manager */}
      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b bg-gray-50 dark:bg-gray-800/50">
          <div>
            <h3 className="font-semibold text-lg">Uploaded Files</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {uploads.length} file{uploads.length !== 1 ? 's' : ''} on record — remove to delete file data from database
            </p>
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            <button
              type="button"
              onClick={loadUploads}
              disabled={loadingUploads}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <FiRefreshCw className={`w-4 h-4 ${loadingUploads ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteAll(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
            >
              <FiTrash2 className="w-4 h-4" /> Delete All Data
            </button>
          </div>
        </div>

        {uploadsError && (
          <div className="m-4 p-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <FiAlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Cannot list uploads</p>
              <p className="mt-1">{uploadsError}</p>
            </div>
          </div>
        )}

        {loadingUploads ? (
          <LoadingSpinner text="Loading uploaded files..." />
        ) : uploads.length === 0 && !uploadsError ? (
          <p className="p-8 text-sm text-gray-500 text-center">No uploaded files yet. Upload a student or faculty Excel above.</p>
        ) : uploads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>File Name</th>
                  <th>Academic Year</th>
                  <th>Uploaded At</th>
                  <th>Uploaded By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => (
                  <UploadedFileRow key={u.id} u={u} />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loadingUploads && uploads.length > 0 && (
          <div className="px-4 py-3 border-t bg-gray-50 dark:bg-gray-800/30 text-xs text-gray-500 flex flex-wrap gap-4">
            <span>Student uploads: {studentUploads.length}</span>
            <span>Faculty uploads: {facultyUploads.length}</span>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Remove Uploaded File"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.file_name}"? All ${
                deleteTarget.upload_type === 'student' ? 'students' : 'faculty assignments and linked subjects'
              } from this upload will be permanently removed from the database.`
            : ''
        }
        confirmText={deleting ? 'Removing...' : 'Remove'}
        danger
      />

      <ConfirmModal
        isOpen={confirmDeleteAll}
        onClose={() => setConfirmDeleteAll(false)}
        onConfirm={handleDeleteAll}
        loading={deletingAll}
        title="Delete All Uploaded Data"
        message="This will permanently remove ALL uploaded Excel metadata and related database records (students, subjects, assignments, marks). This cannot be undone. Continue?"
        confirmText={deletingAll ? 'Deleting...' : 'Delete All'}
        danger
      />
    </motion.div>
  );
}
