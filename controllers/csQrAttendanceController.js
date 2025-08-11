const CSAttendance = require('../models/CSAttendance');
const CSSession = require('../models/CSSession');
const CSStudent = require('../models/CSStudent');
const QRCode = require('qrcode');

// Tier 1 IP Security: IP History Tracking
const updateIPHistory = async (regNumber, ip, userAgent, deviceInfo) => {
    try {
        const student = await CSStudent.findOne({ regNumber });
        if (!student) return;

        // Add new IP to history (keep last 10 IPs)
        student.ipHistory.push({
            ip,
            timestamp: new Date(),
            userAgent: userAgent || '',
            deviceInfo: deviceInfo || ''
        });

        // Keep only last 10 IPs
        if (student.ipHistory.length > 10) {
            student.ipHistory = student.ipHistory.slice(-10);
        }

        await student.save();
    } catch (error) {
        console.error('Error updating IP history:', error);
    }
};

// Tier 1 IP Security: Check for suspicious IP changes
const checkIPSuspicious = async (regNumber, newIP) => {
    try {
        const student = await CSStudent.findOne({ regNumber });
        if (!student || student.ipHistory.length === 0) return false;

        // Get last 5 IPs
        const recentIPs = student.ipHistory.slice(-5).map(h => h.ip);
        
        // If this is a completely new IP, flag as suspicious
        if (!recentIPs.includes(newIP)) {
            // Check if IP is from same subnet (basic check)
            const isSameSubnet = recentIPs.some(oldIP => {
                const oldSubnet = oldIP.split('.').slice(0, 3).join('.');
                const newSubnet = newIP.split('.').slice(0, 3).join('.');
                return oldSubnet === newSubnet;
            });

            return !isSameSubnet; // Suspicious if not from same subnet
        }

        return false;
    } catch (error) {
        console.error('Error checking IP suspicious:', error);
        return false;
    }
};

// Calculate distance between two coordinates (using Vincenty formula with fallbacks)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    try {
        // Convert to numbers and validate
        lat1 = Number(lat1);
        lon1 = Number(lon1);
        lat2 = Number(lat2);
        lon2 = Number(lon2);

        // Validate coordinate ranges
        if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90 ||
            lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
            throw new Error('Invalid coordinates');
        }

        // Vincenty's inverse geodesic formula (most accurate)
        const a = 6378137; // Earth's radius in meters
        const f = 1/298.257223563; // Flattening
        const b = a * (1 - f);
        
        const L = (lon2 - lon1) * Math.PI / 180;
        const U1 = Math.atan((1 - f) * Math.tan(lat1 * Math.PI / 180));
        const U2 = Math.atan((1 - f) * Math.tan(lat2 * Math.PI / 180));
        const sinU1 = Math.sin(U1);
        const cosU1 = Math.cos(U1);
        const sinU2 = Math.sin(U2);
        const cosU2 = Math.cos(U2);

        let lambda = L;
        let iterLimit = 100;
        let sinLambda, cosLambda, sinSigma, cosSigma, sigma, sinAlpha, cosSqAlpha, cos2SigmaM;

        do {
            sinLambda = Math.sin(lambda);
            cosLambda = Math.cos(lambda);
            sinSigma = Math.sqrt((cosU2 * sinLambda) * (cosU2 * sinLambda) +
                               (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) *
                               (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda));
            
            if (sinSigma === 0) return 0;

            cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
            sigma = Math.atan2(sinSigma, cosSigma);
            sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
            cosSqAlpha = 1 - sinAlpha * sinAlpha;
            cos2SigmaM = cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha;

            if (isNaN(cos2SigmaM)) cos2SigmaM = 0;

            const C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
            const lambdaP = lambda;
            lambda = L + (1 - C) * f * sinAlpha *
                    (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));

            if (Math.abs(lambda - lambdaP) <= 1e-12) break;
        } while (--iterLimit > 0);

        if (iterLimit === 0) {
            // Fallback to Haversine formula
            const R = 6371000; // Earth's radius in meters
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
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
    } catch (error) {
        console.error('Error in distance calculation:', error);
        // Final fallback to simple equirectangular projection
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const x = dLon * Math.cos((lat1 + lat2) * Math.PI / 360);
        const y = dLat;
        return Math.sqrt(x * x + y * y) * R;
    }
};

