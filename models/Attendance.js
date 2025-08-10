const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true
  },
  sessionObjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  regNumber: {
    type: String,
    required: true
  },
  batchId: {
    type: String,
    required: true // e.g., "Batch 1 - N5"
  },
  date: {
    type: Date,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ip: {
    type: String,
    required: true
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    browser: String
  },
  status: {
    type: String,
    enum: ['Present', 'Absent'],
    default: 'Present'
  },
  isVpnDetected: {
    type: Boolean,
    default: false
  },
  studentLocation: {
    latitude: Number,
    longitude: Number,
    accuracy: Number
  },
  distanceFromClass: {
    type: Number,
    description: 'Distance in meters from class location'
  }
}, { timestamps: true });

// Compound index to prevent duplicate attendance from same IP for same session
attendanceSchema.index({ sessionId: 1, ip: 1 }, { unique: true });

// Compound index to prevent duplicate attendance from same student for same session
attendanceSchema.index({ sessionId: 1, regNumber: 1 }, { unique: true });

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
