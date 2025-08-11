const mongoose = require('mongoose');

const csSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    batchName: {
        type: String,
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    timeSlot: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    coordinates: {
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        }
    },
    maxDistance: {
        type: Number,
        default: 200, // meters
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    notes: {
        type: String,
        default: ''
    },
    createdBy: {
        type: String,
        default: 'CS Teacher'
    },
    qrCode: {
        type: String,
        default: ''
    },
    attendanceCount: {
        type: Number,
        default: 0
    },
    totalStudents: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for active sessions
csSessionSchema.index({ isActive: 1, date: -1 });

// Index for batch-based queries
csSessionSchema.index({ batchName: 1, date: -1 });

module.exports = mongoose.model('CSSession', csSessionSchema);
