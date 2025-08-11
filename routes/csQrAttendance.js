const express = require('express');
const router = express.Router();
const csQrAttendanceController = require('../controllers/csQrAttendanceController');

// CS QR Attendance routes
router.post('/mark-attendance', csQrAttendanceController.markAttendance);
router.get('/sessions', csQrAttendanceController.getAllSessions);
router.post('/sessions', csQrAttendanceController.createSession);
router.put('/sessions/:sessionId/end', csQrAttendanceController.endSession);
router.delete('/sessions/:sessionId', csQrAttendanceController.deleteSession);
router.get('/sessions/:sessionId/attendance', csQrAttendanceController.getSessionAttendance);
router.get('/students/:regNumber/ip-history', csQrAttendanceController.getStudentIPHistory);

module.exports = router;
