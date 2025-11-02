const express = require('express');
const mongoose = require('mongoose');
const Speciality = require('../models/Speciality');
const router = express.Router();

// GET /api/specialities/next-code - Get next available code
router.get('/next-code', async (req, res) => {
  try {
    // Find the highest existing code with SP- prefix
    const existingSpecialities = await Speciality.find({ 
      code: { $regex: /^SP-\d+$/ } 
    }).sort({ code: -1 }).limit(1);
    
    let nextNumber = 1;
    if (existingSpecialities.length > 0) {
      const lastCode = existingSpecialities[0].code;
      const lastNumber = parseInt(lastCode.replace('SP-', ''));
      nextNumber = lastNumber + 1;
    }
    
    const nextCode = `SP-${nextNumber.toString().padStart(3, '0')}`;
    
    res.json({
      success: true,
      code: nextCode
    });
  } catch (error) {
    console.error('Error generating next code:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating next code',
      error: error.message
    });
  }
});

// GET /api/specialities/stats/summary - Get speciality statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalSpecialities = await Speciality.countDocuments({ isActive: true });
    const activeSpecialities = await Speciality.countDocuments({ isActive: true, isDisabled: false });
    const disabledSpecialities = await Speciality.countDocuments({ isDisabled: true });
    const inactiveSpecialities = await Speciality.countDocuments({ isActive: false });
    
    res.json({
      success: true,
      data: {
        total: totalSpecialities,
        active: activeSpecialities,
        disabled: disabledSpecialities,
        inactive: inactiveSpecialities
      }
    });
  } catch (error) {
    console.error('Error fetching speciality stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// GET /api/specialities - Get all specialities
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
        { code: { $regex: search, $options: 'i' } },
        { arName: { $regex: search, $options: 'i' } },
        { enName: { $regex: search, $options: 'i' } }
      ];
    }

    const specialities = await Speciality.find(query)
      .select('-__v')
      .sort({ createdAt: -1 });
      
    res.json({
      success: true,
      count: specialities.length,
      data: specialities
    });
  } catch (error) {
    console.error('Error fetching specialities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching specialities',
      error: error.message
    });
  }
});

// GET /api/specialities/:id - Get speciality by ID
router.get('/:id', async (req, res) => {
  try {
    const speciality = await Speciality.findById(req.params.id).select('-__v');
    
    if (!speciality) {
      return res.status(404).json({
        success: false,
        message: 'Speciality not found'
      });
    }

    res.json({
      success: true,
      data: speciality
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching speciality',
      error: error.message
    });
  }
});

// POST /api/specialities - Create new speciality
router.post('/', async (req, res) => {
  try {
    console.log('📝 Creating new speciality with data:', req.body);
    
    const speciality = new Speciality(req.body);
    await speciality.save();
    
    console.log('✅ Speciality created successfully:', speciality.enName);
    
    res.status(201).json({
      success: true,
      message: 'Speciality created successfully',
      data: speciality
    });
  } catch (error) {
    console.error('❌ Error creating speciality:', error.message);
    
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
      message: 'Error creating speciality',
      error: error.message
    });
  }
});

// PUT /api/specialities/:id - Update speciality
router.put('/:id', async (req, res) => {
  try {
    const speciality = await Speciality.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!speciality) {
      return res.status(404).json({
        success: false,
        message: 'Speciality not found'
      });
    }

    res.json({
      success: true,
      message: 'Speciality updated successfully',
      data: speciality
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Speciality code or name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating speciality',
      error: error.message
    });
  }
});

// DELETE /api/specialities/:id - Delete speciality (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const speciality = await Speciality.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!speciality) {
      return res.status(404).json({
        success: false,
        message: 'Speciality not found'
      });
    }

    res.json({
      success: true,
      message: 'Speciality deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting speciality',
      error: error.message
    });
  }
});

// PATCH /api/specialities/:id/disable - Disable speciality
router.patch('/:id/disable', async (req, res) => {
  try {
    const { reason, disabledBy } = req.body;
    const speciality = await Speciality.findById(req.params.id);
    
    if (!speciality) {
      return res.status(404).json({
        success: false,
        message: 'Speciality not found'
      });
    }
    
    await speciality.disableSpeciality(reason, disabledBy);
    
    res.json({
      success: true,
      message: 'Speciality disabled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error disabling speciality',
      error: error.message
    });
  }
});

// PATCH /api/specialities/:id/enable - Enable speciality
router.patch('/:id/enable', async (req, res) => {
  try {
    const { enabledBy } = req.body;
    const speciality = await Speciality.findById(req.params.id);
    
    if (!speciality) {
      return res.status(404).json({
        success: false,
        message: 'Speciality not found'
      });
    }
    
    await speciality.enableSpeciality(enabledBy);
    
    res.json({
      success: true,
      message: 'Speciality enabled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error enabling speciality',
      error: error.message
    });
  }
});

module.exports = router;

