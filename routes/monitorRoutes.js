const express = require('express');
const mongoose = require('mongoose');
const Monitor = require('../models/Monitor');
const Clinic = require('../models/Clinic');
const router = express.Router();

// GET /api/monitors/stats/summary - Get monitor statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalMonitors = await Monitor.countDocuments({ isActive: true });
    const activeMonitors = await Monitor.countDocuments({ isActive: true, isDisabled: false });
    const disabledMonitors = await Monitor.countDocuments({ isDisabled: true });
    const inactiveMonitors = await Monitor.countDocuments({ isActive: false });
    
    res.json({
      success: true,
      data: {
        total: totalMonitors,
        active: activeMonitors,
        disabled: disabledMonitors,
        inactive: inactiveMonitors
      }
    });
  } catch (error) {
    console.error('Error fetching monitor stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// GET /api/monitors - Get all monitors
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
        { enName: { $regex: search, $options: 'i' } },
        { ip: { $regex: search, $options: 'i' } }
      ];
    }

    const monitors = await Monitor.find(query)
      .populate('assignedClinics.clinic', 'arName enName location')
      .sort({ createdAt: -1 });
      
    res.json({
      success: true,
      count: monitors.length,
      data: monitors
    });
  } catch (error) {
    console.error('Error fetching monitors:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monitors',
      error: error.message
    });
  }
});

// GET /api/monitors/:id - Get monitor by ID
router.get('/:id', async (req, res) => {
  try {
    const monitor = await Monitor.findById(req.params.id)
      .populate('assignedClinics.clinic', 'arName enName location');
    
    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }
    
    res.json({
      success: true,
      data: monitor
    });
  } catch (error) {
    console.error('Error fetching monitor:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monitor',
      error: error.message
    });
  }
});

// POST /api/monitors - Create new monitor
router.post('/', async (req, res) => {
  try {
    console.log('📝 Creating new monitor with data:', req.body);
    
    const monitor = new Monitor(req.body);
    await monitor.save();
    
    console.log('✅ Monitor created successfully:', monitor.enName);
    
    res.status(201).json({
      success: true,
      message: 'Monitor created successfully',
      data: monitor
    });
  } catch (error) {
    console.error('❌ Error creating monitor:', error.message);
    
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
      message: 'Error creating monitor',
      error: error.message
    });
  }
});

// PUT /api/monitors/:id - Update monitor
router.put('/:id', async (req, res) => {
  try {
    console.log('📝 Updating monitor with data:', req.body);
    
    const monitor = await Monitor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }
    
    console.log('✅ Monitor updated successfully:', monitor.enName);
    
    res.json({
      success: true,
      message: 'Monitor updated successfully',
      data: monitor
    });
  } catch (error) {
    console.error('❌ Error updating monitor:', error.message);
    
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
      message: 'Error updating monitor',
      error: error.message
    });
  }
});

// PATCH /api/monitors/:id/disable - Disable monitor
router.patch('/:id/disable', async (req, res) => {
  try {
    const { disabledBy, disabledReason } = req.body;
    
    const monitor = await Monitor.findByIdAndUpdate(
      req.params.id,
      {
        isDisabled: true,
        disabledDate: new Date(),
        disabledBy: disabledBy,
        disabledReason: disabledReason
      },
      { new: true }
    );
    
    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }
    
    console.log('✅ Monitor disabled successfully:', monitor.enName);
    
    res.json({
      success: true,
      message: 'Monitor disabled successfully',
      data: monitor
    });
  } catch (error) {
    console.error('❌ Error disabling monitor:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error disabling monitor',
      error: error.message
    });
  }
});

// PATCH /api/monitors/:id/enable - Enable monitor
router.patch('/:id/enable', async (req, res) => {
  try {
    const { enabledBy } = req.body;
    
    const monitor = await Monitor.findByIdAndUpdate(
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
    
    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }
    
    console.log('✅ Monitor enabled successfully:', monitor.enName);
    
    res.json({
      success: true,
      message: 'Monitor enabled successfully',
      data: monitor
    });
  } catch (error) {
    console.error('❌ Error enabling monitor:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error enabling monitor',
      error: error.message
    });
  }
});

// PATCH /api/monitors/:id/assign-clinics - Assign multiple clinics to monitor
router.patch('/:id/assign-clinics', async (req, res) => {
  try {
    const { clinicIds, notes, assignedBy } = req.body;
    
    // Verify all clinics exist if provided
    if (clinicIds && clinicIds.length > 0) {
      const clinics = await Clinic.find({ _id: { $in: clinicIds } });
      if (clinics.length !== clinicIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more clinic IDs are invalid'
        });
      }
    }
    
    const monitor = await Monitor.findById(req.params.id);
    
    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }
    
    // Update assigned clinics
    if (clinicIds && clinicIds.length > 0) {
      monitor.assignedClinics = clinicIds.map(clinicId => ({
        clinic: clinicId,
        assignedDate: new Date(),
        assignedBy: assignedBy || 'System',
        notes: notes || null
      }));
    } else {
      // Remove all clinic assignments
      monitor.assignedClinics = [];
    }
    
    await monitor.save();
    
    // Populate the result
    await monitor.populate('assignedClinics.clinic', 'arName enName location');
    
    console.log('✅ Clinics assigned to monitor successfully:', monitor.enName);
    
    res.json({
      success: true,
      message: clinicIds && clinicIds.length > 0 ? 
        `${clinicIds.length} clinic(s) assigned successfully` : 
        'All clinic assignments removed successfully',
      data: monitor
    });
  } catch (error) {
    console.error('❌ Error assigning clinics to monitor:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error assigning clinics to monitor',
      error: error.message
    });
  }
});

// DELETE /api/monitors/:id - Delete monitor
router.delete('/:id', async (req, res) => {
  try {
    const monitor = await Monitor.findByIdAndDelete(req.params.id);
    
    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }
    
    console.log('✅ Monitor deleted successfully:', monitor.enName);
    
    res.json({
      success: true,
      message: 'Monitor deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting monitor:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error deleting monitor',
      error: error.message
    });
  }
});

module.exports = router;
