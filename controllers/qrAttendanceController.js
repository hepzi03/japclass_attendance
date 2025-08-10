const mongoose = require('mongoose');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const QRCode = require('qrcode');
const axios = require('axios');
// Simple user agent parser
const rateLimit = require('express-rate-limit');

// Rate limiting for attendance marking
const attendanceRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs (increased for testing)
  message: { error: 'Too many attendance attempts from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// VPN detection using IPHub API
const detectVPN = async (ip) => {
  try {
    // Using a free IP geolocation service (you can replace with IPHub if you have API key)
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    const data = response.data;
    
    // Check for common VPN/proxy indicators
    const isVpn = data.proxy || data.hosting || data.tor || 
                  (data.org && (data.org.toLowerCase().includes('vpn') || 
                   data.org.toLowerCase().includes('proxy')));
    
    return {
      isVpn: !!isVpn,
      country: data.country,
      region: data.regionName,
      city: data.city,
      isp: data.isp,
      org: data.org
    };
  } catch (error) {
    console.error('VPN detection error:', error);
    return { isVpn: false, error: 'Detection failed' };
  }
};

// Calculate distance between two GPS coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Convert degrees to radians
  const lat1Rad = lat1 * Math.PI / 180;
  const lon1Rad = lon1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const lon2Rad = lon2 * Math.PI / 180;

  // Haversine formula
  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Earth's radius in meters
  const R = 6371000;
  
  return R * c; // Distance in meters
};

// Validate student location against session location
const validateLocation = (sessionLocation, studentLocation, maxDistance = null) => {
  // Use environment variable if not specified, default to 200m
  const maxAllowedDistance = maxDistance || parseInt(process.env.MAX_ATTENDANCE_DISTANCE) || 200;
  if (!sessionLocation || !studentLocation) {
    return { valid: false, error: 'Location data missing' };
  }

  // Debug logging
  console.log('📍 Location Validation Debug:');
  console.log(`   Session Location: ${sessionLocation.latitude}, ${sessionLocation.longitude}`);
  console.log(`   Student Location: ${studentLocation.latitude}, ${studentLocation.longitude}`);

  const distance = calculateDistance(
    sessionLocation.latitude,
    sessionLocation.longitude,
    studentLocation.latitude,
    studentLocation.longitude
  );

  console.log(`   Calculated Distance: ${Math.round(distance)}m (Max allowed: ${maxAllowedDistance}m)`);

  return {
    valid: distance <= maxAllowedDistance,
    distance: Math.round(distance),
    maxDistance: maxAllowedDistance,
    error: distance > maxAllowedDistance ? `Student is ${Math.round(distance)}m away from class location (max: ${maxAllowedDistance}m)` : null
  };
};

// Get device information
const getDeviceInfo = (userAgent) => {
  // Simple user agent parsing
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
  const isChrome = /Chrome/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !isChrome;
  
  let browser = 'Unknown';
  if (isChrome) browser = 'Chrome';
  else if (isFirefox) browser = 'Firefox';
  else if (isSafari) browser = 'Safari';
  
  return {
    userAgent: userAgent,
    platform: isMobile ? 'Mobile' : 'Desktop',
    browser: browser
  };
};

// Fallback student data (in case test database is not available)
const fallbackStudents = {
  'Batch 1 - N5': [
    { name: 'John Doe', regNumber: '2024001' },
    { name: 'Jane Smith', regNumber: '2024002' },
    { name: 'Mike Johnson', regNumber: '2024003' }
  ],
  'Batch 2 - N4': [
    { name: 'Alice Brown', regNumber: '2024004' },
    { name: 'Bob Wilson', regNumber: '2024005' },
    { name: 'Carol Davis', regNumber: '2024006' }
  ],
  'Batch 3 - N4': [
    { name: 'David Miller', regNumber: '2024007' },
    { name: 'Emma Garcia', regNumber: '2024008' },
    { name: 'Frank Rodriguez', regNumber: '2024009' }
  ]
};

// Helper function to find student in fallback data
const findStudentInFallback = (regNumber, batchName) => {
  const students = fallbackStudents[batchName];
  if (!students) return null;
  return students.find(student => student.regNumber === regNumber);
};

