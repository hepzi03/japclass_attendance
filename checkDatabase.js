const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
  try {
    await mongoose.connect('mongodb+srv://admin:qwerty12345@cluster0.xham8.mongodb.net/CS?retryWrites=true&w=majority&appName=Cluster0');
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database name: ${mongoose.connection.db.databaseName}`);

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📋 Collections in database:');
    collections.forEach(col => console.log(`   - ${col.name}`));

    // Check each collection for data
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`\n📊 ${collection.name}: ${count} documents`);
      
      if (count > 0) {
        const sample = await mongoose.connection.db.collection(collection.name).findOne();
        console.log(`   Sample document:`, JSON.stringify(sample, null, 2));
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDatabase(); 