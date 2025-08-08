# Database Schema - Japanese Class Attendance System

## Collections/Tables

### 1. Students
```javascript
{
  _id: ObjectId,
  studentId: String, // Unique student ID
  name: String,
  rollNumber: String, // Registration number
  batchId: ObjectId, // Reference to batch
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Batches
```javascript
{
  _id: ObjectId,
  batchName: String, // e.g., "Batch A", "Batch 1"
  batchNumber: Number, // 1-11
  students: [ObjectId], // Array of student IDs
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Sessions
```javascript
{
  _id: ObjectId,
  sessionId: String, // Unique session identifier
  batchId: ObjectId, // Reference to batch
  date: Date, // Session date
  timeSlot: String, // e.g., "9:00-10:00", "Slot 1"
  slotNumber: Number, // 1-7 (for the 7 daily slots)
  notes: String, // Optional session notes
  isLocked: Boolean, // Prevent attendance changes
  createdAt: Date,
  updatedAt: Date
}
```

### 4. Attendance
```javascript
{
  _id: ObjectId,
  sessionId: ObjectId, // Reference to session
  studentId: ObjectId, // Reference to student
  status: String, // "Present", "Absent", "Late"
  timestamp: Date, // When marked
  markedBy: String, // Teacher/admin who marked
  createdAt: Date,
  updatedAt: Date
}
```

## Indexes for Performance
- Students: `studentId`, `batchId`
- Batches: `batchNumber`
- Sessions: `date`, `batchId`, `slotNumber`
- Attendance: `sessionId`, `studentId`, `status`

## API Endpoints Mapping
- POST /batch/add → Creates Batch + Students
- POST /session/add → Creates Session
- DELETE /session/:id → Removes Session + related Attendance
- POST /attendance/mark → Creates/Updates Attendance records
- GET /attendance/:sessionId → Queries Attendance by sessionId
- GET /attendance/export → Queries with date/batch filters
- GET /attendance/stats/:batch → Aggregates attendance data
