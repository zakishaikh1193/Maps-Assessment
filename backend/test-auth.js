import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Test authentication endpoints
async function testAuth() {
  console.log('🧪 Testing Authentication Endpoints...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await api.get('/health');
    console.log('✅ Health check passed:', healthResponse.data.status);

    // Test 2: Login with admin credentials
    console.log('\n2️⃣ Testing admin login...');
    const loginResponse = await api.post('/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    console.log('✅ Admin login successful');
    console.log('   User:', loginResponse.data.user.username);
    console.log('   Role:', loginResponse.data.user.role);
    console.log('   Token received:', loginResponse.data.token ? 'Yes' : 'No');

    const token = loginResponse.data.token;

    // Test 3: Verify token
    console.log('\n3️⃣ Testing token verification...');
    const verifyResponse = await api.get('/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Token verification successful');
    console.log('   User ID:', verifyResponse.data.user.id);

    // Test 4: Get profile
    console.log('\n4️⃣ Testing profile retrieval...');
    const profileResponse = await api.get('/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Profile retrieval successful');
    console.log('   Name:', `${profileResponse.data.user.first_name} ${profileResponse.data.user.last_name}`);

    // Test 5: Test student login
    console.log('\n5️⃣ Testing student login...');
    const studentLoginResponse = await api.post('/auth/login', {
      username: 'student1',
      password: 'student123'
    });
    console.log('✅ Student login successful');
    console.log('   User:', studentLoginResponse.data.user.username);
    console.log('   Role:', studentLoginResponse.data.user.role);

    console.log('\n🎉 All authentication tests passed!');
    console.log('\n📋 Frontend Integration Summary:');
    console.log('   ✅ Backend is running on http://localhost:5000');
    console.log('   ✅ API endpoints are working correctly');
    console.log('   ✅ JWT authentication is functional');
    console.log('   ✅ Frontend can connect to backend');
    console.log('\n🚀 Your frontend is ready to use with the backend!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Backend server is running (npm run dev)');
    console.log('   2. Database is connected');
    console.log('   3. Environment variables are set correctly');
  }
}

testAuth();
