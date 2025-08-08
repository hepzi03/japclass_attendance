// controllers/sessionController.js
const mongoose = require('mongoose');
delete mongoose.connection.models['Session']; // 💥 Fix overwrite or stale model
const Session = require('../models/Session');

const createSession = async (req, res) => {
  try {
    const { slotNumber, timeSlot, date, batchId } = req.body;

    // Check for required fields
    if (!slotNumber || !timeSlot || !date || !batchId) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check for duplicate session (optional but good to have)
    const existingSession = await Session.findOne({ slotNumber, date, batchId });
    if (existingSession) {
      return res.status(409).json({ message: 'Session already exists for this slot/date/batch' });
    }

    const newSession = new Session({ slotNumber, timeSlot, date, batchId });
    await newSession.save();

    res.status(201).json({ message: 'Session created successfully', session: newSession });
  } catch (error) {
    console.error('Create Session Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { createSession };
