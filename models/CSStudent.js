const mongoose = require('mongoose');

const csStudentSchema = new mongoose.Schema({
    regNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        index: true
    },
    batchName: {
        type: String,
        required: true,
        index: true
    },
    email: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    ipHistory: [{
        ip: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        userAgent: String,
        deviceInfo: String
    }],
    lastAttendance: {
        type: Date,
        default: null
    },
    totalAttendance: {
        type: Number,
        default: 0
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Index for batch-based queries
csStudentSchema.index({ batchName: 1, isActive: 1 });

// Index for attendance queries
csStudentSchema.index({ lastAttendance: -1 });

// Index for IP history queries
csStudentSchema.index({ 'ipHistory.ip': 1 });

module.exports = mongoose.model('CSStudent', csStudentSchema);
