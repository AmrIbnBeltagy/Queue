const express = require('express');
const mongoose = require('mongoose');
const ShippingCompany = require('../models/ShippingCompany');
const router = express.Router();

// GET /api/shipping-companies/stats/summary - Get shipping company statistics
// NOTE: This MUST come before /:id route to avoid being matched as an ID
router.get('/stats/summary', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available',
        data: {
          total: 0,
          active: 0,
          inactive: 0
        }
      });
    }

    const totalCompanies = await ShippingCompany.countDocuments();
    const activeCompanies = await ShippingCompany.countDocuments({ isActive: true });
    const inactiveCompanies = await ShippingCompany.countDocuments({ isActive: false });

    // Service breakdown
    const serviceStats = await ShippingCompany.aggregate([
      { $unwind: '$services' },
      {
        $group: {
          _id: '$services',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        total: totalCompanies,
        active: activeCompanies,
        inactive: inactiveCompanies,
        services: serviceStats
      }
    });
  } catch (error) {
    console.error('Error fetching shipping company statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching shipping company statistics',
      error: error.message
    });
  }
});

// GET /api/shipping-companies - Get all shipping companies with filtering options
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

    const { status, service } = req.query;
    
    // Build filter object
    let filter = {};
    
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }
    
    if (service) {
      filter.services = service;
    }

    const companies = await ShippingCompany.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: companies.length,
      data: companies
    });
  } catch (error) {
    console.error('Error fetching shipping companies:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching shipping companies',
      error: error.message
    });
  }
});

// GET /api/shipping-companies/:id - Get shipping company by ID
router.get('/:id', async (req, res) => {
  try {
    const company = await ShippingCompany.findById(req.params.id).select('-__v');
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Shipping company not found'
      });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching shipping company',
      error: error.message
    });
  }
});

// POST /api/shipping-companies - Create new shipping company
router.post('/', async (req, res) => {
  try {
    const company = new ShippingCompany(req.body);
    await company.save();
    
    res.status(201).json({
      success: true,
      message: 'Shipping company created successfully',
      data: company
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
      message: 'Error creating shipping company',
      error: error.message
    });
  }
});

// PUT /api/shipping-companies/:id - Update shipping company
router.put('/:id', async (req, res) => {
  try {
    const company = await ShippingCompany.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Shipping company not found'
      });
    }

    res.json({
      success: true,
      message: 'Shipping company updated successfully',
      data: company
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
      message: 'Error updating shipping company',
      error: error.message
    });
  }
});

// PATCH /api/shipping-companies/:id/toggle-status - Toggle active status
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const company = await ShippingCompany.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Shipping company not found'
      });
    }

    if (company.isActive) {
      await company.deactivate();
    } else {
      await company.activate();
    }

    res.json({
      success: true,
      message: `Shipping company ${company.isActive ? 'activated' : 'deactivated'} successfully`,
      data: company
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating shipping company status',
      error: error.message
    });
  }
});

// DELETE /api/shipping-companies/:id - Delete shipping company
router.delete('/:id', async (req, res) => {
  try {
    const company = await ShippingCompany.findByIdAndDelete(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Shipping company not found'
      });
    }

    res.json({
      success: true,
      message: 'Shipping company deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting shipping company',
      error: error.message
    });
  }
});

module.exports = router;