// Get students for a specific batch
const getBatchStudents = async (req, res) => {
  let testConnection = null;
  
  try {
    const { batchName } = req.params;
    
    if (!batchName) {
      return res.status(400).json({ error: 'Batch name is required' });
    }

    // Connect to test database for student data with timeout
    const testUri = process.env.MONGODB_URI.replace('/japclass_attendance', '/test');
    
    testConnection = mongoose.createConnection(testUri, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 10000, // 10 second socket timeout
      connectTimeoutMS: 10000, // 10 second connection timeout
      maxPoolSize: 1 // Limit connections
    });

    // Wait for connection to be ready
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Database connection timeout'));
      }, 10000);

      testConnection.once('connected', () => {
        clearTimeout(timeout);
        resolve();
      });

      testConnection.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    const TestStudent = testConnection.model('Student', new mongoose.Schema({
      name: String,
      regNumber: String,
      batchName: String,
      level: String
    }));

    // Find students that belong to this batch
    // The batchName parameter comes as "Batch 4 - N5" from the session
    // We need to match students with batchName: "Batch 4" and level: "N5"
    const [batchNamePart, levelPart] = batchName.split(' - ');
    
    const students = await TestStudent.find({
      batchName: batchNamePart,
      level: levelPart
    }).select('name regNumber').sort({ name: 1 }).maxTimeMS(5000); // 5 second query timeout

    if (!students || students.length === 0) {
      return res.status(404).json({ error: 'No students found for this batch' });
    }

    res.json({
      success: true,
      students: students.map(student => ({
        name: student.name,
        regNumber: student.regNumber
      }))
    });
  } catch (error) {
    console.error('Get batch students error:', error);
    
    // Try fallback data if database fails
    const fallbackData = fallbackStudents[req.params.batchName];
    
            if (fallbackData && fallbackData.length > 0) {
          res.json({
            success: true,
            students: fallbackData,
            note: 'Using fallback data (database unavailable)'
          });
        } else {
      // Provide more specific error messages
      if (error.message.includes('timeout')) {
        res.status(500).json({ error: 'Database connection timeout. Please try again.' });
      } else if (error.message.includes('ECONNREFUSED')) {
        res.status(500).json({ error: 'Cannot connect to database. Please check if the database is running.' });
      } else {
        res.status(500).json({ error: 'Failed to get batch students. Please try again.' });
      }
    }
  } finally {
    // Always close the connection
    if (testConnection) {
      try {
        await testConnection.close();
      } catch (closeError) {
        console.error('Error closing test database connection:', closeError);
      }
    }
  }
};

