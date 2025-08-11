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

// Database connections
const connectDatabases = async () => {
  try {
    // Main database connection (Japanese Class)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/japclass_attendance', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to main MongoDB (Japanese Class)');
    
    // CS database connection
    const csConnection = mongoose.createConnection('mongodb+srv://admin:qwerty12345@cluster0.xham8.mongodb.net/CS?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    csConnection.on('connected', () => {
      console.log('✅ Connected to CS MongoDB');
    });
    
    csConnection.on('error', (err) => {
      console.error('❌ CS MongoDB connection error:', err);
    });
    
    // Make CS connection available globally for CS models
    global.csConnection = csConnection;
    
  } catch (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
};

connectDatabases();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
