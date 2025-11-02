const express = require('express');
const mongoose = require('mongoose');
const Area = require('../models/Area');
const Group = require('../models/Group');
const router = express.Router();

// GET /api/areas/stats/summary - Get area statistics
router.get('/stats/summary', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available',
        data: { total: 0, assigned: 0, unassigned: 0 }
      });
    }

    const totalAreas = await Area.countDocuments();
    const assignedAreas = await Area.countDocuments({ group: { $ne: null } });
    const unassignedAreas = await Area.countDocuments({ group: null });

    res.json({
      success: true,
      data: {
        total: totalAreas,
        assigned: assignedAreas,
        unassigned: unassignedAreas
      }
    });
  } catch (error) {
    console.error('Error fetching area statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching area statistics',
      error: error.message
    });
  }
});

// GET /api/areas - Get all areas
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available',
        data: []
      });
    }

    const { status, group } = req.query;
    let filter = {};
    
    if (status === 'assigned') {
      filter.group = { $ne: null };
    } else if (status === 'unassigned') {
      filter.group = null;
    }
    
    if (group) {
      filter.group = group;
    }

    const areas = await Area.find(filter)
      .populate('group', 'name code')
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: areas.length,
      data: areas
    });
  } catch (error) {
    console.error('Error fetching areas:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching areas',
      error: error.message
    });
  }
});

// GET /api/areas/:id - Get area by ID
router.get('/:id', async (req, res) => {
  try {
    const area = await Area.findById(req.params.id)
      .populate('group', 'name code')
      .select('-__v');
    
    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }

    res.json({
      success: true,
      data: area
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching area',
      error: error.message
    });
  }
});

// POST /api/areas - Create new area
router.post('/', async (req, res) => {
  try {
    const area = new Area(req.body);
    await area.save();
    
    // Update group statistics if area is assigned to a group
    if (area.group) {
      await Group.findByIdAndUpdate(area.group, {
        $inc: { 'statistics.totalAreas': 1 }
      });
    }
    
    await area.populate('group', 'name code');
    
    res.status(201).json({
      success: true,
      message: 'Area created successfully',
      data: area
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
      message: 'Error creating area',
      error: error.message
    });
  }
});

// PUT /api/areas/:id - Update area
router.put('/:id', async (req, res) => {
  try {
    const oldArea = await Area.findById(req.params.id);
    
    if (!oldArea) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }

    const oldGroupId = oldArea.group;
    const newGroupId = req.body.group;

    const area = await Area.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('group', 'name code').select('-__v');

    // Update group statistics if group changed
    if (oldGroupId && !newGroupId) {
      // Unassigned from group
      await Group.findByIdAndUpdate(oldGroupId, {
        $inc: { 'statistics.totalAreas': -1 }
      });
    } else if (!oldGroupId && newGroupId) {
      // Assigned to group
      await Group.findByIdAndUpdate(newGroupId, {
        $inc: { 'statistics.totalAreas': 1 }
      });
    } else if (oldGroupId && newGroupId && oldGroupId.toString() !== newGroupId.toString()) {
      // Changed group
      await Group.findByIdAndUpdate(oldGroupId, {
        $inc: { 'statistics.totalAreas': -1 }
      });
      await Group.findByIdAndUpdate(newGroupId, {
        $inc: { 'statistics.totalAreas': 1 }
      });
    }

    res.json({
      success: true,
      message: 'Area updated successfully',
      data: area
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
      message: 'Error updating area',
      error: error.message
    });
  }
});

// PATCH /api/areas/:id/assign - Assign area to group
router.patch('/:id/assign', async (req, res) => {
  try {
    const { groupId } = req.body;
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Group ID is required'
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const area = await Area.findById(req.params.id);
    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }

    const oldGroupId = area.group;
    area.group = groupId;
    await area.save();
    await area.populate('group', 'name code');

    // Update statistics
    if (oldGroupId) {
      await Group.findByIdAndUpdate(oldGroupId, {
        $inc: { 'statistics.totalAreas': -1 }
      });
    }
    await Group.findByIdAndUpdate(groupId, {
      $inc: { 'statistics.totalAreas': 1 }
    });

    res.json({
      success: true,
      message: 'Area assigned to group successfully',
      data: area
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error assigning area to group',
      error: error.message
    });
  }
});

// PATCH /api/areas/:id/unassign - Unassign area from group
router.patch('/:id/unassign', async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);
    
    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }

    const oldGroupId = area.group;
    area.group = null;
    await area.save();

    // Update statistics
    if (oldGroupId) {
      await Group.findByIdAndUpdate(oldGroupId, {
        $inc: { 'statistics.totalAreas': -1 }
      });
    }

    res.json({
      success: true,
      message: 'Area unassigned from group successfully',
      data: area
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error unassigning area from group',
      error: error.message
    });
  }
});

// DELETE /api/areas/:id - Delete area
router.delete('/:id', async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }

    // Update group statistics if area was assigned
    if (area.group) {
      await Group.findByIdAndUpdate(area.group, {
        $inc: { 'statistics.totalAreas': -1 }
      });
    }

    await Area.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Area deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting area',
      error: error.message
    });
  }
});

module.exports = router;
