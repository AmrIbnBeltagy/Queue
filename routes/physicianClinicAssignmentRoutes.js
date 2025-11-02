const express = require('express');
const mongoose = require('mongoose');
const PhysicianClinicAssignment = require('../models/PhysicianClinicAssignment');
const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');
const router = express.Router();

// GET /api/physician-clinic-assignments - Get all physician-clinic assignments
router.get('/', async (req, res) => {
  try {
    const { physician, clinic, active, page = 1, limit = 50 } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (physician) {
      filter.physician = physician;
    }
    
    if (clinic) {
      filter.clinic = clinic;
    }
    
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get assignments with pagination
    const assignments = await PhysicianClinicAssignment.find(filter)
      .populate({
        path: 'physicianSchedule',
        select: 'startTime endTime days',
        populate: {
          path: 'physician',
          select: 'name speciality degree email phone',
          populate: [
            { path: 'speciality', select: 'arName enName' },
            { path: 'degree', select: 'arName enName' }
          ]
        }
      })
      .populate('clinic', 'arName enName location')
      .populate('clinic.location', 'arName enName')
      .populate('assignedBy', 'name username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await PhysicianClinicAssignment.countDocuments(filter);

    res.json({
      success: true,
      data: assignments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching physician-clinic assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching physician-clinic assignments',
      error: error.message
    });
  }
});

// GET /api/physician-clinic-assignments/stats/summary - Get assignment statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await PhysicianClinicAssignment.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching assignment statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assignment statistics',
      error: error.message
    });
  }
});

// GET /api/physician-clinic-assignments/:id - Get assignment by ID
router.get('/:id', async (req, res) => {
  try {
    const assignment = await PhysicianClinicAssignment.findById(req.params.id)
      .populate({
        path: 'physicianSchedule',
        select: 'startTime endTime days',
        populate: {
          path: 'physician',
          select: 'name speciality degree email phone',
          populate: [
            { path: 'speciality', select: 'arName enName' },
            { path: 'degree', select: 'arName enName' }
          ]
        }
      })
      .populate('clinic', 'arName enName location')
      .populate('clinic.location', 'arName enName')
      .populate('assignedBy', 'name username');

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
    console.error('Error fetching assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assignment',
      error: error.message
    });
  }
});

// POST /api/physician-clinic-assignments - Create new assignment
router.post('/', async (req, res) => {
  try {
    const { physicianSchedule, clinic, notes } = req.body;

    // Validation
    if (!physicianSchedule || !clinic) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: physicianSchedule, clinic'
      });
    }

    // Validate physician schedule exists
    const PhysicianSchedule = require('../models/PhysicianSchedule');
    const scheduleExists = await PhysicianSchedule.findById(physicianSchedule);
    if (!scheduleExists) {
      return res.status(400).json({
        success: false,
        message: 'Physician schedule not found'
      });
    }

    // Validate clinic exists
    const clinicExists = await Clinic.findById(clinic);
    if (!clinicExists) {
      return res.status(400).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    // Check if assignment already exists and is active
    const existingAssignment = await PhysicianClinicAssignment.findOne({
      physicianSchedule: new mongoose.Types.ObjectId(physicianSchedule),
      clinic: new mongoose.Types.ObjectId(clinic),
      isActive: true
    });

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'This physician schedule is already assigned to this clinic'
      });
    }

    // Ensure no other active assignments exist for this clinic (deactivate ALL actives regardless of date)
    const clinicAlreadyAssigned = await PhysicianClinicAssignment.findOne({
      clinic: new mongoose.Types.ObjectId(clinic),
      isActive: true,
      physicianSchedule: { $ne: new mongoose.Types.ObjectId(physicianSchedule) }
    });

    if (clinicAlreadyAssigned) {
      // Deactivate existing active assignment(s) for this clinic to allow reassignment
      await PhysicianClinicAssignment.updateMany({
        clinic: new mongoose.Types.ObjectId(clinic),
        isActive: true,
        physicianSchedule: { $ne: new mongoose.Types.ObjectId(physicianSchedule) }
      }, { $set: { isActive: false, deactivatedAt: new Date(), deactivatedReason: 'Reassigned to another schedule' } });
    }

    // Get current user ID (from authentication middleware or session)
    const currentUserId = req.user?.id || req.session?.userId || req.body.userId || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    
    // Create new assignment
    const assignment = new PhysicianClinicAssignment({
      physicianSchedule: new mongoose.Types.ObjectId(physicianSchedule),
      clinic: new mongoose.Types.ObjectId(clinic),
      notes: notes || null,
      assignedBy: currentUserId, // Set to current user who is creating the assignment
      updatedBy: currentUserId
    });

    try {
      await assignment.save();
    } catch (e) {
      if (e && e.code === 11000) {
        // Attempt to drop legacy unique index if present, then retry once
        try {
          await PhysicianClinicAssignment.collection.dropIndex('physician_1_clinic_1_isActive_1');
        } catch (_) {}
        try {
          await assignment.save();
        } catch (e2) {
          return res.status(400).json({ success: false, message: 'Clinic already assigned as active. Please try again or refresh.' });
        }
      } else {
        throw e;
      }
    }

    // Populate the response
    await assignment.populate({
      path: 'physicianSchedule',
      select: 'startTime endTime days',
      populate: {
        path: 'physician',
        select: 'name speciality degree email phone',
        populate: [
          { path: 'speciality', select: 'arName enName' },
          { path: 'degree', select: 'arName enName' }
        ]
      }
    });
    await assignment.populate('clinic', 'arName enName location');
    await assignment.populate('clinic.location', 'arName enName');
    await assignment.populate('assignedBy', 'name username');
    await assignment.populate('updatedBy', 'name username');
    await assignment.populate('updatedBy', 'name username');

    res.status(201).json({
      success: true,
      message: 'Physician schedule assigned to clinic successfully',
      data: assignment
    });

  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating assignment',
      error: error.message
    });
  }
});

