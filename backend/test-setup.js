import dotenv from 'dotenv';
import { testConnection } from './config/database.js';

dotenv.config();

console.log('🧪 Testing MAP Assessment Backend Setup...\n');

// Test environment variables
console.log('📋 Environment Variables:');
console.log(`   PORT: ${process.env.PORT || '5000 (default)'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development (default)'}`);
console.log(`   DB_HOST: ${process.env.DB_HOST || 'localhost (default)'}`);
console.log(`   DB_NAME: ${process.env.DB_NAME || 'map_assessment (default)'}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Not set'}`);
console.log(`   CORS_ORIGIN: ${process.env.CORS_ORIGIN || 'http://localhost:5173 (default)'}\n`);

// Test database connection
console.log('🗄️ Testing Database Connection...');
try {
  const connected = await testConnection();
  if (connected) {
    console.log('✅ Database connection successful!\n');
  } else {
    console.log('❌ Database connection failed!\n');
    console.log('💡 Make sure to:');
    console.log('   1. Set up your .env file with correct database credentials');
    console.log('   2. Create the map_assessment database');
    console.log('   3. Run the migration: supabase/migrations/20250825084115_tender_hall.sql\n');
  }
} catch (error) {
  console.log('❌ Database connection error:', error.message, '\n');
}

console.log('🚀 To start the server, run: npm run dev');
console.log('📖 Check README.md for complete setup instructions');
