const express = require('express');
const mongoose = require('mongoose');
const Location = require('../models/Location');
const router = express.Router();

// GET /api/locations/stats/summary - Get location statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalLocations = await Location.countDocuments({ isActive: true });
    const activeLocations = await Location.countDocuments({ isActive: true, isDisabled: false });
    const disabledLocations = await Location.countDocuments({ isDisabled: true });
    const inactiveLocations = await Location.countDocuments({ isActive: false });
    
    res.json({
      success: true,
      data: {
        total: totalLocations,
        active: activeLocations,
        disabled: disabledLocations,
        inactive: inactiveLocations
      }
    });
  } catch (error) {
    console.error('Error fetching location stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// GET /api/locations - Get all locations
router.get('/', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available',
        data: []
      });
    }

    const { search, isActive } = req.query;
    let query = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (search) {
      query.$or = [
        { arName: { $regex: search, $options: 'i' } },
        { enName: { $regex: search, $options: 'i' } }
      ];
    }

    const locations = await Location.find(query)
      .sort({ createdAt: -1 });
      
    res.json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching locations',
      error: error.message
    });
  }
});

// GET /api/locations/:id - Get location by ID
router.get('/:id', async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching location',
      error: error.message
    });
  }
});

// POST /api/locations/check-duplicate - Check for duplicate location
router.post('/check-duplicate', async (req, res) => {
  try {
    const { arName, enName } = req.body;
    
    // Check if a location with the same name exists
    const existingLocation = await Location.findOne({
      $or: [
        { arName: arName },
        { enName: enName }
      ]
    });
    
    res.json({
      success: true,
      isDuplicate: !!existingLocation,
      data: existingLocation
    });
  } catch (error) {
    console.error('Error checking for duplicate location:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking for duplicate location',
      error: error.message
    });
  }
});

// POST /api/locations - Create new location
router.post('/', async (req, res) => {
  try {
    console.log('📝 Creating new location with data:', req.body);
    
    const location = new Location(req.body);
    await location.save();
    
    console.log('✅ Location created successfully:', location.enName);
    
    res.status(201).json({
      success: true,
      message: 'Location created successfully',
      data: location
    });
  } catch (error) {
    console.error('❌ Error creating location:', error.message);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      console.error('Validation errors:', errors);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      console.error('Duplicate key error:', field);
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating location',
      error: error.message
    });
  }
});

// PUT /api/locations/:id - Update location
router.put('/:id', async (req, res) => {
  try {
    console.log('📝 Updating location with data:', req.body);
    
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    console.log('✅ Location updated successfully:', location.enName);
    
    res.json({
      success: true,
      message: 'Location updated successfully',
      data: location
    });
  } catch (error) {
    console.error('❌ Error updating location:', error.message);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message
    });
  }
});

// PATCH /api/locations/:id/disable - Disable location
router.patch('/:id/disable', async (req, res) => {
  try {
    const { disabledBy, disabledReason } = req.body;
    
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      {
        isDisabled: true,
        disabledDate: new Date(),
        disabledBy: disabledBy,
        disabledReason: disabledReason
      },
      { new: true }
    );
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    console.log('✅ Location disabled successfully:', location.enName);
    
    res.json({
      success: true,
      message: 'Location disabled successfully',
      data: location
    });
  } catch (error) {
    console.error('❌ Error disabling location:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error disabling location',
      error: error.message
    });
  }
});

// PATCH /api/locations/:id/enable - Enable location
router.patch('/:id/enable', async (req, res) => {
  try {
    const { enabledBy } = req.body;
    
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      {
        isDisabled: false,
        enabledDate: new Date(),
        enabledBy: enabledBy,
        disabledDate: null,
        disabledBy: null,
        disabledReason: null
      },
      { new: true }
    );
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    console.log('✅ Location enabled successfully:', location.enName);
    
    res.json({
      success: true,
      message: 'Location enabled successfully',
      data: location
    });
  } catch (error) {
    console.error('❌ Error enabling location:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error enabling location',
      error: error.message
    });
  }
});

// DELETE /api/locations/:id - Delete location
router.delete('/:id', async (req, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    console.log('✅ Location deleted successfully:', location.enName);
    
    res.json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting location:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error deleting location',
      error: error.message
    });
  }
});

module.exports = router;

