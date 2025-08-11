const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://admin:qwerty12345@cluster0.xham8.mongodb.net/CS?retryWrites=true&w=majority&appName=Cluster0";

async function checkDatabase() {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        console.log('\n✅ Connected to MongoDB');
        
        const db = client.db('CS');
        console.log('📊 Database name:', db.databaseName);
        
        const collections = await db.listCollections().toArray();
        console.log('\n📋 Collections in database:');
        collections.forEach(col => console.log('   -', col.name));
        
        if (collections.some(col => col.name === 'CS2023')) {
            const cs2023Collection = db.collection('CS2023');
            const count = await cs2023Collection.countDocuments();
            console.log(`\n📊 CS2023: ${count} documents`);
            
            // Get a few sample documents to see the structure
            const samples = await cs2023Collection.find({}).limit(3).toArray();
            console.log('\n📋 Sample documents:');
            samples.forEach((doc, index) => {
                console.log(`\n   Document ${index + 1}:`);
                Object.keys(doc).forEach(key => {
                    console.log(`     ${key}: ${doc[key]}`);
                });
            });
            
            // Check if there are any students with specific fields we might need
            const hasEmail = await cs2023Collection.findOne({ email: { $exists: true } });
            const hasPhone = await cs2023Collection.findOne({ phone: { $exists: true } });
            const hasBatch = await cs2023Collection.findOne({ batchName: { $exists: true } });
            
            console.log('\n🔍 Field Analysis:');
            console.log(`   Has email field: ${hasEmail ? 'Yes' : 'No'}`);
            console.log(`   Has phone field: ${hasPhone ? 'Yes' : 'No'}`);
            console.log(`   Has batchName field: ${hasBatch ? 'Yes' : 'No'}`);
        }
        
        await client.close();
        console.log('\n✅ Database connection closed');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkDatabase(); 