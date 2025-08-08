const express = require('express');
const router = express.Router();
const {
  createSession,
  getSessionInfo,
  markAttendance,
  getSessionAttendance,
  getAllSessions,
  exportAttendanceExcel,
  exportAttendancePDF,
  attendanceRateLimit,
  getBatchStudents,
  deleteSession,
  endSession
} = require('../controllers/qrAttendanceController');

// Teacher routes (protected)
router.post('/session/create', createSession);
router.get('/sessions', getAllSessions);
router.get('/session/:session_id/attendance', getSessionAttendance);
router.get('/session/:session_id/export/excel', exportAttendanceExcel);
router.get('/session/:session_id/export/pdf', exportAttendancePDF);
router.delete('/session/:session_id', deleteSession);
router.put('/session/:session_id/end', endSession);

// Public routes (for QR code access)
router.get('/session/:session_id/info', getSessionInfo);
router.get('/batch/:batchName/students', getBatchStudents);
router.post('/mark-attendance', attendanceRateLimit, markAttendance);

module.exports = router; 