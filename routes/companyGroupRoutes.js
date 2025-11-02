const express = require('express');
const mongoose = require('mongoose');
const CompanyGroupAssignment = require('../models/CompanyGroupAssignment');
const ShippingCompany = require('../models/ShippingCompany');
const Group = require('../models/Group');
const router = express.Router();

// GET /api/company-groups - Get all assignments with populated data
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available',
        data: []
      });
    }

    const { company, group } = req.query;
    let filter = {};
    
    if (company) filter.company = company;
    if (group) filter.group = group;

    const assignments = await CompanyGroupAssignment.find(filter)
      .populate('company', 'name code')
      .populate('group', 'name code')
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assignments',
      error: error.message
    });
  }
});

// GET /api/company-groups/:id - Get assignment by ID
router.get('/:id', async (req, res) => {
  try {
    const assignment = await CompanyGroupAssignment.findById(req.params.id)
      .populate('company', 'name code')
      .populate('group', 'name code')
      .select('-__v');
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching assignment',
      error: error.message
    });
  }
});

// GET /api/company-groups/company/:companyId - Get all groups for a company
router.get('/company/:companyId', async (req, res) => {
  try {
    const assignments = await CompanyGroupAssignment.find({ 
      company: req.params.companyId,
      isActive: true 
    })
      .populate('group', 'name code')
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching company groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company groups',
      error: error.message
    });
  }
});

// GET /api/company-groups/group/:groupId - Get all companies for a group
router.get('/group/:groupId', async (req, res) => {
  try {
    const assignments = await CompanyGroupAssignment.find({ 
      group: req.params.groupId,
      isActive: true 
    })
      .populate('company', 'name code')
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching group companies:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching group companies',
      error: error.message
    });
  }
});

// POST /api/company-groups - Create new assignment
router.post('/', async (req, res) => {
  try {
    const { company, group } = req.body;
    
    // Verify company exists
    const companyExists = await ShippingCompany.findById(company);
    if (!companyExists) {
      return res.status(404).json({
        success: false,
        message: 'Shipping company not found'
      });
    }
    
    // Verify group exists
    const groupExists = await Group.findById(group);
    if (!groupExists) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const assignment = new CompanyGroupAssignment(req.body);
    await assignment.save();
    
    await assignment.populate([
      { path: 'company', select: 'name code' },
      { path: 'group', select: 'name code' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: assignment
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
      return res.status(400).json({
        success: false,
        message: 'This company is already assigned to this group'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating assignment',
      error: error.message
    });
  }
});

// PUT /api/company-groups/:id - Update assignment
router.put('/:id', async (req, res) => {
  try {
    const assignment = await CompanyGroupAssignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('company', 'name code')
      .populate('group', 'name code')
      .select('-__v');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: assignment
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

    res.status(500).json({
      success: false,
      message: 'Error updating assignment',
      error: error.message
    });
  }
});

// PATCH /api/company-groups/:id/toggle-status - Toggle active status
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const assignment = await CompanyGroupAssignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    assignment.isActive = !assignment.isActive;
    await assignment.save();
    
    await assignment.populate([
      { path: 'company', select: 'name code' },
      { path: 'group', select: 'name code' }
    ]);

    res.json({
      success: true,
      message: `Assignment ${assignment.isActive ? 'activated' : 'deactivated'} successfully`,
      data: assignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating assignment status',
      error: error.message
    });
  }
});

// DELETE /api/company-groups/:id - Delete assignment
router.delete('/:id', async (req, res) => {
  try {
    const assignment = await CompanyGroupAssignment.findByIdAndDelete(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting assignment',
      error: error.message
    });
  }
});

module.exports = router;
