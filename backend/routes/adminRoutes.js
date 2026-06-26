import express from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getStudents,
  updateStudent,
  deleteStudent,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getFacultyList,
  getSections,
  getReports,
  getReportDetails,
  getReportDashboard,
  approveReport,
  updateReportMarks,
  downloadReportExcel,
  getAnalytics,
  getFilterOptions,
} from '../controllers/adminController.js';
import {
  uploadStudentExcel,
  uploadFacultyExcel,
  getUploads,
  deleteUpload,
  deleteAllData,
} from '../controllers/adminUploadController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate, authorize('admin'));

router.post('/upload/students', upload.single('file'), uploadStudentExcel);
router.post('/upload/faculty', upload.single('file'), uploadFacultyExcel);
router.post('/upload', upload.single('file'), uploadStudentExcel);
router.get('/uploads', getUploads);
router.delete('/uploads/:id', deleteUpload);
router.put('/reports/:id/marks', updateReportMarks);
router.delete('/data/all', deleteAllData);

router.get('/students', getStudents);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);
router.get('/subjects', getSubjects);
router.post('/subjects', createSubject);
router.put('/subjects/:id', updateSubject);
router.delete('/subjects/:id', deleteSubject);
router.get('/faculty', getFacultyList);
router.get('/sections', getSections);
router.get('/reports/dashboard', getReportDashboard);
router.get('/reports', getReports);
router.get('/reports/:id', getReportDetails);
router.patch('/reports/:id/approve', approveReport);
router.get('/reports/:id/download', downloadReportExcel);
router.get('/analytics', getAnalytics);
router.get('/filters', getFilterOptions);

export default router;
