const mongoose = require('mongoose');
const Batch = require('../models/Batch');
require('dotenv').config();

// Based on the earlier output, these are the actual batches in your database
const batches = [
  { name: 'Batch 1', level: 'N3' },
  { name: 'Batch 1', level: 'N4' },
  { name: 'Batch 2', level: 'N4' },
  { name: 'Batch 3', level: 'N4' },
  { name: 'Batch 1', level: 'N5' },
  { name: 'Batch 2', level: 'N5' },
  { name: 'Batch 3', level: 'N5' },
  { name: 'Batch 4', level: 'N5' },
  { name: 'Batch 5', level: 'N5' },
  { name: 'Batch 6', level: 'N5' },
  { name: 'Batch 7', level: 'N5' }
];

async function fixBatches() {
  try {
    // Try different connection strings
    const connectionStrings = [
      process.env.MONGODB_URI,
      'mongodb://localhost:27017/japclass_attendance',
      'mongodb://127.0.0.1:27017/japclass_attendance'
    ];

    let connected = false;
    for (const connStr of connectionStrings) {
      try {
        if (connStr) {
          await mongoose.connect(connStr);
          console.log('✅ Connected to MongoDB using:', connStr);
          connected = true;
          break;
        }
      } catch (err) {
        console.log('❌ Failed to connect with:', connStr);
      }
    }

    if (!connected) {
      throw new Error('Could not connect to MongoDB');
    }

    // Clear existing batches
    await Batch.deleteMany({});
    console.log('🗑️  Cleared existing batches');

    // Create new batches
    const createdBatches = [];
    for (const batch of batches) {
      const newBatch = new Batch({
        name: batch.name,
        level: batch.level,
        studentCount: 0
      });
      await newBatch.save();
      createdBatches.push(newBatch);
      console.log(`✅ Created ${batch.name} - ${batch.level}`);
    }

    console.log('\n🎉 All batches created successfully!');
    console.log('\n📋 Created Batches:');
    createdBatches.forEach(batch => {
      console.log(`   - ${batch.name} - ${batch.level} (ID: ${batch._id})`);
    });

    // Try to count students per batch (using the actual batch names from your data)
    try {
      const Student = require('../models/Student');
      console.log('\n📊 Student Count per Batch:');
      
      for (const batch of batches) {
        // Try different ways to match students
        const studentCount1 = await Student.countDocuments({
          batchName: `${batch.name} ${batch.level}`
        });
        
        const studentCount2 = await Student.countDocuments({
          batchName: batch.name,
          level: batch.level
        });

        const totalCount = studentCount1 + studentCount2;
        console.log(`   - ${batch.name} - ${batch.level}: ${totalCount} students`);
        
        // Update batch with student count
        await Batch.findOneAndUpdate(
          { name: batch.name, level: batch.level },
          { studentCount: totalCount }
        );
      }
    } catch (err) {
      console.log('⚠️  Could not count students (collection might not exist):', err.message);
    }

    console.log('\n✅ Batch setup completed!');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Refresh the teacher dashboard');
    console.log('   2. Check the batch dropdown');
    console.log('   3. Create a test session');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error setting up batches:', error);
    process.exit(1);
  }
}

fixBatches(); 