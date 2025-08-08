const mongoose = require('mongoose');
const Batch = require('../models/Batch');
require('dotenv').config();

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

async function resetBatches() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/japclass_attendance');
    console.log('✅ Connected to MongoDB');

    // Drop the entire batches collection to remove old indexes
    await mongoose.connection.db.dropCollection('batches');
    console.log('🗑️  Dropped batches collection');

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

    // Count students per batch
    const Student = require('../models/Student');
    console.log('\n📊 Student Count per Batch:');
    
    for (const batch of batches) {
      const studentCount = await Student.countDocuments({
        batchName: `${batch.name} ${batch.level}`
      });
      console.log(`   - ${batch.name} - ${batch.level}: ${studentCount} students`);
      
      // Update batch with student count
      await Batch.findOneAndUpdate(
        { name: batch.name, level: batch.level },
        { studentCount: studentCount }
      );
    }

    console.log('\n✅ Batch setup completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error setting up batches:', error);
    process.exit(1);
  }
}

resetBatches(); 