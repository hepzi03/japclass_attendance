const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  regNumber: {
    type: String,
    required: true,
    unique: true,
  },
  batchName: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);
