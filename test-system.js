const axios = require('axios');

async function testSystem() {
    console.log('🧪 Testing QR Attendance System...\n');

    try {
        // Test backend health
        console.log('1. Testing Backend Health...');
        const healthResponse = await axios.get('http://localhost:5000/api/health');
        console.log('✅ Backend is running:', healthResponse.data.message);

        // Test batches endpoint
        console.log('\n2. Testing Batches API...');
        const batchesResponse = await axios.get('http://localhost:5000/api/batch');
        console.log('✅ Batches API working:', batchesResponse.data.batches?.length || 0, 'batches found');

        // Test QR sessions endpoint
        console.log('\n3. Testing QR Sessions API...');
        const sessionsResponse = await axios.get('http://localhost:5000/api/qr/sessions');
        console.log('✅ QR Sessions API working:', sessionsResponse.data.sessions?.length || 0, 'sessions found');

        console.log('\n🎉 All tests passed! System is ready to use.');
        console.log('\n📱 Access Points:');
        console.log('   Teacher Dashboard: http://localhost:3000');
        console.log('   Student Interface: http://localhost:3000/mark-attendance');
        console.log('   Backend API: http://localhost:5000/api');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('   1. Make sure MongoDB is running');
        console.log('   2. Check if both servers are started');
        console.log('   3. Verify .env file configuration');
    }
}

testSystem(); 