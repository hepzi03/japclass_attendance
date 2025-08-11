const mongoose = require('mongoose');

const csStudentSchema = new mongoose.Schema({
    regNumber: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    // Using existing CS2023 collection structure - no additional fields needed
}, { 
    timestamps: true,
    collection: 'CS2023' // Use existing collection
});

// Index for efficient queries
csStudentSchema.index({ regNumber: 1 });
csStudentSchema.index({ name: 1 });

// Use CS database connection if available, otherwise fall back to default
const CSStudent = global.csConnection ? 
    global.csConnection.model('CSStudent', csStudentSchema, 'CS2023') :
    mongoose.model('CSStudent', csStudentSchema, 'CS2023');

module.exports = CSStudent;
