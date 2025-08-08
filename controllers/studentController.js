const Student = require('../models/Student');

// @desc    Add a new student
// @route   POST /api/student/add
const addStudent = async (req, res) => {
  try {
    const { name, regNumber, batchName, level } = req.body;

    if (!name || !regNumber || !batchName || !level) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await Student.findOne({ regNumber });
    if (existing) {
      return res.status(409).json({ error: 'Student with this registration number already exists' });
    }

    const student = await Student.create({ name, regNumber, batchName, level });

    res.status(201).json({ message: 'Student added successfully', student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while adding student' });
  }
};

// @desc    Get all students
// @route   GET /api/student/all
const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 }); // latest first
    res.status(200).json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching students' });
  }
};

// @desc    Get students by batch and level
// @route   GET /api/students/:batchName/:level
const getStudentsByBatchAndLevel = async (req, res) => {
  const { batchName, level } = req.params;

  try {
    const students = await Student.find({ batchName, level });

    res.json({
      batchName,
      level,
      studentCount: students.length,
      students: students.map(({ name, regNumber }) => ({ name, regNumber }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
};


// ✅ Only this ONE export!
module.exports = {
  addStudent,
  getAllStudents,
  getStudentsByBatchAndLevel
};
