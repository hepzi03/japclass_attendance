const mongoose = require('mongoose');
require('dotenv').config();

async function checkStudents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/japclass_attendance');
    console.log('✅ Connected to MongoDB');

    const students = await mongoose.connection.db.collection('students').find({}).limit(10).toArray();
    
    console.log('\n📋 Sample Students:');
    students.forEach((student, index) => {
      console.log(`${index + 1}. Name: ${student.name}`);
      console.log(`   Reg Number: ${student.regNumber}`);
      console.log(`   Batch Name: ${student.batchName}`);
      console.log(`   Level: ${student.level}`);
      console.log('   ---');
    });

    // Check unique batch names and levels
    const batchNames = await mongoose.connection.db.collection('students').distinct('batchName');
    const levels = await mongoose.connection.db.collection('students').distinct('level');
    
    console.log('\n📊 Unique Batch Names:');
    batchNames.forEach(name => console.log(`   - ${name}`));
    
    console.log('\n📊 Unique Levels:');
    levels.forEach(level => console.log(`   - ${level}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStudents(); 