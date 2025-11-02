const express = require('express');
const mongoose = require('mongoose');
const Group = require('../models/Group');
const Area = require('../models/Area');
const router = express.Router();

// GET /api/groups/stats/summary - Get group statistics
router.get('/stats/summary', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available',
        data: { total: 0, active: 0, inactive: 0 }
      });
    }

    const totalGroups = await Group.countDocuments();
    const activeGroups = await Group.countDocuments({ isActive: true });
    const inactiveGroups = await Group.countDocuments({ isActive: false });

    res.json({
      success: true,
      data: {
        total: totalGroups,
        active: activeGroups,
        inactive: inactiveGroups
      }
    });
  } catch (error) {
    console.error('Error fetching group statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching group statistics',
      error: error.message
    });
  }
});

// GET /api/groups - Get all groups
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available',
        data: []
      });
    }

    const { status } = req.query;
    let filter = {};
    
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    const groups = await Group.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching groups',
      error: error.message
    });
  }
});

// GET /api/groups/:id - Get group by ID
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).select('-__v');
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching group',
      error: error.message
    });
  }
});

// POST /api/groups - Create new group
router.post('/', async (req, res) => {
  try {
    const group = new Group(req.body);
    await group.save();
    
    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: group
    });
  } catch (error) {
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
        message: `${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating group',
      error: error.message
    });
  }
});

// PUT /api/groups/:id - Update group
router.put('/:id', async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    res.json({
      success: true,
      message: 'Group updated successfully',
      data: group
    });
  } catch (error) {
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
        message: `${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating group',
      error: error.message
    });
  }
});

// PATCH /api/groups/:id/toggle-status - Toggle active status
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (group.isActive) {
      await group.deactivate();
    } else {
      await group.activate();
    }

    res.json({
      success: true,
      message: `Group ${group.isActive ? 'activated' : 'deactivated'} successfully`,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating group status',
      error: error.message
    });
  }
});

// DELETE /api/groups/:id - Delete group
router.delete('/:id', async (req, res) => {
  try {
    // Check if group has areas assigned
    const areasCount = await Area.countDocuments({ group: req.params.id });
    
    if (areasCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete group. It has ${areasCount} area(s) assigned. Please unassign areas first.`
      });
    }

    const group = await Group.findByIdAndDelete(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting group',
      error: error.message
    });
  }
});

module.exports = router;
