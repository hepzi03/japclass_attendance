// Test script for distance calculation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Convert degrees to radians
  const lat1Rad = lat1 * Math.PI / 180;
  const lon1Rad = lon1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const lon2Rad = lon2 * Math.PI / 180;

  // Haversine formula
  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Earth's radius in meters
  const R = 6371000;
  
  return R * c; // Distance in meters
};

// Test cases
console.log('🧪 Testing Distance Calculation...\n');

// Test 1: Same location (should be 0m)
console.log('📋 Test 1: Same location');
const test1 = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
console.log(`   Coordinates: (40.7128, -74.0060) to (40.7128, -74.0060)`);
console.log(`   Distance: ${Math.round(test1)}m (Expected: 0m)`);
console.log(`   ✅ ${test1 === 0 ? 'PASS' : 'FAIL'}\n`);

// Test 2: Very close locations (should be a few meters)
console.log('📋 Test 2: Very close locations');
const test2 = calculateDistance(40.7128, -74.0060, 40.7129, -74.0060);
console.log(`   Coordinates: (40.7128, -74.0060) to (40.7129, -74.0060)`);
console.log(`   Distance: ${Math.round(test2)}m (Should be ~11m)`);
console.log(`   ✅ ${test2 > 0 && test2 < 20 ? 'PASS' : 'FAIL'}\n`);

// Test 3: Typical classroom scenario (should be within 200m)
console.log('📋 Test 3: Typical classroom scenario');
const test3 = calculateDistance(40.7128, -74.0060, 40.7130, -74.0062);
console.log(`   Coordinates: (40.7128, -74.0060) to (40.7130, -74.0062)`);
console.log(`   Distance: ${Math.round(test3)}m (Should be within 200m)`);
console.log(`   ✅ ${test3 > 0 && test3 < 200 ? 'PASS' : 'FAIL'}\n`);

// Test 4: Your specific case - let's test with some realistic coordinates
console.log('📋 Test 4: Realistic classroom coordinates');
// Example: Session at (25.2048, 55.2708) - Dubai coordinates
// Student at (25.2049, 55.2709) - very close
const test4 = calculateDistance(25.2048, 55.2708, 25.2049, 55.2709);
console.log(`   Session: (25.2048, 55.2708)`);
console.log(`   Student: (25.2049, 55.2709)`);
console.log(`   Distance: ${Math.round(test4)}m (Should be very small)`);
console.log(`   ✅ ${test4 > 0 && test4 < 50 ? 'PASS' : 'FAIL'}\n`);

// Test 5: Edge case - very far apart
console.log('📋 Test 5: Very far apart');
const test5 = calculateDistance(0, 0, 0, 1);
console.log(`   Coordinates: (0, 0) to (0, 1)`);
console.log(`   Distance: ${Math.round(test5)}m (Should be ~111km)`);
console.log(`   ✅ ${test5 > 100000 ? 'PASS' : 'FAIL'}\n`);

console.log('🎯 Distance Calculation Summary:');
console.log('   - Formula: Haversine (accurate for Earth distances)');
console.log('   - Units: Meters');
console.log('   - Max allowed distance: 200m (configurable)');
console.log('   - Debug logging: Added to help troubleshoot issues');

// Helper function to test your specific coordinates
function testYourCoordinates(sessionLat, sessionLon, studentLat, studentLon) {
  console.log(`\n🔍 Testing Your Specific Coordinates:`);
  console.log(`   Session: (${sessionLat}, ${sessionLon})`);
  console.log(`   Student: (${studentLat}, ${studentLon})`);
  
  const distance = calculateDistance(sessionLat, sessionLon, studentLat, studentLon);
  console.log(`   Calculated Distance: ${Math.round(distance)}m`);
  
  if (distance <= 200) {
    console.log(`   ✅ Within allowed range (≤200m)`);
  } else {
    console.log(`   ❌ Outside allowed range (>200m)`);
    console.log(`   💡 Consider increasing maxDistance or checking coordinates`);
  }
  
  return distance;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateDistance, testYourCoordinates };
}
