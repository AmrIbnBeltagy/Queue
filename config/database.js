const mongoose = require('mongoose');

// Set up connection event listeners
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Mongoose disconnected from MongoDB');
});

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log(`Attempting to connect to MongoDB: ${mongoURI.replace(/\/\/.*@/, '//***@')}`);

    // Connection options for better reliability
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      connectTimeoutMS: 10000, // Give up initial connection after 10s
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 1, // Maintain at least 1 socket connection
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    
    // Provide specific guidance for different error types
    if (error.message.includes('ECONNREFUSED') || error.code === 'ECONNREFUSED') {
      console.log('\n🔴 Connection Refused - See MONGODB_SERVER_SETUP.md for instructions');
    } else if (error.message.includes('authentication') || error.message.includes('requires authentication') || error.code === 13) {
      console.error('\n🔴 Authentication Required');
      console.log('\n📋 MongoDB is requiring authentication. You have two options:');
      console.log('\nOption 1: Disable authentication on MongoDB server (10.30.10.29)');
      console.log('   1. Edit mongod.conf and set: security.authorization: disabled');
      console.log('   2. Restart MongoDB service');
      console.log('\nOption 2: Add credentials to connection string');
      console.log('   Update config.env: mongodb://username:password@10.30.10.29:27017/queue_project');
      console.log('\nSee MONGODB_AUTHENTICATION_FIX.md for detailed instructions');
    } else {
      console.error('Full error:', error);
      console.log('\nNote: Please check:');
    }
    
    console.log(`\nConnection string: ${process.env.MONGODB_URI}`);
    
    // Don't exit the process, let the app run without database
    console.log('\n⚠️  Continuing without database connection...');
  }
};

module.exports = connectDB;
