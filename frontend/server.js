const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static(__dirname));

// Route for the main dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for the attendance marking page
app.get('/mark-attendance', (req, res) => {
    res.sendFile(path.join(__dirname, 'mark-attendance.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Frontend server running on http://localhost:${PORT}`);
    console.log(`Teacher Dashboard: http://localhost:${PORT}`);
    console.log(`Student Attendance: http://localhost:${PORT}/mark-attendance`);
}); 