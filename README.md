# QR-Based Attendance System

A secure, modern attendance system that uses QR codes for easy student check-ins with advanced security features including VPN detection and IP-based restrictions.

## 🚀 Features

### For Teachers
- **Create Attendance Sessions**: Select batch, date, and time slot
- **QR Code Generation**: Automatic QR code generation for each session
- **Real-time Monitoring**: View attendance as students mark it
- **Export Reports**: Export attendance as PDF or Excel
- **Session Management**: View all sessions with attendance counts

### For Students
- **QR Code Scanning**: Scan QR code to access attendance form
- **Mobile-Friendly**: Optimized for mobile devices
- **Auto-Load Session Info**: Session details automatically loaded
- **Registration Number Input**: Simple registration number entry
- **Instant Feedback**: Immediate confirmation of attendance

### Security Features
- **VPN Detection**: Blocks attendance from VPN/proxy connections
- **IP-Based Restrictions**: One attendance per IP per session
- **Rate Limiting**: Prevents abuse with request limits
- **Device Tracking**: Records device information for audit
- **Duplicate Prevention**: Prevents multiple entries from same student

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **QR Code Generation** using qrcode library
- **VPN Detection** using IP geolocation APIs
- **PDF Generation** using PDFKit
- **Excel Export** using xlsx library

### Frontend
- **Vanilla JavaScript** with modern ES6+ features
- **Responsive CSS** with mobile-first design
- **Font Awesome** icons for better UX
- **Progressive Web App** features

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn package manager

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd JapClass_backend
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/japclass_attendance
   PORT=5000
   CORS_ORIGIN=http://localhost:3000
   FRONTEND_URL=http://localhost:3000
   NODE_ENV=development
   ```

5. **Start the system**
   ```bash
   # Option 1: Use the provided scripts
   ./start-system.bat          # Windows
   ./start-system.ps1          # PowerShell
   
   # Option 2: Manual start
   npm run dev                 # Backend (Terminal 1)
   cd frontend && npm start    # Frontend (Terminal 2)
   ```

## 📱 Usage

### For Teachers

1. **Access Teacher Dashboard**
   - Open: `http://localhost:3000`
   - Create new attendance sessions
   - View existing sessions and attendance

2. **Create a Session**
   - Select batch (e.g., "Batch 1 - N5")
   - Choose date and time slot
   - Click "Create Session & Generate QR"
   - Display the QR code for students

3. **Monitor Attendance**
   - View real-time attendance in the dashboard
   - Export attendance reports as PDF or Excel
   - Track attendance statistics

### For Students

1. **Scan QR Code**
   - Use any QR code scanner app
   - Scan the QR code displayed by the teacher
   - This opens the attendance form

2. **Mark Attendance**
   - Enter your registration number
   - Click "Mark Attendance"
   - Receive instant confirmation

## 🔒 Security Features

### VPN/Proxy Detection
- Automatically detects VPN and proxy connections
- Blocks attendance from detected VPN/proxy IPs
- Uses IP geolocation services for detection

### IP-Based Restrictions
- Only one attendance per IP address per session
- Prevents multiple students from same device
- Allows retry from same student on same device

### Rate Limiting
- Limits attendance attempts per IP
- Prevents abuse and spam
- Configurable limits (default: 5 attempts per 15 minutes)

## 📊 Database Schema

### Sessions
```javascript
{
  sessionId: String,        // Unique session identifier
  batchId: ObjectId,        // Reference to batch
  batchName: String,        // "Batch 1 - N5"
  date: Date,              // Session date
  timeSlot: String,        // "9:00-10:00"
  slotNumber: Number,      // 1-7
  isActive: Boolean        // Session status
}
```

### Attendance
```javascript
{
  sessionId: String,        // Session identifier
  studentId: ObjectId,      // Student reference
  name: String,            // Student name
  regNumber: String,       // Registration number
  batchId: String,         // "Batch 1 - N5"
  date: Date,             // Session date
  timestamp: Date,         // Attendance time
  ip: String,             // Client IP address
  deviceInfo: Object,      // Browser/platform info
  isVpnDetected: Boolean   // VPN detection result
}
```

## 🔧 API Endpoints

### Teacher Endpoints
- `POST /api/qr/session/create` - Create new session
- `GET /api/qr/sessions` - Get all sessions
- `GET /api/qr/session/:id/attendance` - Get session attendance
- `GET /api/qr/session/:id/export/excel` - Export Excel
- `GET /api/qr/session/:id/export/pdf` - Export PDF

### Student Endpoints
- `GET /api/qr/session/:id/info` - Get session info
- `POST /api/qr/mark-attendance` - Mark attendance

## 🎨 UI Features

### Teacher Dashboard
- Modern, responsive design
- Tab-based interface
- Real-time updates
- Mobile-friendly layout
- QR code display
- Export functionality

### Student Interface
- Clean, simple design
- Mobile-optimized
- Auto-loading session info
- Clear error messages
- Success confirmations

## 🔧 Configuration

### Environment Variables
- `MONGODB_URI`: MongoDB connection string
- `PORT`: Backend server port (default: 5000)
- `CORS_ORIGIN`: Frontend URL for CORS
- `FRONTEND_URL`: Frontend URL for QR codes
- `NODE_ENV`: Environment (development/production)

### VPN Detection
The system uses IP geolocation services to detect VPN/proxy connections. You can configure different services by modifying the `detectVPN` function in `controllers/qrAttendanceController.js`.

## 🚨 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`

2. **CORS Errors**
   - Verify `CORS_ORIGIN` in `.env`
   - Check frontend URL configuration

3. **QR Code Not Working**
   - Ensure frontend server is running
   - Check `FRONTEND_URL` configuration

4. **VPN Detection Issues**
   - Check internet connection
   - Verify IP geolocation service availability

### Debug Mode
Set `NODE_ENV=development` in `.env` for detailed error messages.

## 📈 Future Enhancements

- [ ] Email notifications for attendance
- [ ] SMS integration for reminders
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Offline attendance mode
- [ ] Biometric integration
- [ ] Advanced reporting features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 👥 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Built with ❤️ for secure and efficient attendance management** 