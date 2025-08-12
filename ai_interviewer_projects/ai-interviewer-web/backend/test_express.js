const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'config.env' });

async function testExpressBackend() {
  console.log('🔍 Testing Express.js Backend Setup...');
  
  try {
    // Test MongoDB connection
    console.log('📊 Testing MongoDB connection...');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const db = client.db('ai_interviewer');
    await db.admin().ping();
    console.log('✅ MongoDB connection successful!');
    
    // Test collections
    const collections = await db.listCollections().toArray();
    console.log(`📁 Collections: ${collections.map(c => c.name).join(', ')}`);
    
    await client.close();
    
    console.log('✅ Express.js backend setup is ready!');
    console.log('🚀 You can now run: npm start');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Please check:');
    console.log('1. MongoDB connection string in config.env');
    console.log('2. Network access settings in MongoDB Atlas');
    console.log('3. Database user credentials');
  }
}

testExpressBackend();
