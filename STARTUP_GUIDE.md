# 🚀 Quick Startup Guide

## Prerequisites
- Node.js (v16 or higher)
- MongoDB running locally or a MongoDB connection string
- npm or yarn

## Step 1: Start the Backend

1. **Navigate to the backend directory:**
   ```bash
   cd /d/College/JapClass_backend
   ```

2. **Install backend dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the backend root with:
   ```env
   MONGODB_URI=mongodb://localhost:27017/japclass_attendance
   PORT=5000
   CORS_ORIGIN=http://localhost:5173
   NODE_ENV=development
   ```

4. **Start the backend server:**
   ```bash
   npm run dev
   ```
   
   You should see:
   ```
   ✅ Connected to MongoDB
   Server running on port 5000
   Health check: http://localhost:5000/api/health
   ```

## Step 2: Start the Frontend

1. **Navigate to the frontend directory:**
   ```bash
   cd project-bolt-sb1-9m2pcr3p (1)/project
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Start the frontend development server:**
   ```bash
   npm run dev
   ```
   
   You should see:
   ```
   VITE v5.x.x ready in xxx ms
   ➜ Local: http://localhost:5173/
   ```

## Step 3: Verify Connection

1. **Open your browser** and go to `http://localhost:5173`
2. **Login** with any credentials (the login is currently mocked)
3. **Check the Connection Status** component at the bottom of the dashboard
4. **You should see** "Backend connected" with a green status

## Step 4: Test the API

1. **Test the health endpoint:**
   ```bash
   curl http://localhost:5000/api/health
   ```
   
   Should return:
   ```json
   {
     "status": "OK",
     "message": "Japanese Class Attendance API is running",
     "timestamp": "2024-01-01T00:00:00.000Z"
   }
   ```

## Troubleshooting

### Backend Issues

1. **MongoDB Connection Error:**
   - Make sure MongoDB is running
   - Check your MongoDB connection string in `.env`

2. **Port Already in Use:**
   - Change the PORT in `.env` to another port (e.g., 5001)
   - Update the frontend API URL accordingly

3. **CORS Errors:**
   - Make sure `CORS_ORIGIN` in `.env` matches your frontend URL

### Frontend Issues

1. **API Connection Failed:**
   - Check that the backend is running on port 5000
   - Verify the API URL in `src/config/api.ts`
   - Check browser console for CORS errors

2. **Build Errors:**
   - Run `npm install` to ensure all dependencies are installed
   - Check TypeScript errors with `npm run lint`

### Quick Fixes

1. **Start both together** (from backend root):
   ```bash
   npm run dev:full
   ```

2. **Windows Users - Use batch files:**
   ```bash
   # Start backend
   start-backend.bat
   
   # Start frontend (in another terminal)
   start-frontend.bat
   ```

3. **Reset everything:**
   ```bash
   # Backend
   npm install
   npm run dev
   
   # Frontend (in another terminal)
   cd "project-bolt-sb1-9m2pcr3p (1)/project"
   npm install
   npm run dev
   ```

## API Endpoints Available

Your backend provides these endpoints:

- `GET /api/health` - Health check
- `GET /api/student/all` - Get all students
- `POST /api/student/add` - Add a student
- `GET /api/student/:batchName/:level` - Get students by batch/level
- `GET /api/batch/all` - Get all batches
- `POST /api/batch/add` - Add a batch
- `POST /api/attendance/mark` - Mark attendance
- `GET /api/attendance/stats/:batchId` - Get attendance stats

## Next Steps

1. **Add some test data** to your MongoDB database
2. **Test the attendance marking** functionality
3. **Explore the different components** in the frontend
4. **Customize the UI** to match your needs

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check the backend terminal for server errors
3. Verify all environment variables are set correctly
4. Ensure MongoDB is running and accessible 