// Create a new attendance session
const createSession = async (req, res) => {
  try {
    const { batchId, date, timeSlot, notes, location } = req.body;

    // Validate required fields
    if (!batchId || !date || !timeSlot) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate location
    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({ error: 'Location is required for session creation' });
    }

    // Get batch information
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const batchName = `${batch.name} - ${batch.level}`;

    // Create session
    
    // Ensure date is properly parsed
    let sessionDate;
    try {
      sessionDate = new Date(date);
      if (isNaN(sessionDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      console.error('Error parsing date:', error);
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    const session = new Session({
      batchId,
      batchName,
      date: sessionDate,
      timeSlot,
      notes,
      location
    });

    await session.save();

    // Generate QR code pointing to the deployed frontend.
    // Priority: explicit env FRONTEND_URL > request origin (from deployed frontend) > localhost
    const frontendBaseUrl =
      process.env.FRONTEND_URL ||
      (req && req.headers && req.headers.origin) ||
      'http://localhost:3000';

    const qrUrl = `${frontendBaseUrl.replace(/\/$/, '')}/mark-attendance?session_id=${session.sessionId}`;
    const qrCode = await QRCode.toDataURL(qrUrl);

    res.json({
      success: true,
      session: {
        id: session._id,
        sessionId: session.sessionId,
        batchName: session.batchName,
        date: session.date ? session.date.toISOString() : null,
        timeSlot: session.timeSlot,
        qrCode
      }
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
};

// Get session information for QR code
const getSessionInfo = async (req, res) => {
  try {
    const { session_id } = req.params;

    const session = await Session.findOne({ sessionId: session_id, isActive: true })
      .populate('batchId');

    if (!session) {
      return res.status(404).json({ error: 'Session not found or inactive' });
    }

    res.json({
      session: {
        sessionId: session.sessionId,
        batchName: session.batchName,
        date: session.date,
        timeSlot: session.timeSlot
      }
    });
  } catch (error) {
    console.error('Get session info error:', error);
    res.status(500).json({ error: 'Failed to get session information' });
  }
};

// Mark attendance
const markAttendance = async (req, res) => {
  try {
    const { session_id, regNumber, location } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

    // Validate session
    const session = await Session.findOne({ sessionId: session_id, isActive: true });
    if (!session) {
      return res.status(404).json({ error: 'Session not found or inactive' });
    }

    // Validate student location
    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({ error: 'Location access is required to mark attendance' });
    }

    const locationValidation = validateLocation(session.location, location);
    if (!locationValidation.valid) {
      return res.status(403).json({ 
        error: locationValidation.error,
        details: {
          distance: locationValidation.distance,
          maxDistance: locationValidation.maxDistance
        }
      });
    }

    // Connect to test database for student data with timeout
    let testConnection = null;
    try {
      const testUri = process.env.MONGODB_URI.replace('/japclass_attendance', '/test');
      
      testConnection = mongoose.createConnection(testUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        maxPoolSize: 1
      });

      // Wait for connection to be ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Database connection timeout'));
        }, 10000);

        testConnection.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });

        testConnection.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      const TestStudent = testConnection.model('Student', new mongoose.Schema({
        name: String,
        regNumber: String,
        batchName: String,
        level: String
      }));

      // Find student by registration number
      const student = await TestStudent.findOne({ regNumber }).maxTimeMS(5000);
      if (!student) {
        return res.status(404).json({ error: 'Student not found with this registration number' });
      }

      // Check if student belongs to the session batch
      const [batchNamePart, levelPart] = session.batchName.split(' - ');
      if (student.batchName !== batchNamePart || student.level !== levelPart) {
        return res.status(403).json({ error: 'Student does not belong to this batch' });
      }

      // Store student data for later use
      const studentData = {
        _id: student._id,
        name: student.name,
        regNumber: student.regNumber
      };

      // Close the test database connection
      await testConnection.close();
      testConnection = null;

      // Continue with the rest of the function using studentData
      // VPN detection
      const vpnInfo = await detectVPN(clientIP);
      if (vpnInfo.isVpn) {
        return res.status(403).json({ 
          error: 'VPN detected. Disable VPN to continue.',
          details: vpnInfo
        });
      }

      // Check for existing attendance from same IP
      const existingAttendanceFromIP = await Attendance.findOne({ 
        sessionId: session_id, 
        ip: clientIP 
      });

      if (existingAttendanceFromIP) {
        // If same IP but different student, reject
        if (existingAttendanceFromIP.regNumber !== regNumber) {
          return res.status(403).json({ 
            error: 'Attendance already marked from this IP with a different registration number' 
          });
        }
        // If same student from same IP, allow but don't create duplicate
        return res.json({ 
          success: true, 
          message: 'Attendance already marked for this student from this device',
          attendance: existingAttendanceFromIP
        });
      }

      // Check if this student has already marked attendance for this session (from any device/IP)
      const existingStudentAttendance = await Attendance.findOne({ 
        sessionId: session_id, 
        regNumber: regNumber 
      });

      if (existingStudentAttendance) {
        return res.status(403).json({ 
          error: 'Attendance already marked for this student in this session',
          attendance: existingStudentAttendance
        });
      }

      // Get device information
      const deviceInfo = getDeviceInfo(req.headers['user-agent']);

      // Create attendance record
      const attendance = new Attendance({
        sessionId: session_id,
        sessionObjectId: session._id,
        studentId: studentData._id,
        name: studentData.name,
        regNumber: studentData.regNumber,
        batchId: session.batchName,
        date: session.date,
        ip: clientIP,
        deviceInfo,
        isVpnDetected: vpnInfo.isVpn,
        studentLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        },
        distanceFromClass: locationValidation.distance
      });

      await attendance.save();

      res.json({
        success: true,
        message: 'Attendance marked successfully',
        attendance: {
          name: attendance.name,
          regNumber: attendance.regNumber,
          batchId: attendance.batchId,
          timestamp: attendance.timestamp
        }
      });
    } catch (error) {
      console.error('Mark attendance error:', error);
      
      // Try fallback data if database fails
      if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        const fallbackStudent = findStudentInFallback(regNumber, session.batchName);
        
        if (fallbackStudent) {
          
          // Continue with fallback student data
          const studentData = {
            _id: new mongoose.Types.ObjectId(), // Generate a temporary ID
            name: fallbackStudent.name,
            regNumber: fallbackStudent.regNumber
          };

          // VPN detection
          const vpnInfo = await detectVPN(clientIP);
          if (vpnInfo.isVpn) {
            return res.status(403).json({ 
              error: 'VPN detected. Disable VPN to continue.',
              details: vpnInfo
            });
          }

          // Check for existing attendance from same IP
          const existingAttendanceFromIP = await Attendance.findOne({ 
            sessionId: session_id, 
            ip: clientIP 
          });

          if (existingAttendanceFromIP) {
            // If same IP but different student, reject
            if (existingAttendanceFromIP.regNumber !== regNumber) {
              return res.status(403).json({ 
                error: 'Attendance already marked from this IP with a different registration number' 
              });
            }
            // If same student from same IP, allow but don't create duplicate
            return res.json({ 
              success: true, 
              message: 'Attendance already marked for this student from this device',
              attendance: existingAttendanceFromIP
            });
          }

          // Check if this student has already marked attendance for this session (from any device/IP)
          const existingStudentAttendance = await Attendance.findOne({ 
            sessionId: session_id, 
            regNumber: regNumber 
          });

          if (existingStudentAttendance) {
            return res.status(403).json({ 
              error: 'Attendance already marked for this student in this session',
              attendance: existingStudentAttendance
            });
          }

          // Get device information
          const deviceInfo = getDeviceInfo(req.headers['user-agent']);

          // Create attendance record
          const attendance = new Attendance({
            sessionId: session_id,
            sessionObjectId: session._id,
            studentId: studentData._id,
            name: studentData.name,
            regNumber: studentData.regNumber,
            batchId: session.batchName,
            date: session.date,
            ip: clientIP,
            deviceInfo,
            isVpnDetected: vpnInfo.isVpn,
            studentLocation: {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy
            },
            distanceFromClass: locationValidation.distance
          });

          await attendance.save();

          res.json({
            success: true,
            message: 'Attendance marked successfully (using fallback data)',
            attendance: {
              name: attendance.name,
              regNumber: attendance.regNumber,
              batchId: attendance.batchId,
              timestamp: attendance.timestamp
            }
          });
          return;
        }
      }
      
      // Provide specific error messages
      if (error.message.includes('timeout')) {
        return res.status(500).json({ error: 'Database connection timeout. Please try again.' });
      } else if (error.message.includes('ECONNREFUSED')) {
        return res.status(500).json({ error: 'Cannot connect to database. Please check if the database is running.' });
      } else if (error.code === 11000) {
        return res.status(409).json({ error: 'Attendance already marked from this IP' });
      } else {
        return res.status(500).json({ error: 'Failed to mark attendance. Please try again.' });
      }
    } finally {
      // Always close the connection
      if (testConnection) {
        try {
          await testConnection.close();
        } catch (closeError) {
          console.error('Error closing test database connection:', closeError);
        }
      }
    }
  } catch (error) {
    console.error('Mark attendance error:', error);
    
    // Provide specific error messages
    if (error.message.includes('timeout')) {
      return res.status(500).json({ error: 'Database connection timeout. Please try again.' });
    } else if (error.message.includes('ECONNREFUSED')) {
      return res.status(500).json({ error: 'Cannot connect to database. Please check if the database is running.' });
    } else if (error.code === 11000) {
      return res.status(409).json({ error: 'Attendance already marked from this IP' });
    } else {
      return res.status(500).json({ error: 'Failed to mark attendance. Please try again.' });
    }
  }
};

