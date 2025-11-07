const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// Import a model to test operations
const User = require('../models/User');

async function testOperations() {
  console.log('🧪 Testing MongoDB Operations with Authentication...\n');
  console.log('='.repeat(60));

  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error('❌ MONGODB_URI is not defined in config.env');
    process.exit(1);
  }

  try {
    console.log('🔄 Connecting to MongoDB...\n');
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    console.log(`✅ Connected to: ${mongoose.connection.host}`);
    console.log(`✅ Database: ${mongoose.connection.name}\n`);

    // Test find operation
    console.log('📋 Testing FIND operation...');
    try {
      const userCount = await User.countDocuments();
      console.log(`   ✅ FIND operation successful - Found ${userCount} users`);
    } catch (error) {
      console.error(`   ❌ FIND operation failed: ${error.message}`);
    }

    // Test collection access
    console.log('\n📦 Testing collection access...');
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`   ✅ Can list collections - Found ${collections.length} collections`);
      collections.forEach(col => {
        console.log(`      - ${col.name}`);
      });
    } catch (error) {
      console.error(`   ❌ Cannot list collections: ${error.message}`);
    }

    // Test database stats
    console.log('\n📊 Testing database stats...');
    try {
      const stats = await mongoose.connection.db.stats();
      console.log(`   ✅ Database stats accessible`);
      console.log(`      - Collections: ${stats.collections}`);
      console.log(`      - Data size: ${(stats.dataSize / 1024).toFixed(2)} KB`);
    } catch (error) {
      console.error(`   ⚠️  Cannot get stats: ${error.message}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All operations test completed!');
    console.log('='.repeat(60) + '\n');

    await mongoose.connection.close();
    console.log('🔌 Connection closed gracefully');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testOperations();

