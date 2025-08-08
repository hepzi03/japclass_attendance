const mongoose = require('mongoose');

// Direct connection strings (without SRV records)
const connectionStrings = [
  'mongodb://admin:qwerty12345@cluster0-shard-00-00.xham8.mongodb.net:27017,cluster0-shard-00-01.xham8.mongodb.net:27017,cluster0-shard-00-02.xham8.mongodb.net:27017/japclass_attendance?ssl=true&replicaSet=atlas-14b8sh-shard-0&authSource=admin&retryWrites=true&w=majority',
  'mongodb://admin:qwerty12345@cluster0-shard-00-00.xham8.mongodb.net:27017/japclass_attendance?ssl=true&authSource=admin&retryWrites=true&w=majority',
  'mongodb://admin:qwerty12345@cluster0-shard-00-01.xham8.mongodb.net:27017/japclass_attendance?ssl=true&authSource=admin&retryWrites=true&w=majority',
  'mongodb://admin:qwerty12345@cluster0-shard-00-02.xham8.mongodb.net:27017/japclass_attendance?ssl=true&authSource=admin&retryWrites=true&w=majority'
];

const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  bufferCommands: false,
  retryWrites: true,
  w: 'majority'
};

async function testConnection(uri, index) {
  console.log(`\n🔍 Testing direct connection ${index + 1}:`);
  console.log('URI:', uri.replace(/\/\/admin:.*@/, '//***:***@'));
  
  try {
    await mongoose.connect(uri, connectionOptions);
    console.log(`✅ Successfully connected with direct connection ${index + 1}!`);
    console.log('📊 Connection info:', mongoose.connection.host, mongoose.connection.port);
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.error(`❌ Direct connection ${index + 1} failed:`);
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    return false;
  }
}

async function testAllConnections() {
  console.log('🔍 Testing MongoDB Atlas direct connections...');
  
  for (let i = 0; i < connectionStrings.length; i++) {
    const success = await testConnection(connectionStrings[i], i);
    if (success) {
      console.log('\n✅ Found working direct connection!');
      console.log('\n💡 Use this connection string in your .env file:');
      console.log('MONGODB_URI=' + connectionStrings[i]);
      process.exit(0);
    }
  }
  
  console.log('\n❌ All direct connection attempts failed.');
  console.log('\n💡 Additional troubleshooting:');
  console.log('1. Check if your network allows outbound connections to port 27017');
  console.log('2. Try using a VPN or different network');
  console.log('3. Check if your firewall is blocking MongoDB connections');
  console.log('4. Verify the MongoDB Atlas cluster is active');
  process.exit(1);
}

testAllConnections();