// PUT /api/physician-clinic-assignments/:id - Update assignment
router.put('/:id', async (req, res) => {
  try {
    const { physicianSchedule, clinic, notes, isActive, userId } = req.body;

    const assignment = await PhysicianClinicAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Validation
    if (!physicianSchedule || !clinic) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: physicianSchedule, clinic'
      });
    }

    // Validate physician schedule exists
    const PhysicianSchedule = require('../models/PhysicianSchedule');
    const scheduleExists = await PhysicianSchedule.findById(physicianSchedule);
    if (!scheduleExists) {
      return res.status(400).json({
        success: false,
        message: 'Physician schedule not found'
      });
    }

    // Validate clinic exists
    const clinicExists = await Clinic.findById(clinic);
    if (!clinicExists) {
      return res.status(400).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    // Check for duplicate assignment (excluding current one)
    const existingAssignment = await PhysicianClinicAssignment.findOne({
      physicianSchedule: new mongoose.Types.ObjectId(physicianSchedule),
      clinic: new mongoose.Types.ObjectId(clinic),
      isActive: true,
      _id: { $ne: req.params.id }
    });

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'This physician schedule is already assigned to this clinic'
      });
    }

    // Ensure no other active assignments exist for this clinic (excluding current assignment)
    const clinicAlreadyAssigned = await PhysicianClinicAssignment.findOne({
      clinic: new mongoose.Types.ObjectId(clinic),
      isActive: true,
      physicianSchedule: { $ne: new mongoose.Types.ObjectId(physicianSchedule) },
      _id: { $ne: req.params.id }
    });

    if (clinicAlreadyAssigned) {
      // Deactivate existing active assignment(s) to allow reassignment
      await PhysicianClinicAssignment.updateMany({
        clinic: new mongoose.Types.ObjectId(clinic),
        isActive: true,
        physicianSchedule: { $ne: new mongoose.Types.ObjectId(physicianSchedule) },
        _id: { $ne: req.params.id }
      }, { $set: { isActive: false, deactivatedAt: new Date(), deactivatedReason: 'Reassigned to another schedule' } });
    }

    // If clinic is changing, record previous clinic for audit
    const incomingClinicId = String(clinic);
    const currentClinicId = String(assignment.clinic);
    if (incomingClinicId !== currentClinicId) {
      assignment.previousClinic = assignment.clinic;
      assignment.previousUpdatedAt = new Date();
      assignment.previousUpdatedBy = userId || req.user?.id || req.session?.userId || assignment.updatedBy;
    }

    // Update assignment
    assignment.physicianSchedule = new mongoose.Types.ObjectId(physicianSchedule);
    assignment.clinic = new mongoose.Types.ObjectId(clinic);
    assignment.notes = notes || null;
    if (isActive !== undefined) {
      assignment.isActive = isActive;
    }
    // Track updater
    assignment.updatedBy = userId || req.user?.id || req.session?.userId || assignment.updatedBy;

    try {
      await assignment.save();
    } catch (e) {
      if (e && e.code === 11000) {
        // Drop legacy index and retry once
        try {
          await PhysicianClinicAssignment.collection.dropIndex('physician_1_clinic_1_isActive_1');
        } catch (_) {}
        try {
          await assignment.save();
        } catch (e2) {
          return res.status(400).json({ success: false, message: 'Clinic already assigned as active. Please try again or refresh.' });
        }
      } else {
        throw e;
      }
    }

    // Populate the response
    await assignment.populate({
      path: 'physicianSchedule',
      select: 'startTime endTime days',
      populate: {
        path: 'physician',
        select: 'name speciality degree email phone',
        populate: [
          { path: 'speciality', select: 'arName enName' },
          { path: 'degree', select: 'arName enName' }
        ]
      }
    });
    await assignment.populate('clinic', 'arName enName location');
    await assignment.populate('clinic.location', 'arName enName');
    await assignment.populate('assignedBy', 'name username');
    await assignment.populate('updatedBy', 'name username');
    await assignment.populate('previousClinic', 'arName enName');
    await assignment.populate('previousUpdatedBy', 'name username');

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: assignment
    });

  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating assignment',
      error: error.message
    });
  }
});