// Get attendance for a session
const getSessionAttendance = async (req, res) => {
  try {
    const { session_id } = req.params;

    const attendance = await Attendance.find({ sessionId: session_id })
      .sort({ timestamp: 1 });

    res.json({
      success: true,
      attendance
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to get attendance' });
  }
};

// Get all sessions with attendance data
const getAllSessions = async (req, res) => {
  try {
    const { batchId, date, showEnded } = req.query;
    let query = {};
    
    // Only filter by isActive if explicitly requested, otherwise show all sessions
    if (showEnded === 'false') {
      query.isActive = true;
    }

    if (batchId) query.batchId = batchId;
    if (date) query.date = { $gte: new Date(date), $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000) };

    const sessions = await Session.find(query)
      .populate('batchId')
      .sort({ date: -1, createdAt: -1 });

    // Get attendance count for each session
    const sessionsWithAttendance = await Promise.all(
      sessions.map(async (session) => {
        const attendanceCount = await Attendance.countDocuments({ sessionId: session.sessionId });
        return {
          ...session.toObject(),
          attendanceCount
        };
      })
    );

    res.json({
      success: true,
      sessions: sessionsWithAttendance
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
};

// Export attendance as Excel
const exportAttendanceExcel = async (req, res) => {
  try {
    const { session_id } = req.params;

    const attendance = await Attendance.find({ sessionId: session_id })
      .sort({ timestamp: 1 });

    if (attendance.length === 0) {
      return res.status(404).json({ error: 'No attendance records found' });
    }

    const session = await Session.findOne({ sessionId: session_id });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Create Excel data
    const excelData = [
      ['Name', 'Registration Number', 'Batch', 'Date', 'Time', 'Device Info', 'Timestamp']
    ];

    attendance.forEach(record => {
      excelData.push([
        record.name,
        record.regNumber,
        record.batchId,
        session.date.toLocaleDateString(),
        session.timeSlot,
        `${record.deviceInfo.browser} on ${record.deviceInfo.platform}`,
        record.timestamp.toLocaleString()
      ]);
    });

    // Create Excel file
    const XLSX = require('xlsx');
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${session_id}.xlsx`);
    res.send(excelBuffer);

  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({ error: 'Failed to export attendance' });
  }
};

// Export attendance as PDF
const exportAttendancePDF = async (req, res) => {
  try {
    const { session_id } = req.params;

    const attendance = await Attendance.find({ sessionId: session_id })
      .sort({ timestamp: 1 });

    if (attendance.length === 0) {
      return res.status(404).json({ error: 'No attendance records found' });
    }

    const session = await Session.findOne({ sessionId: session_id });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${session_id}.pdf`);

    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Attendance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Batch: ${session.batchName}`, { align: 'center' });
    doc.fontSize(12).text(`Date: ${session.date.toLocaleDateString()}`, { align: 'center' });
    doc.fontSize(12).text(`Time: ${session.timeSlot}`, { align: 'center' });
    doc.moveDown();

    // Add table headers
    const headers = ['Name', 'Reg Number', 'Time'];
    const colWidths = [200, 150, 120];
    let y = doc.y;

    headers.forEach((header, i) => {
      doc.rect(50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, colWidths[i], 20).stroke();
      doc.text(header, 55 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y + 5);
    });

    y += 25;

    // Add attendance data
    attendance.forEach((record, index) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      const data = [
        record.name,
        record.regNumber,
        record.timestamp.toLocaleTimeString()
      ];

      data.forEach((text, i) => {
        doc.rect(50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, colWidths[i], 20).stroke();
        doc.text(text, 55 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y + 5);
      });

      y += 25;
    });

    doc.end();

  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ error: 'Failed to export attendance' });
  }
};

// End a session (deactivate without deleting)
const endSession = async (req, res) => {
  try {
    const { session_id } = req.params;

    // Find the session
    const session = await Session.findOne({ sessionId: session_id });
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Session not found' 
      });
    }

    // Check if session is already ended
    if (!session.isActive) {
      return res.status(400).json({ 
        success: false, 
        error: 'Session is already ended' 
      });
    }

    // End the session by setting isActive to false
    await Session.findOneAndUpdate(
      { sessionId: session_id },
      { isActive: false },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Session ended successfully. QR code is now disabled.'
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to end session' 
    });
  }
};

// Delete a session
const deleteSession = async (req, res) => {
  try {
    const { session_id } = req.params;

    // Find the session
    const session = await Session.findOne({ sessionId: session_id });
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Session not found' 
      });
    }

    // Delete all attendance records for this session
    await Attendance.deleteMany({ sessionId: session_id });

    // Delete the session (soft delete by setting isActive to false)
    await Session.findOneAndUpdate(
      { sessionId: session_id },
      { isActive: false },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete session' 
    });
  }
};

module.exports = {
  createSession,
  getSessionInfo,
  markAttendance,
  getSessionAttendance,
  getAllSessions,
  exportAttendanceExcel,
  exportAttendancePDF,
  attendanceRateLimit,
  getBatchStudents,
  deleteSession,
  endSession
}; 