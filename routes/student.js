const express = require('express');
const router = express.Router();

// Destructure all needed controllers
const {
  addStudent,
  getAllStudents,
  getStudentsByBatchAndLevel
} = require('../controllers/studentController');

// POST: Add a student
router.post('/add', addStudent);

// GET: Get all students
router.get('/all', getAllStudents);

// GET: Get students by batch and level
router.get('/:batchName/:level', getStudentsByBatchAndLevel);



module.exports = router;
