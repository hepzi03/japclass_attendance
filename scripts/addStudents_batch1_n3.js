const mongoose = require('mongoose');
const Student = require('../models/Student'); // adjust path if needed
require('dotenv').config();

const students =


async function addStudents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/japclass_attendance');
    console.log('✅ Connected to DB');

    const studentsWithBatch = students.map((s) => ({
      ...s,
      batchName: 'Batch 1',
      level: 'N3',
    }));

    await Student.insertMany(studentsWithBatch);
    console.log('✅ Students inserted successfully');

    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error inserting students:', err.message);
    mongoose.disconnect();
  }
}

addStudents();
