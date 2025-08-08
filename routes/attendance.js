const express = require('express');
const router = express.Router();

const {
  markAttendance,
  getSessionAttendance,
  getStudentAttendance,
  exportAttendance,
  getBatchStats // ✅ don't forget to import this
} = require('../controllers/attendanceController');

// POST: Mark or update attendance
router.post('/mark', markAttendance);

// GET: Get attendance for a session
router.get('/session/:sessionId', getSessionAttendance);

// GET: Get attendance for a student
router.get('/student/:studentId', getStudentAttendance);

// GET: Export to Excel
router.get('/export', exportAttendance);

// ✅ GET: Attendance stats for a batch
router.get('/stats/:batchId', getBatchStats);

module.exports = router;
