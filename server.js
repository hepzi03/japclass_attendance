const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const attendanceRoutes = require('./routes/attendance');
const sessionRoutes = require('./routes/session');
require('dotenv').config();

const app = express();

// Trust proxy for Render deployment
app.set('trust proxy', 1);

// Middleware
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'https://japclass-attendance-1.onrender.com',
  'https://japclass-attendance.onrender.com',
  'https://japclass-attendance-1.onrender.com', // Frontend domain
]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Debug CORS requests
      console.log('🌐 CORS request from origin:', origin);
      
      // Allow non-browser requests with no origin (like health checks)
      if (!origin) {
        console.log('✅ Allowing request with no origin (health check)');
        return callback(null, true);
      }
      
      if (allowedOrigins.has(origin)) {
        console.log('✅ CORS allowed for origin:', origin);
        return callback(null, true);
      }
      
      console.log('❌ CORS blocked for origin:', origin);
      return callback(new Error(`CORS: Origin not allowed: ${origin}`));
    },
    credentials: true,
  })
);

// Handle preflight requests for all routes
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Routes
app.use('/api/student', require('./routes/student'));
app.use('/api/batch', require('./routes/batch'));
app.use('/api/attendance', attendanceRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/qr', require('./routes/qrAttendance'));

// CS Routes
app.use('/api/cs', require('./routes/csQrAttendance'));

//app.use('/api/session', require('./routes/session'));


// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Japanese Class Attendance API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/japclass_attendance', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
