const mongoose = require('mongoose');
require('dotenv').config();

async function checkStudent() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/japclass_attendance');
    console.log('✅ Connected to MongoDB');

    // Check student with reg number 056
    const student = await mongoose.connection.db.collection('students').findOne({regNumber: '056'});
    
    if (student) {
      console.log('\n📋 Student Data:');
      console.log('Name:', student.name);
      console.log('Reg Number:', student.regNumber);
      console.log('Batch Name:', student.batchName);
      console.log('Level:', student.level);
    } else {
      console.log('❌ Student with reg number 056 not found');
    }

    // Check session data
    const session = await mongoose.connection.db.collection('sessions').findOne({sessionId: 'SESS_1754374972072_vau210mn1'});
    
    if (session) {
      console.log('\n📋 Session Data:');
      console.log('Session ID:', session.sessionId);
      console.log('Batch Name:', session.batchName);
      console.log('Date:', session.date);
    } else {
      console.log('❌ Session not found');
    }

    // Check all unique batch names in students collection
    const studentBatchNames = await mongoose.connection.db.collection('students').distinct('batchName');
    console.log('\n📊 Unique Student Batch Names:');
    studentBatchNames.forEach(name => console.log('  -', name));

    // Check all unique batch names in batches collection
    const batchNames = await mongoose.connection.db.collection('batches').find({}).toArray();
    console.log('\n📊 Batch Names in Batches Collection:');
    batchNames.forEach(batch => console.log(`  - ${batch.name} - ${batch.level}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStudent(); 