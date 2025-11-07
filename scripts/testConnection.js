const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function testConnection() {
  console.log('🔍 Testing MongoDB Connection...\n');
  console.log('=' .repeat(60));
  
  const mongoURI = process.env.MONGODB_URI;
  
  if (!mongoURI) {
    console.error('❌ MONGODB_URI is not defined in config.env');
    process.exit(1);
  }

  // Mask password in connection string for display
  const displayURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  console.log(`📡 Connection String: ${displayURI}\n`);

  // Set up connection event listeners
  mongoose.connection.on('connected', () => {
    console.log('✅ Mongoose connection event: CONNECTED');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection event: ERROR', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️  Mongoose connection event: DISCONNECTED');
  });

  try {
    console.log('🔄 Attempting to connect...\n');
    
    const startTime = Date.now();
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    const connectionTime = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ CONNECTION SUCCESSFUL!\n');
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`📍 Port: ${conn.connection.port}`);
    console.log(`📁 Database: ${conn.connection.name}`);
    console.log(`⏱️  Connection Time: ${connectionTime}ms`);
    console.log(`🔌 Connection State: ${getConnectionState(conn.connection.readyState)}`);
    
    // Test database operations
    console.log('\n' + '='.repeat(60));
    console.log('🧪 Testing Database Operations...\n');
    
    // List all databases
    try {
      const adminDb = conn.connection.db.admin();
      const dbList = await adminDb.listDatabases();
      console.log('📚 Available Databases:');
      dbList.databases.forEach(db => {
        console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
      });
    } catch (err) {
      console.log('⚠️  Could not list databases (may require admin privileges)');
    }
    
    // List collections in current database
    try {
      const collections = await conn.connection.db.listCollections().toArray();
      console.log(`\n📦 Collections in "${conn.connection.name}" database:`);
      if (collections.length === 0) {
        console.log('   (No collections found - database is empty)');
      } else {
        collections.forEach(collection => {
          console.log(`   - ${collection.name}`);
        });
      }
    } catch (err) {
      console.log(`\n⚠️  Could not list collections: ${err.message}`);
    }
    
    // Test a simple operation
    try {
      const result = await conn.connection.db.admin().ping();
      console.log(`\n🏓 Ping Test: ${result.ok === 1 ? '✅ Success' : '❌ Failed'}`);
    } catch (err) {
      console.log(`\n⚠️  Ping test failed: ${err.message}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!');
    console.log('='.repeat(60) + '\n');
    
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Connection closed gracefully');
    process.exit(0);
    
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ CONNECTION FAILED!\n');
    console.error(`Error: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔴 Connection Refused - Possible causes:');
      console.log('   1. MongoDB server is not running');
      console.log('   2. MongoDB is only listening on localhost (127.0.0.1)');
      console.log('   3. Firewall is blocking the connection');
      console.log('   4. Wrong IP address or port');
    } else if (error.message.includes('authentication')) {
      console.log('\n🔴 Authentication Failed - Possible causes:');
      console.log('   1. Wrong username or password');
      console.log('   2. User does not have access to the database');
      console.log('   3. Authentication is required but credentials are missing');
    } else if (error.message.includes('timeout')) {
      console.log('\n🔴 Connection Timeout - Possible causes:');
      console.log('   1. Network connectivity issues');
      console.log('   2. MongoDB server is not responding');
      console.log('   3. Firewall is blocking the connection');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`\nFull Error Details:`);
    console.error(error);
    
    process.exit(1);
  }
}

function getConnectionState(state) {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[state] || 'unknown';
}

// Run the test
testConnection();

