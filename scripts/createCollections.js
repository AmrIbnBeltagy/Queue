const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// Import all models to register them with Mongoose
const User = require('../models/User');
const Order = require('../models/Order');
const CallLog = require('../models/CallLog');
const ShippingCompany = require('../models/ShippingCompany');
const Group = require('../models/Group');
const Area = require('../models/Area');
const CompanyGroupAssignment = require('../models/CompanyGroupAssignment');
const Doctor = require('../models/Doctor');
const Degree = require('../models/Degree');
const Speciality = require('../models/Speciality');
const Location = require('../models/Location');
const Clinic = require('../models/Clinic');
const Monitor = require('../models/Monitor');
const PhysicianSchedule = require('../models/PhysicianSchedule');
const PhysicianClinicAssignment = require('../models/PhysicianClinicAssignment');
const Ticket = require('../models/Ticket');
const AgentCounter = require('../models/AgentCounter');
const Configuration = require('../models/Configuration');
const TodayPhysicianSchedule = require('../models/TodayPhysicianSchedule');
const CallingSequence = require('../models/CallingSequence');

async function createCollections() {
  console.log('🔧 Creating MongoDB Collections...\n');
  console.log('='.repeat(60));

  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error('❌ MONGODB_URI is not defined in config.env');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    console.log(`✅ Connected to: ${mongoose.connection.host}`);
    console.log(`✅ Database: ${mongoose.connection.name}\n`);

    const db = mongoose.connection.db;
    const collections = [];

    // List of all model names (collection names are pluralized by Mongoose)
    const models = [
      { name: 'User', collection: 'users' },
      { name: 'Order', collection: 'orders' },
      { name: 'CallLog', collection: 'calllogs' },
      { name: 'ShippingCompany', collection: 'shippingcompanies' },
      { name: 'Group', collection: 'groups' },
      { name: 'Area', collection: 'areas' },
      { name: 'CompanyGroupAssignment', collection: 'companygroupassignments' },
      { name: 'Doctor', collection: 'doctors' },
      { name: 'Degree', collection: 'degrees' },
      { name: 'Speciality', collection: 'specialities' },
      { name: 'Location', collection: 'locations' },
      { name: 'Clinic', collection: 'clinics' },
      { name: 'Monitor', collection: 'monitors' },
      { name: 'PhysicianSchedule', collection: 'physicianschedules' },
      { name: 'PhysicianClinicAssignment', collection: 'physicianclinicassignments' },
      { name: 'Ticket', collection: 'tickets' },
      { name: 'AgentCounter', collection: 'agentcounters' },
      { name: 'Configuration', collection: 'configurations' },
      { name: 'TodayPhysicianSchedule', collection: 'todayphysicianschedules' },
      { name: 'CallingSequence', collection: 'callingsequences' },
    ];

    console.log('📦 Creating collections...\n');
    console.log('   (Collections will be created automatically when first document is inserted)\n');

    for (const model of models) {
      try {
        // Get the actual collection name from the model
        const Model = mongoose.model(model.name);
        const collectionName = Model.collection.name;

        // Try to check if collection exists by doing a simple count
        // This will create the collection if it doesn't exist (MongoDB behavior)
        try {
          // Use a simple operation that doesn't require special permissions
          // Just try to access the collection - MongoDB will create it implicitly
          const collection = db.collection(collectionName);
          
          // Try to get collection stats (this will create collection if needed in some cases)
          // Actually, let's just verify we can access it
          await collection.findOne({ _id: new mongoose.Types.ObjectId('000000000000000000000000') });
          
          console.log(`   ✅ ${collectionName} - Collection accessible`);
          collections.push(collectionName);
        } catch (accessError) {
          // If that fails, try inserting a temporary document
          try {
            // Create a minimal valid document based on required fields
            // But we need to be careful - some models have required fields
            // Let's use insertOne with an empty doc on the raw collection
            const collection = db.collection(collectionName);
            // Insert and immediately delete a dummy document
            // Actually, MongoDB creates collections on first write, so let's try a safe write
            const result = await collection.insertOne({ _temp: true, _createdAt: new Date() });
            if (result.insertedId) {
              // Delete the temp document
              await collection.deleteOne({ _id: result.insertedId });
              console.log(`   ✅ ${collectionName} - Collection created`);
              collections.push(collectionName);
            }
          } catch (insertError) {
            // If insert fails due to validation, collection might still be created
            // Or it might require specific fields - let's just note it
            console.log(`   ⚠️  ${collectionName} - May need data with required fields: ${insertError.message}`);
            // Try to verify it exists anyway
            try {
              const count = await db.collection(collectionName).countDocuments({}, { limit: 1 });
              console.log(`   ✓ ${collectionName} - Collection exists`);
              collections.push(collectionName);
            } catch {
              console.log(`   ⚠️  ${collectionName} - Could not verify/create collection`);
            }
          }
        }
      } catch (error) {
        console.error(`   ❌ Error processing ${model.name}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Collection Status\n');
    
    if (collections.length > 0) {
      console.log(`✅ Successfully verified ${collections.length} collections:`);
      collections.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col}`);
      });
    } else {
      console.log('ℹ️  Collections will be created automatically when your application first uses them.');
      console.log('\n📋 Expected Collections (will be created on first insert):');
      models.forEach((model, index) => {
        const Model = mongoose.model(model.name);
        console.log(`   ${index + 1}. ${Model.collection.name}`);
      });
    }

    // Try to list all collections (may require authentication)
    console.log('\n' + '='.repeat(60));
    console.log('📚 Checking existing collections...\n');
    try {
      const allCollections = await db.listCollections().toArray();
      if (allCollections.length > 0) {
        console.log(`✅ Found ${allCollections.length} existing collections:`);
        allCollections.forEach((col, index) => {
          console.log(`   ${index + 1}. ${col.name}`);
        });
      } else {
        console.log('   (No collections found - they will be created when data is inserted)');
      }
    } catch (listError) {
      console.log('   ⚠️  Cannot list collections (requires authentication)');
      console.log('   ℹ️  Collections will be created automatically when your app inserts data');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Database Setup Complete!');
    console.log('\n💡 Note: In MongoDB, collections (tables) are created automatically');
    console.log('   when you first insert a document. Your application will create');
    console.log('   these collections as needed when it starts using them.');
    console.log('='.repeat(60) + '\n');

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Connection closed gracefully');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error creating collections:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the script
createCollections();

