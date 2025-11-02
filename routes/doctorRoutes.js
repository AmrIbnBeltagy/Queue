const express = require('express');
const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const router = express.Router();

// GET /api/doctors/stats/summary - Get doctor statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalDoctors = await Doctor.countDocuments({ isActive: true });
    const activeDoctors = await Doctor.countDocuments({ isActive: true, isDisabled: false });
    const disabledDoctors = await Doctor.countDocuments({ isDisabled: true });
    const inactiveDoctors = await Doctor.countDocuments({ isActive: false });
    
    res.json({
      success: true,
      data: {
        total: totalDoctors,
        active: activeDoctors,
        disabled: disabledDoctors,
        inactive: inactiveDoctors
      }
    });
  } catch (error) {
    console.error('Error fetching doctor stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// GET /api/doctors - Get all doctors
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

    const { speciality, search, isActive } = req.query;
    let query = {};
    
    if (speciality) {
      query.speciality = { $regex: speciality, $options: 'i' };
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { speciality: { $regex: search, $options: 'i' } }
      ];
    }

    const doctors = await Doctor.find(query)
      .populate('user', 'name username email role isActive')
      .populate('speciality', 'code arName enName')
      .populate('degree', 'arName enName')
      .select('-password -__v')
      .sort({ createdAt: -1 });
      
    res.json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching doctors',
      error: error.message
    });
  }
});

// GET /api/doctors/:id - Get doctor by ID
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('user', 'name username email role isActive')
      .populate('speciality', 'code arName enName')
      .populate('degree', 'arName enName')
      .select('-password -__v');
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      data: doctor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching doctor',
      error: error.message
    });
  }
});

// POST /api/doctors - Create new doctor
router.post('/', async (req, res) => {
  try {
    console.log('📝 Creating new doctor with data:', { ...req.body, password: '***' });
    
    // First create the user account
    const userData = {
      name: req.body.name,
      username: req.body.username,
      email: req.body.email,
      phone: req.body.phone,
      password: req.body.password,
      role: 'doctor'
    };
    
    const user = new User(userData);
    await user.save();
    
    console.log('✅ User created successfully:', user.username);
    
    // Then create the doctor profile
    const doctorData = {
      name: req.body.name,
      code: req.body.code,
      speciality: req.body.speciality,
      degree: req.body.degree,
      email: req.body.email,
      phone: req.body.phone,
      username: req.body.username,
      password: req.body.password,
      user: user._id,
      licenseNumber: req.body.licenseNumber
    };
    
    const doctor = new Doctor(doctorData);
    await doctor.save();
    
    console.log('✅ Doctor created successfully:', doctor.name);
    
    // Populate the user data in response
    const populatedDoctor = await Doctor.findById(doctor._id)
      .populate('user', 'name username email role isActive')
      .populate('speciality', 'code arName enName')
      .populate('degree', 'arName enName')
      .select('-password -__v');
    
    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: populatedDoctor
    });
  } catch (error) {
    console.error('❌ Error creating doctor:', error.message);
    
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
      message: 'Error creating doctor',
      error: error.message
    });
  }
});

// PUT /api/doctors/:id - Update doctor
router.put('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    
    // Update doctor data
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'name username email role isActive')
     .select('-password -__v');
    
    // Also update the linked user if needed
    if (req.body.name || req.body.email || req.body.phone) {
      const userUpdateData = {};
      if (req.body.name) userUpdateData.name = req.body.name;
      if (req.body.email) userUpdateData.email = req.body.email;
      if (req.body.phone) userUpdateData.phone = req.body.phone;
      
      await User.findByIdAndUpdate(doctor.user, userUpdateData);
    }

    res.json({
      success: true,
      message: 'Doctor updated successfully',
      data: updatedDoctor
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email, code, or username already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating doctor',
      error: error.message
    });
  }
});

// DELETE /api/doctors/:id - Delete doctor (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    
    // Soft delete doctor
    await Doctor.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    // Also deactivate the linked user
    await User.findByIdAndUpdate(
      doctor.user,
      { isActive: false },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Doctor deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting doctor',
      error: error.message
    });
  }
});

// PATCH /api/doctors/:id/disable - Disable doctor
router.patch('/:id/disable', async (req, res) => {
  try {
    const { reason, disabledBy } = req.body;
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    
    await doctor.disableDoctor(reason, disabledBy);
    
    res.json({
      success: true,
      message: 'Doctor disabled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error disabling doctor',
      error: error.message
    });
  }
});

// PATCH /api/doctors/:id/enable - Enable doctor
router.patch('/:id/enable', async (req, res) => {
  try {
    const { enabledBy } = req.body;
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    
    await doctor.enableDoctor(enabledBy);
    
    res.json({
      success: true,
      message: 'Doctor enabled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error enabling doctor',
      error: error.message
    });
  }
});

module.exports = router;
