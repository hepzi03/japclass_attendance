const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  level: {
    type: String,
    required: true // N5, N4, N3
  },
  studentCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Compound index to ensure unique combination of name and level
batchSchema.index({ name: 1, level: 1 }, { unique: true });

module.exports = mongoose.models.Batch || mongoose.model('Batch', batchSchema);
