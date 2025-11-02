const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Remove deprecated options
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.log('Note: If you\'re getting IP whitelist errors, please:');
    console.log('1. Go to your MongoDB Atlas dashboard');
    console.log('2. Navigate to Network Access');
    console.log('3. Add your current IP address (0.0.0.0/0 for all IPs)');
    console.log('4. Or use a local MongoDB instance');
    
    // Don't exit the process, let the app run without database
    console.log('Continuing without database connection...');
  }
};

module.exports = connectDB;