// PATCH /api/physician-clinic-assignments/:id/toggle-status - Toggle assignment status
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const assignment = await PhysicianClinicAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Get current user ID for tracking who made the change
    const currentUserId = req.user?.id || req.session?.userId || req.body.userId || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    
    if (assignment.isActive) {
      await assignment.deactivate(currentUserId);
    } else {
      await assignment.reactivate(currentUserId);
    }

    // Populate the response
    await assignment.populate({
      path: 'physicianSchedule',
      select: 'startTime endTime days',
      populate: {
        path: 'physician',
        select: 'name speciality degree email phone',
        populate: [
          { path: 'speciality', select: 'arName enName' },
          { path: 'degree', select: 'arName enName' }
        ]
      }
    });
    await assignment.populate('clinic', 'arName enName location');
    await assignment.populate('clinic.location', 'arName enName');
    await assignment.populate('assignedBy', 'name username');

    res.json({
      success: true,
      message: `Assignment ${assignment.isActive ? 'activated' : 'deactivated'} successfully`,
      data: assignment
    });

  } catch (error) {
    console.error('Error toggling assignment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling assignment status',
      error: error.message
    });
  }
});

// DELETE /api/physician-clinic-assignments/:id - Delete assignment
router.delete('/:id', async (req, res) => {
  try {
    const assignment = await PhysicianClinicAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    await PhysicianClinicAssignment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting assignment',
      error: error.message
    });
  }
});

// GET /api/physician-clinic-assignments/physician/:physicianId - Get assignments for a specific physician
router.get('/physician/:physicianId', async (req, res) => {
  try {
    const { active = true } = req.query;
    const assignments = await PhysicianClinicAssignment.findByPhysician(req.params.physicianId, active === 'true');

    res.json({
      success: true,
      data: assignments
    });

  } catch (error) {
    console.error('Error fetching physician assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching physician assignments',
      error: error.message
    });
  }
});

// GET /api/physician-clinic-assignments/clinic/:clinicId - Get assignments for a specific clinic
router.get('/clinic/:clinicId', async (req, res) => {
  try {
    const { active = true } = req.query;
    const assignments = await PhysicianClinicAssignment.findByClinic(req.params.clinicId, active === 'true');

    res.json({
      success: true,
      data: assignments
    });

  } catch (error) {
    console.error('Error fetching clinic assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clinic assignments',
      error: error.message
    });
  }
});

// GET /api/physician-clinic-assignments/schedule/:scheduleId - Get assignments for a specific physician schedule
router.get('/schedule/:scheduleId', async (req, res) => {
  try {
    const { active = true } = req.query;
    const filter = { physicianSchedule: req.params.scheduleId };
    if (active === 'true') filter.isActive = true;

    const assignments = await PhysicianClinicAssignment.find(filter)
      .populate({
        path: 'physicianSchedule',
        select: 'startTime endTime days',
        populate: {
          path: 'physician',
          select: 'name speciality degree email phone',
          populate: [
            { path: 'speciality', select: 'arName enName' },
            { path: 'degree', select: 'arName enName' }
          ]
        }
      })
      .populate('clinic', 'arName enName location')
      .populate('clinic.location', 'arName enName')
      .populate('assignedBy', 'name username')
      .populate('updatedBy', 'name username')
      .populate('previousClinic', 'arName enName')
      .populate('previousUpdatedBy', 'name username');

    res.json({
      success: true,
      data: assignments
    });

  } catch (error) {
    console.error('Error fetching schedule assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedule assignments',
      error: error.message
    });
  }
});

module.exports = router;
