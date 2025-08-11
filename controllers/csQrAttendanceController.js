const CSAttendance = require('../models/CSAttendance');
const CSSession = require('../models/CSSession');
const CSStudent = require('../models/CSStudent');
const QRCode = require('qrcode');

// Calculate distance using Vincenty's inverse geodesic formula with fallbacks
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Vincenty's inverse geodesic formula (most accurate)
    const toRadians = (degrees) => degrees * Math.PI / 180;
    const toDegrees = (radians) => radians * 180 / Math.PI;
    
    const a = 6378137; // Earth's radius in meters (WGS84)
    const f = 1 / 298.257223563; // WGS84 flattening
    const b = a * (1 - f);
    
    const L = toRadians(lon2 - lon1);
    const U1 = Math.atan((1 - f) * Math.tan(toRadians(lat1)));
    const U2 = Math.atan((1 - f) * Math.tan(toRadians(lat2)));
    const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
    const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
    
    let lambda = L;
    let iterLimit = 100;
    
    let sinLambda, cosLambda, sinSigma, cosSigma, sigma, sinAlpha, cosSqAlpha, cos2SigmaM;
    
    do {
        sinLambda = Math.sin(lambda);
        cosLambda = Math.cos(lambda);
        sinSigma = Math.sqrt((cosU2 * sinLambda) * (cosU2 * sinLambda) +
                            (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda));
        
        if (sinSigma === 0) return 0;
        
        cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
        sigma = Math.atan2(sinSigma, cosSigma);
        sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
        cosSqAlpha = 1 - sinAlpha * sinAlpha;
        cos2SigmaM = cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha;
        
        if (isNaN(cos2SigmaM)) cos2SigmaM = 0;
        
        const C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
        const lambdaP = lambda;
        lambda = L + (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
        
        if (Math.abs(lambda - lambdaP) <= 1e-12) break;
    } while (--iterLimit > 0);
    
    if (iterLimit === 0) {
        // Fallback to Haversine if Vincenty fails
        const R = 6371000; // Earth's radius in meters
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    const uSq = cosSqAlpha * (a * a - b * b) / (b * b);
    const A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    const B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
    const deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
                                B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
    
    return b * A * (sigma - deltaSigma);
};

// Validate location with configurable max distance
const validateLocation = (sessionCoords, studentCoords, maxDistance = null) => {
    if (!sessionCoords || !studentCoords) return false;
    
    const distance = calculateDistance(
        sessionCoords.latitude, sessionCoords.longitude,
        studentCoords.latitude, studentCoords.longitude
    );
    
    // Use environment variable or default to 300m
    const maxAllowedDistance = maxDistance || process.env.MAX_ATTENDANCE_DISTANCE || 300;
    
    // Subtract GPS accuracy from max distance for more lenient validation
    const adjustedMaxDistance = maxAllowedDistance - (studentCoords.accuracy || 0);
    
    return {
        isValid: distance <= adjustedMaxDistance,
        distance: Math.round(distance),
        maxAllowed: adjustedMaxDistance
    };
};

// Mark attendance for CS student
const markAttendance = async (req, res) => {
    try {
        const { session_id, reg_number, student_name, batch_name, latitude, longitude, accuracy } = req.body;
        
        if (!session_id || !reg_number || !student_name || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Get client IP address
        const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
        const userAgent = req.headers['user-agent'] || '';

        // Validate session exists and is active
        const session = await CSSession.findOne({ sessionId: session_id, isActive: true });
        if (!session) {
            return res.status(400).json({
                success: false,
                message: 'Session not found or already ended'
            });
        }

        // Validate student exists in CS2023 collection
        const student = await CSStudent.findOne({ regNumber: reg_number });
        if (!student) {
            return res.status(400).json({
                success: false,
                message: 'Student not found in CS2023 batch'
            });
        }

        // Check for duplicate attendance
        const existingAttendance = await CSAttendance.findOne({ 
            sessionId: session_id, 
            regNumber: reg_number 
        });
        
        if (existingAttendance) {
            return res.status(400).json({
                success: false,
                message: 'Attendance already marked for this student in this session'
            });
        }

        // Validate location
        const studentCoords = { latitude: parseFloat(latitude), longitude: parseFloat(longitude), accuracy: parseFloat(accuracy) || 0 };
        const locationValidation = validateLocation(session.coordinates, studentCoords, session.maxDistance);

        if (!locationValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: `Student is ${locationValidation.distance}m away from class location (max: ${locationValidation.maxAllowed}m)`
            });
        }

        // Use provided batch_name or default to CS2023 for existing students
        const actualBatchName = batch_name || 'CS2023';

        // Create attendance record
        const attendance = new CSAttendance({
            sessionId: session_id,
            regNumber: reg_number,
            studentName: student_name,
            batchName: actualBatchName,
            ip: clientIP,
            userAgent: userAgent,
            coordinates: studentCoords,
            location: `${latitude}, ${longitude}`,
            distance: locationValidation.distance,
            isWithinRange: true,
            deviceInfo: `${userAgent} | IP: ${clientIP}`,
            notes: 'CS Attendance'
        });

        await attendance.save();

        // Update session attendance count
        await CSSession.findByIdAndUpdate(session._id, {
            $inc: { attendanceCount: 1 }
        });

        res.json({
            success: true,
            message: 'Attendance marked successfully',
            data: {
                studentName: student_name,
                regNumber: reg_number,
                sessionId: session_id,
                timestamp: attendance.timestamp,
                distance: locationValidation.distance,
                ipAddress: clientIP,
                securityStatus: 'Tier 1: IP captured and tracked'
            }
        });

    } catch (error) {
        console.error('Error marking CS attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get all CS sessions
const getAllSessions = async (req, res) => {
    try {
        const { showEnded = 'false' } = req.query;
        
        let query = {};
        if (showEnded === 'false') {
            query.isActive = true;
        }
        
        const sessions = await CSSession.find(query).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            data: sessions
        });
    } catch (error) {
        console.error('Error fetching CS sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Create new CS session
const createSession = async (req, res) => {
    try {
        const { batchName, date, timeSlot, location, latitude, longitude, maxDistance, notes } = req.body;
        
        if (!batchName || !date || !timeSlot || !location || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Generate unique session ID
        const sessionId = `CS_${batchName}_${Date.now()}`;
        
        // Generate QR code
        const qrData = JSON.stringify({
            sessionId,
            batchName,
            date,
            timeSlot,
            location,
            coordinates: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
            maxDistance: parseFloat(maxDistance) || 200
        });
        
        const qrCode = await QRCode.toDataURL(qrData);
        
        // Get student count for this batch
        const studentCount = await CSStudent.countDocuments();
        
        const session = new CSSession({
            sessionId,
            batchName,
            date: new Date(date),
            timeSlot,
            location,
            coordinates: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
            maxDistance: parseFloat(maxDistance) || 200,
            notes: notes || '',
            qrCode,
            totalStudents: studentCount
        });

        await session.save();

        res.json({
            success: true,
            message: 'CS Session created successfully',
            data: {
                sessionId,
                qrCode,
                sessionDetails: session
            }
        });

    } catch (error) {
        console.error('Error creating CS session:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// End CS session
const endSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const session = await CSSession.findOneAndUpdate(
            { sessionId, isActive: true },
            { isActive: false },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found or already ended'
            });
        }

        res.json({
            success: true,
            message: 'CS Session ended successfully',
            data: session
        });

    } catch (error) {
        console.error('Error ending CS session:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Delete CS session permanently
const deleteSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // Delete session
        const session = await CSSession.findOneAndDelete({ sessionId });
        
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Delete all attendance records for this session
        await CSAttendance.deleteMany({ sessionId });

        res.json({
            success: true,
            message: 'CS Session deleted successfully',
            data: { sessionId }
        });

    } catch (error) {
        console.error('Error deleting CS session:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get attendance for a specific session
const getSessionAttendance = async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const attendance = await CSAttendance.find({ sessionId }).sort({ timestamp: -1 });
        
        res.json({
            success: true,
            data: attendance
        });

    } catch (error) {
        console.error('Error fetching session attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get student IP history (for security monitoring)
const getStudentIPHistory = async (req, res) => {
    try {
        const { regNumber } = req.params;
        
        const attendance = await CSAttendance.find({ regNumber })
            .select('ip userAgent timestamp deviceInfo')
            .sort({ timestamp: -1 })
            .limit(10);
        
        res.json({
            success: true,
            data: attendance
        });

    } catch (error) {
        console.error('Error fetching student IP history:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    markAttendance,
    getAllSessions,
    createSession,
    endSession,
    deleteSession,
    getSessionAttendance,
    getStudentIPHistory,
    validateLocation,
    calculateDistance
};
