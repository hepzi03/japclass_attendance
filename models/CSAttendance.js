const mongoose = require('mongoose');

const csAttendanceSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    regNumber: {
        type: String,
        required: true,
        index: true
    },
    studentName: {
        type: String,
        required: true
    },
    batchName: {
        type: String,
        required: true,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    ip: {
        type: String,
        required: true,
        index: true
    },
    userAgent: {
        type: String,
        default: ''
    },
    coordinates: {
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        accuracy: {
            type: Number,
            default: 0
        }
    },
    location: {
        type: String,
        required: true
    },
    distance: {
        type: Number,
        default: 0
    },
    isWithinRange: {
        type: Boolean,
        default: false
    },
    deviceInfo: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Compound unique index to prevent duplicate attendance for same student in same session
csAttendanceSchema.index({ sessionId: 1, regNumber: 1 }, { unique: true });

// Index for IP-based queries
csAttendanceSchema.index({ regNumber: 1, ip: 1 });

// Index for batch-based queries
csAttendanceSchema.index({ batchName: 1, timestamp: -1 });

module.exports = mongoose.model('CSAttendance', csAttendanceSchema);
