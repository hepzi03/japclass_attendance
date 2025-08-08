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
  { name: 'Batch 7', level: 'N5' },
  { name: 'Batch 5', level: 'N5' },
  { name: 'Batch 6', level: 'N5' },
];

async function addBatches() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    for (const batch of batches) {
      await Batch.create(batch);
      console.log(`✅ Added ${batch.name} - ${batch.level}`);
    }

    console.log('✅ All batches added');
    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    mongoose.disconnect();
  }
}

addBatches();
