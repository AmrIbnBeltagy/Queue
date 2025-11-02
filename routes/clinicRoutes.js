const express = require('express');
const mongoose = require('mongoose');
const Clinic = require('../models/Clinic');
const Location = require('../models/Location');
const router = express.Router();

// GET /api/clinics/stats/summary - Get clinic statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalClinics = await Clinic.countDocuments({ isActive: true });
    const activeClinics = await Clinic.countDocuments({ isActive: true, isDisabled: false });
    const disabledClinics = await Clinic.countDocuments({ isDisabled: true });
    const inactiveClinics = await Clinic.countDocuments({ isActive: false });
    
    res.json({
      success: true,
      data: {
        total: totalClinics,
        active: activeClinics,
        disabled: disabledClinics,
        inactive: inactiveClinics
      }
    });
  } catch (error) {
    console.error('Error fetching clinic stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// GET /api/clinics - Get all clinics
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

    const { search, isActive, location } = req.query;
    let query = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (location) {
      query.location = location;
    }
    
    if (search) {
      query.$or = [
        { arName: { $regex: search, $options: 'i' } },
        { enName: { $regex: search, $options: 'i' } }
      ];
    }

    const clinics = await Clinic.find(query)
      .populate('location', 'arName enName')
      .sort({ createdAt: -1 });
      
    res.json({
      success: true,
      count: clinics.length,
      data: clinics
    });
  } catch (error) {
    console.error('Error fetching clinics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clinics',
      error: error.message
    });
  }
});

// GET /api/clinics/:id - Get clinic by ID
router.get('/:id', async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.params.id)
      .populate('location', 'arName enName');
    
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }
    
    res.json({
      success: true,
      data: clinic
    });
  } catch (error) {
    console.error('Error fetching clinic:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clinic',
      error: error.message
    });
  }
});

// POST /api/clinics/check-duplicate - Check for duplicate clinic
router.post('/check-duplicate', async (req, res) => {
  try {
    const { arName, enName, location } = req.body;
    
    // Check if a clinic with the same name and location exists
    const existingClinic = await Clinic.findOne({
      $and: [
        { location: location },
        {
          $or: [
            { arName: arName },
            { enName: enName }
          ]
        }
      ]
    });
    
    res.json({
      success: true,
      isDuplicate: !!existingClinic,
      data: existingClinic
    });
  } catch (error) {
    console.error('Error checking for duplicate clinic:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking for duplicate clinic',
      error: error.message
    });
  }
});

// POST /api/clinics - Create new clinic
router.post('/', async (req, res) => {
  try {
    console.log('📝 Creating new clinic with data:', req.body);
    
    // Verify location exists
    const location = await Location.findById(req.body.location);
    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location ID'
      });
    }
    
    // Don't set code if not provided - it will be auto-generated in pre-save hook
    // Only allow manual code if explicitly provided
    const clinic = new Clinic(req.body);
    await clinic.save();
    
    // Populate location data
    await clinic.populate('location', 'arName enName');
    
    console.log('✅ Clinic created successfully:', clinic.enName);
    
    res.status(201).json({
      success: true,
      message: 'Clinic created successfully',
      data: clinic
    });
  } catch (error) {
    console.error('❌ Error creating clinic:', error.message);
    
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
      message: 'Error creating clinic',
      error: error.message
    });
  }
});

// PUT /api/clinics/:id - Update clinic
router.put('/:id', async (req, res) => {
  try {
    console.log('📝 Updating clinic with data:', req.body);
    
    // Verify location exists if provided
    if (req.body.location) {
      const location = await Location.findById(req.body.location);
      if (!location) {
        return res.status(400).json({
          success: false,
          message: 'Invalid location ID'
        });
      }
    }
    
    // Prevent code modification during update (code is auto-generated only on create)
    // If code needs to be updated, it should be done explicitly
    const updateData = { ...req.body };
    if (!updateData.code || updateData.code === '') {
      delete updateData.code; // Don't update code if not provided
    }
    
    const clinic = await Clinic.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('location', 'arName enName');
    
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }
    
    console.log('✅ Clinic updated successfully:', clinic.enName);
    
    res.json({
      success: true,
      message: 'Clinic updated successfully',
      data: clinic
    });
  } catch (error) {
    console.error('❌ Error updating clinic:', error.message);
    
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
      message: 'Error updating clinic',
      error: error.message
    });
  }
});

// PATCH /api/clinics/:id/disable - Disable clinic
router.patch('/:id/disable', async (req, res) => {
  try {
    const { disabledBy, disabledReason } = req.body;
    
    const clinic = await Clinic.findByIdAndUpdate(
      req.params.id,
      {
        isDisabled: true,
        disabledDate: new Date(),
        disabledBy: disabledBy,
        disabledReason: disabledReason
      },
      { new: true }
    ).populate('location', 'arName enName');
    
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }
    
    console.log('✅ Clinic disabled successfully:', clinic.enName);
    
    res.json({
      success: true,
      message: 'Clinic disabled successfully',
      data: clinic
    });
  } catch (error) {
    console.error('❌ Error disabling clinic:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error disabling clinic',
      error: error.message
    });
  }
});

// PATCH /api/clinics/:id/enable - Enable clinic
router.patch('/:id/enable', async (req, res) => {
  try {
    const { enabledBy } = req.body;
    
    const clinic = await Clinic.findByIdAndUpdate(
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
    ).populate('location', 'arName enName');
    
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }
    
    console.log('✅ Clinic enabled successfully:', clinic.enName);
    
    res.json({
      success: true,
      message: 'Clinic enabled successfully',
      data: clinic
    });
  } catch (error) {
    console.error('❌ Error enabling clinic:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error enabling clinic',
      error: error.message
    });
  }
});

// DELETE /api/clinics/:id - Delete clinic
router.delete('/:id', async (req, res) => {
  try {
    const clinic = await Clinic.findByIdAndDelete(req.params.id);
    
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }
    
    console.log('✅ Clinic deleted successfully:', clinic.enName);
    
    res.json({
      success: true,
      message: 'Clinic deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting clinic:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error deleting clinic',
      error: error.message
    });
  }
});

module.exports = router;

