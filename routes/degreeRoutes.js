const express = require('express');
const mongoose = require('mongoose');
const Degree = require('../models/Degree');
const router = express.Router();

// GET /api/degrees/stats/summary - Get degree statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalDegrees = await Degree.countDocuments({ isActive: true });
    const activeDegrees = await Degree.countDocuments({ isActive: true, isDisabled: false });
    const disabledDegrees = await Degree.countDocuments({ isDisabled: true });
    const inactiveDegrees = await Degree.countDocuments({ isActive: false });
    
    res.json({
      success: true,
      data: {
        total: totalDegrees,
        active: activeDegrees,
        disabled: disabledDegrees,
        inactive: inactiveDegrees
      }
    });
  } catch (error) {
    console.error('Error fetching degree stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// GET /api/degrees - Get all degrees
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

    const degrees = await Degree.find(query)
      .select('-__v')
      .sort({ createdAt: -1 });
      
    res.json({
      success: true,
      count: degrees.length,
      data: degrees
    });
  } catch (error) {
    console.error('Error fetching degrees:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching degrees',
      error: error.message
    });
  }
});

// GET /api/degrees/:id - Get degree by ID
router.get('/:id', async (req, res) => {
  try {
    const degree = await Degree.findById(req.params.id).select('-__v');
    
    if (!degree) {
      return res.status(404).json({
        success: false,
        message: 'Degree not found'
      });
    }

    res.json({
      success: true,
      data: degree
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching degree',
      error: error.message
    });
  }
});

// POST /api/degrees - Create new degree
router.post('/', async (req, res) => {
  try {
    console.log('📝 Creating new degree with data:', req.body);
    
    const degree = new Degree(req.body);
    await degree.save();
    
    console.log('✅ Degree created successfully:', degree.enName);
    
    res.status(201).json({
      success: true,
      message: 'Degree created successfully',
      data: degree
    });
  } catch (error) {
    console.error('❌ Error creating degree:', error.message);
    
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
      message: 'Error creating degree',
      error: error.message
    });
  }
});

// PUT /api/degrees/:id - Update degree
router.put('/:id', async (req, res) => {
  try {
    const degree = await Degree.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!degree) {
      return res.status(404).json({
        success: false,
        message: 'Degree not found'
      });
    }

    res.json({
      success: true,
      message: 'Degree updated successfully',
      data: degree
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Degree name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating degree',
      error: error.message
    });
  }
});

// DELETE /api/degrees/:id - Delete degree (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const degree = await Degree.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!degree) {
      return res.status(404).json({
        success: false,
        message: 'Degree not found'
      });
    }

    res.json({
      success: true,
      message: 'Degree deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting degree',
      error: error.message
    });
  }
});

// PATCH /api/degrees/:id/disable - Disable degree
router.patch('/:id/disable', async (req, res) => {
  try {
    const { reason, disabledBy } = req.body;
    const degree = await Degree.findById(req.params.id);
    
    if (!degree) {
      return res.status(404).json({
        success: false,
        message: 'Degree not found'
      });
    }
    
    await degree.disableDegree(reason, disabledBy);
    
    res.json({
      success: true,
      message: 'Degree disabled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error disabling degree',
      error: error.message
    });
  }
});

// PATCH /api/degrees/:id/enable - Enable degree
router.patch('/:id/enable', async (req, res) => {
  try {
    const { enabledBy } = req.body;
    const degree = await Degree.findById(req.params.id);
    
    if (!degree) {
      return res.status(404).json({
        success: false,
        message: 'Degree not found'
      });
    }
    
    await degree.enableDegree(enabledBy);
    
    res.json({
      success: true,
      message: 'Degree enabled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error enabling degree',
      error: error.message
    });
  }
});

module.exports = router;

