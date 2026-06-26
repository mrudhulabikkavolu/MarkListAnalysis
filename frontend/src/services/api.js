import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const shouldRetry = (error) => {
  const retryableCodes = ['ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT', 'ERR_NETWORK'];
  return (
    error.config &&
    !error.config.__isRetryRequest &&
    (retryableCodes.includes(error.code) || error.message === 'Network Error')
  );
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (shouldRetry(err)) {
      err.config.__isRetryRequest = true;
      await new Promise((resolve) => setTimeout(resolve, 250));
      return api(err.config);
    }

    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  health: () => api.get('/health'),
};

const uploadFile = (url, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const adminAPI = {
  uploadStudentExcel: (file) => uploadFile('/admin/upload/students', file),
  uploadFacultyExcel: (file) => uploadFile('/admin/upload/faculty', file),
  uploadExcel: (file) => uploadFile('/admin/upload/students', file),
  getUploads: () => api.get('/admin/uploads'),
  deleteUpload: (id) => api.delete(`/admin/uploads/${id}`),
  deleteAllData: () => api.delete('/admin/data/all'),
  deleteAllUploads: () => api.delete('/admin/uploads'),
  getStudents: (params) => api.get('/admin/students', { params }),
  updateStudent: (id, data) => api.put(`/admin/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/admin/students/${id}`),
  getSubjects: () => api.get('/admin/subjects'),
  createSubject: (data) => api.post('/admin/subjects', data),
  updateSubject: (id, data) => api.put(`/admin/subjects/${id}`, data),
  deleteSubject: (id) => api.delete(`/admin/subjects/${id}`),
  getFaculty: () => api.get('/admin/faculty'),
  getSections: () => api.get('/admin/sections'),
  getReportDashboard: () => api.get('/admin/reports/dashboard'),
  getReports: (params) => api.get('/admin/reports', { params }),
  getReportDetails: (id) => api.get(`/admin/reports/${id}`),
  approveReport: (id) => api.patch(`/admin/reports/${id}/approve`),
  updateReportMarks: (id, data) => api.put(`/admin/reports/${id}/marks`, data),
  downloadReport: (id) => api.get(`/admin/reports/${id}/download`, { responseType: 'blob' }),
  getAnalytics: () => api.get('/admin/analytics'),
  getFilters: () => api.get('/admin/filters'),
};

export const facultyAPI = {
  getAssignments: () => api.get('/faculty/assignments'),
  getSubjects: () => api.get('/faculty/assignments'),
  getMarksSheet: (subjectId, examType) => api.get(`/faculty/marks/${subjectId}/${examType}`),
  saveMarks: (data) => api.post('/faculty/marks/save', data),
  getHistory: () => api.get('/faculty/history'),
  exportExcel: (submissionId) => api.get(`/faculty/export/${submissionId}`, { responseType: 'blob' }),
};

export default api;
