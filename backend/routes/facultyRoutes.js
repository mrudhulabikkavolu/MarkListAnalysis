import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getMyAssignments,
  getMySubjects,
  getMarksSheet,
  saveMarks,
  getSubmissionHistory,
  exportMarksExcel,
} from '../controllers/facultyController.js';

const router = express.Router();

router.use(authenticate, authorize('faculty'));

router.get('/assignments', getMyAssignments);
router.get('/subjects', getMySubjects);
router.get('/marks/:subjectId/:examType', getMarksSheet);
router.post('/marks/save', saveMarks);
router.get('/history', getSubmissionHistory);
router.get('/export/:submissionId', exportMarksExcel);

export default router;
