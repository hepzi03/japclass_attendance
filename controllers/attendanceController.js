const mongoose = require('mongoose');
const xlsx = require('xlsx');
const Student = require('../models/Student');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const Batch = require('../models/Batch');

// ✅ POST: Mark or update attendance
const markAttendance = async (req, res) => {
  try {
    const { sessionId, studentId, status } = req.body;

    if (!sessionId || !studentId || !status) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await Attendance.findOne({ sessionId, studentId });
    if (existing) {
      existing.status = status;
      await existing.save();
      return res.json({ message: 'Attendance updated', attendance: existing });
    }

    const attendance = await Attendance.create({ sessionId, studentId, status });
    res.status(201).json({ message: 'Attendance marked', attendance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while marking attendance' });
  }
};

// ✅ GET: Get attendance for a session
const getSessionAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const records = await Attendance.find({ sessionId }).populate('studentId', 'name regNumber');
    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

// ✅ GET: Get attendance for a student
const getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const records = await Attendance.find({ studentId }).populate('sessionId', 'date timeSlot');
    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch student attendance' });
  }
};

// ✅ GET: Export to Excel
const exportAttendance = async (req, res) => {
  try {
    const { batch, from, to } = req.query;

    if (!batch || !from || !to) {
      return res.status(400).json({ message: 'batch, from, and to are required' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    const sessions = await Session.find({
      batchId: batch,
      date: { $gte: fromDate, $lte: toDate }
    });

    const sessionIds = sessions.map(s => s._id);

    const attendanceRecords = await Attendance.find({
      sessionId: { $in: sessionIds }
    }).populate('studentId sessionId');

    const data = attendanceRecords.map(record => ({
      StudentName: record.studentId.name,
      RollNo: record.studentId.rollNo,
      SessionDate: new Date(record.sessionId.date).toLocaleDateString(),
      TimeSlot: record.sessionId.timeSlot,
      SlotNumber: record.sessionId.slotNumber,
      Status: record.status
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=attendance.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Export Attendance Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const getBatchStats = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Step 1: First find the batch by name (if batchId is a string) or by ID
    let batch;
    if (mongoose.Types.ObjectId.isValid(batchId)) {
      batch = await Batch.findById(batchId);
    } else {
      batch = await Batch.findOne({ name: batchId });
    }

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Step 2: Get sessions in that batch using the batch ID
    const sessions = await Session.find({ batchId: batch._id });
    const sessionIds = sessions.map(s => s._id);
    const totalSessions = sessionIds.length;

    if (totalSessions === 0) {
      return res.status(404).json({ message: 'No sessions found for this batch' });
    }

    // Step 2: Fetch all attendance in those sessions
    const records = await Attendance.find({ sessionId: { $in: sessionIds } }).populate('studentId');

    // Step 3: Aggregate attendance per student
    const stats = {};
    records.forEach(r => {
      const id = r.studentId._id;
      if (!stats[id]) {
        stats[id] = {
          name: r.studentId.name,
          regNumber: r.studentId.regNumber,
          attended: 0
        };
      }
      if (r.status === 'Present') {
        stats[id].attended += 1;
      }
    });

    // Step 4: Format and sort
    const allStats = Object.values(stats).map(s => ({
      name: s.name,
      regNumber: s.regNumber,
      attended: s.attended,
      totalSessions,
      percentage: ((s.attended / totalSessions) * 100).toFixed(2)
    }));

    const topRegulars = [...allStats].sort((a, b) => b.percentage - a.percentage).slice(0, 3);

    res.json({ totalSessions, allStats, topRegulars });
  } catch (err) {
    console.error('Batch Stats Error:', err);
    res.status(500).json({ error: 'Failed to fetch batch stats' });
  }
};

module.exports = {
  markAttendance,
  getSessionAttendance,
  getStudentAttendance,
  exportAttendance,
  getBatchStats 
};