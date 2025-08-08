// routes/sessionRoutes.js
const express = require('express');
const router = express.Router();
const { createSession } = require('../controllers/sessionController');

// POST /api/sessions
router.post('/sessions', createSession);

module.exports = router;