// Validate location (check if student is within allowed distance)
const validateLocation = (sessionCoords, studentCoords, maxDistance = null) => {
    try {
        const distance = calculateDistance(
            sessionCoords.latitude,
            sessionCoords.longitude,
            studentCoords.latitude,
            studentCoords.longitude
        );

        // Use environment variable or default
        const allowedDistance = maxDistance || process.env.MAX_ATTENDANCE_DISTANCE || 200;
        
        // Subtract GPS accuracy from calculated distance for fair comparison
        const adjustedDistance = Math.max(0, distance - (studentCoords.accuracy || 0));
        
        console.log(`CS Attendance - Distance: ${adjustedDistance.toFixed(2)}m, Max: ${allowedDistance}m, Accuracy: ${studentCoords.accuracy || 0}m`);
        
        return {
            isWithinRange: adjustedDistance <= allowedDistance,
            distance: adjustedDistance,
            maxDistance: allowedDistance
        };
    } catch (error) {
        console.error('Error in location validation:', error);
        return {
            isWithinRange: false,
            distance: Infinity,
            maxDistance: maxDistance || 200
        };
    }
};

// Mark attendance for CS student
const markAttendance = async (req, res) => {
    try {
        const { session_id, reg_number, student_name, batch_name, latitude, longitude, accuracy, location, notes } = req.body;
        
        // Get client IP address
        const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
        const userAgent = req.headers['user-agent'] || '';
        
        console.log(`CS Attendance Request - Session: ${session_id}, Student: ${reg_number}, IP: ${clientIP}`);

        // Validate required fields
        if (!session_id || !reg_number || !student_name || !batch_name || !latitude || !longitude || !location) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['session_id', 'reg_number', 'student_name', 'batch_name', 'latitude', 'longitude', 'location']
            });
        }

        // Check if session exists and is active
        const session = await CSSession.findOne({ sessionId: session_id, isActive: true });
        if (!session) {
            return res.status(404).json({
                error: 'Session not found or inactive',
                sessionId: session_id
            });
        }

        // Check if this student has already marked attendance for this session (from any device/IP)
        const existingStudentAttendance = await CSAttendance.findOne({ sessionId: session_id, regNumber: reg_number });
        if (existingStudentAttendance) {
            return res.status(403).json({
                error: 'Attendance already marked for this student in this session',
                attendance: existingStudentAttendance
            });
        }

        // Check for existing attendance from same IP (additional security)
        const existingAttendanceFromIP = await CSAttendance.findOne({ sessionId: session_id, ip: clientIP });
        if (existingAttendanceFromIP) {
            return res.status(403).json({
                error: 'Attendance already marked from this IP address for this session',
                attendance: existingAttendanceFromIP
            });
        }

        // Validate location
        const locationValidation = validateLocation(
            session.coordinates,
            { latitude, longitude, accuracy: accuracy || 0 },
            session.maxDistance
        );

        // Tier 1 IP Security: Check for suspicious IP changes
        const isIPSuspicious = await checkIPSuspicious(reg_number, clientIP);
        
        // Create attendance record
        const attendance = new CSAttendance({
            sessionId: session_id,
            regNumber: reg_number,
            studentName: student_name,
            batchName: batch_name,
            ip: clientIP,
            userAgent: userAgent,
            coordinates: {
                latitude: Number(latitude),
                longitude: Number(longitude),
                accuracy: Number(accuracy) || 0
            },
            location: location,
            distance: locationValidation.distance,
            isWithinRange: locationValidation.isWithinRange,
            deviceInfo: userAgent,
            notes: notes || ''
        });

        await attendance.save();

        // Update IP history for Tier 1 security
        await updateIPHistory(reg_number, clientIP, userAgent, userAgent);

        // Update session attendance count
        await CSSession.findOneAndUpdate(
            { sessionId: session_id },
            { $inc: { attendanceCount: 1 } }
        );

        // Update student's last attendance and total count
        await CSStudent.findOneAndUpdate(
            { regNumber: reg_number },
            { 
                lastAttendance: new Date(),
                $inc: { totalAttendance: 1 }
            }
        );

        console.log(`CS Attendance marked successfully - Session: ${session_id}, Student: ${reg_number}, IP: ${clientIP}, Distance: ${locationValidation.distance.toFixed(2)}m`);

        res.status(200).json({
            success: true,
            message: 'Attendance marked successfully',
            attendance: {
                id: attendance._id,
                sessionId: attendance.sessionId,
                regNumber: attendance.regNumber,
                studentName: attendance.studentName,
                timestamp: attendance.timestamp,
                location: attendance.location,
                distance: attendance.distance,
                isWithinRange: attendance.isWithinRange,
                ip: attendance.ip,
                isIPSuspicious: isIPSuspicious
            },
            session: {
                batchName: session.batchName,
                date: session.date,
                timeSlot: session.timeSlot,
                location: session.location
            },
            security: {
                ipTracked: true,
                ipSuspicious: isIPSuspicious,
                locationValidated: true,
                duplicatePrevented: true
            }
        });

    } catch (error) {
        console.error('Error marking CS attendance:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(403).json({
                error: 'Attendance already marked for this student in this session',
                details: 'Duplicate key constraint violation'
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
};

// Get all CS sessions
const getAllSessions = async (req, res) => {
    try {
        const { showInactive = false } = req.query;
        
        let query = {};
        if (!showInactive) {
            query.isActive = true;
        }

        const sessions = await CSSession.find(query).sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            sessions: sessions
        });
    } catch (error) {
        console.error('Error getting CS sessions:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
};

// Create new CS session
const createSession = async (req, res) => {
    try {
        const { batchName, date, timeSlot, location, latitude, longitude, maxDistance, notes } = req.body;

        if (!batchName || !date || !timeSlot || !location || !latitude || !longitude) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['batchName', 'date', 'timeSlot', 'location', 'latitude', 'longitude']
            });
        }

        const sessionId = `CS_${batchName}_${Date.now()}`;
        
        // Generate QR code
        const qrData = JSON.stringify({
            sessionId: sessionId,
            batchName: batchName,
            date: date,
            timeSlot: timeSlot,
            location: location,
            type: 'cs'
        });

        const qrCode = await QRCode.toDataURL(qrData);

        const session = new CSSession({
            sessionId: sessionId,
            batchName: batchName,
            date: new Date(date),
            timeSlot: timeSlot,
            location: location,
            coordinates: {
                latitude: Number(latitude),
                longitude: Number(longitude)
            },
            maxDistance: maxDistance || process.env.MAX_ATTENDANCE_DISTANCE || 200,
            notes: notes || '',
            qrCode: qrCode
        });

        await session.save();

        res.status(201).json({
            success: true,
            message: 'CS Session created successfully',
            session: {
                sessionId: session.sessionId,
                batchName: session.batchName,
                date: session.date,
                timeSlot: session.timeSlot,
                location: session.location,
                qrCode: session.qrCode
            }
        });

    } catch (error) {
        console.error('Error creating CS session:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
};

// End CS session
const endSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await CSSession.findOneAndUpdate(
            { sessionId: sessionId },
            { isActive: false },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({
                error: 'Session not found',
                sessionId: sessionId
            });
        }

        res.status(200).json({
            success: true,
            message: 'CS Session ended successfully',
            session: session
        });

    } catch (error) {
        console.error('Error ending CS session:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
};

// Delete CS session permanently
const deleteSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await CSSession.findOneAndDelete({ sessionId: sessionId });

        if (!session) {
            return res.status(404).json({
                error: 'Session not found',
                sessionId: sessionId
            });
        }

        // Also delete all attendance records for this session
        await CSAttendance.deleteMany({ sessionId: sessionId });

        res.status(200).json({
            success: true,
            message: 'CS Session deleted permanently',
            session: session
        });

    } catch (error) {
        console.error('Error deleting CS session:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
};

// Get attendance for a specific CS session
const getSessionAttendance = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const attendance = await CSAttendance.find({ sessionId: sessionId }).sort({ timestamp: -1 });

        res.status(200).json({
            success: true,
            sessionId: sessionId,
            attendance: attendance,
            count: attendance.length
        });

    } catch (error) {
        console.error('Error getting CS session attendance:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
};

// Get CS student IP history (for security monitoring)
const getStudentIPHistory = async (req, res) => {
    try {
        const { regNumber } = req.params;

        const student = await CSStudent.findOne({ regNumber });
        if (!student) {
            return res.status(404).json({
                error: 'Student not found',
                regNumber: regNumber
            });
        }

        res.status(200).json({
            success: true,
            student: {
                regNumber: student.regNumber,
                name: student.name,
                batchName: student.batchName
            },
            ipHistory: student.ipHistory.sort((a, b) => b.timestamp - a.timestamp)
        });

    } catch (error) {
        console.error('Error getting CS student IP history:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
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
