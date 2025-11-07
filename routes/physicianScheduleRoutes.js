const express = require('express');
const mongoose = require('mongoose');
const PhysicianSchedule = require('../models/PhysicianSchedule');
const Doctor = require('../models/Doctor');
const router = express.Router();

// Parse time string to minutes for comparison
function parseTimeToMinutes(timeString) {
  if (!timeString) return 0;
  
  // Handle both 24-hour and 12-hour formats
  let time = timeString.trim();
  
  // Convert 12-hour format to 24-hour format
  if (time.includes('AM') || time.includes('PM')) {
    const [timePart, period] = time.split(/(AM|PM)/i);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    let hour24 = hours;
    if (period.toUpperCase() === 'AM' && hours === 12) {
      hour24 = 0;
    } else if (period.toUpperCase() === 'PM' && hours !== 12) {
      hour24 = hours + 12;
    }
    
    return hour24 * 60 + (minutes || 0);
  } else {
    // Handle 24-hour format (HH:MM)
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      console.warn('Invalid time format:', timeString);
      return 0;
    }
    return hours * 60 + (minutes || 0);
  }
}

// GET /api/physician-schedules - Get all physician schedules with filtering options
router.get('/', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { physician, day, active, page = 1, limit = 50 } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (physician) {
      filter.physician = physician;
    }
    
    if (day) {
      filter.days = day;
    }
    
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get schedules with pagination
    const schedules = await PhysicianSchedule.find(filter)
      .populate({
        path: 'physician',
        select: 'name speciality email phone degree',
        populate: [
          {
            path: 'speciality',
            select: 'arName enName'
          },
          {
            path: 'degree',
            select: 'arName enName'
          }
        ]
      })
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log('Sample schedule with physician:', schedules[0]?.physician);

    // Get total count for pagination
    const total = await PhysicianSchedule.countDocuments(filter);

    res.json({
      success: true,
      data: schedules,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching physician schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching physician schedules',
      error: error.message
    });
  }
});

// GET /api/physician-schedules/stats/summary - Get schedule statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await PhysicianSchedule.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching schedule statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedule statistics',
      error: error.message
    });
  }
});

// GET /api/physician-schedules/today - Get today's schedules
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayDayName = dayNames[dayOfWeek];
    
    // Set end of today for more precise date comparison
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    
    // Set start of today for daily reset
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    
    console.log('Today is:', todayDayName, 'Date:', today.toISOString());
    console.log('End of today:', endOfToday.toISOString());
    
    // Daily reset: Clear old clinic assignments from previous days
    // This ensures each day starts fresh
    try {
      const PhysicianClinicAssignment = require('../models/PhysicianClinicAssignment');
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);
      
      // Deactivate old assignments from previous days
      await PhysicianClinicAssignment.updateMany(
        { 
          createdAt: { $lt: startOfToday },
          isActive: true 
        },
        { 
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedReason: 'Daily reset - new day started'
        }
      );
      
      console.log('Daily reset completed - old clinic assignments deactivated');
    } catch (resetError) {
      console.warn('Daily reset failed (non-critical):', resetError.message);
    }
    
    // Get all active schedules for today's day of the week that have started
    const schedules = await PhysicianSchedule.find({
      days: todayDayName,
      isActive: { $ne: false },
      startDate: { $lte: endOfToday }
    })
    .populate({
      path: 'physician',
      select: 'name speciality degree email phone',
      populate: [
        { path: 'speciality', select: 'arName enName' },
        { path: 'degree', select: 'arName enName' }
      ]
    })
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username')
      .sort({ startTime: 1 });

    console.log('Found schedules:', schedules.length);
    console.log('Schedules:', schedules.map(s => ({ 
      id: s._id, 
      physician: s.physician?.name, 
      days: s.days, 
      startDate: s.startDate,
      isActive: s.isActive 
    })));

    res.json({
      success: true,
      data: schedules,
      day: todayDayName,
      date: today.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error fetching today\'s schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching today\'s schedules',
      error: error.message
    });
  }
});

// GET /api/physician-schedules/:id - Get schedule by ID
router.get('/:id', async (req, res) => {
  try {
    const schedule = await PhysicianSchedule.findById(req.params.id)
      .populate({
        path: 'physician',
        select: 'name speciality email phone degree',
        populate: [
          {
            path: 'speciality',
            select: 'arName enName'
          },
          {
            path: 'degree',
            select: 'arName enName'
          }
        ]
      })
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      data: schedule
    });

  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedule',
      error: error.message
    });
  }
});

// POST /api/physician-schedules - Create new physician schedule
router.post('/', async (req, res) => {
  try {
    const {
      physician,
      days,
      startDate,
      startTime,
      endTime,
      notes
    } = req.body;

    // Validation
    if (!physician || !days || !startDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: physician, days, startDate, startTime, endTime'
      });
    }

    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Days must be a non-empty array'
      });
    }

    // Validate physician exists
    const physicianExists = await Doctor.findById(physician);
    if (!physicianExists) {
      return res.status(400).json({
        success: false,
        message: 'Physician not found'
      });
    }


    // Check for time overlap on same days of the week
    const existingSchedules = await PhysicianSchedule.find({
      physician: new mongoose.Types.ObjectId(physician),
      isActive: { $ne: false }
    });

    // Parse new schedule times
    const newStartTime = parseTimeToMinutes(startTime);
    const newEndTime = parseTimeToMinutes(endTime);

    for (const existingSchedule of existingSchedules) {
      const existingStartTime = parseTimeToMinutes(existingSchedule.startTime);
      const existingEndTime = parseTimeToMinutes(existingSchedule.endTime);
      const existingDays = existingSchedule.days || [];

      // Check if there's any day overlap
      const hasDayOverlap = days.some(day => existingDays.includes(day));

      if (hasDayOverlap) {
        // Check if there's time overlap
        const hasTimeOverlap = !(newEndTime <= existingStartTime || newStartTime >= existingEndTime);

        if (hasTimeOverlap) {
          return res.status(400).json({
            success: false,
            message: 'This physician already has a schedule with overlapping time on the same day(s). Please choose different days or times to avoid conflicts.'
          });
        }
      }
    }

    // Create new schedule
    const schedule = new PhysicianSchedule({
      physician: new mongoose.Types.ObjectId(physician),
      days,
      startDate: new Date(startDate),
      startTime,
      endTime,
      notes: notes || null,
      createdBy: req.user?.id || req.body.userId || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011') // Use current user ID or default for testing
    });

    await schedule.save();

    // Populate the response
    await schedule.populate({
      path: 'physician',
      select: 'name speciality email phone',
      populate: {
        path: 'speciality',
        select: 'arName enName'
      }
    });
    await schedule.populate('createdBy', 'name username');

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: schedule
    });

  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating schedule',
      error: error.message
    });
  }
});

// PUT /api/physician-schedules/:id - Update physician schedule
router.put('/:id', async (req, res) => {
  try {
    const {
      physician,
      days,
      startDate,
      startTime,
      endTime,
      notes
    } = req.body;

    const schedule = await PhysicianSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Validation
    if (!physician || !days || !startDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: physician, days, startDate, startTime, endTime'
      });
    }

    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Days must be a non-empty array'
      });
    }

    // Validate physician exists
    const physicianExists = await Doctor.findById(physician);
    if (!physicianExists) {
      return res.status(400).json({
        success: false,
        message: 'Physician not found'
      });
    }


    // Check for time overlap on same days of the week (excluding current schedule)
    const existingSchedules = await PhysicianSchedule.find({
      physician: new mongoose.Types.ObjectId(physician),
      isActive: { $ne: false },
      _id: { $ne: req.params.id } // Exclude current schedule
    });

    // Parse new schedule times
    const newStartTime = parseTimeToMinutes(startTime);
    const newEndTime = parseTimeToMinutes(endTime);

    for (const existingSchedule of existingSchedules) {
      const existingStartTime = parseTimeToMinutes(existingSchedule.startTime);
      const existingEndTime = parseTimeToMinutes(existingSchedule.endTime);
      const existingDays = existingSchedule.days || [];

      // Check if there's any day overlap
      const hasDayOverlap = days.some(day => existingDays.includes(day));

      if (hasDayOverlap) {
        // Check if there's time overlap
        const hasTimeOverlap = !(newEndTime <= existingStartTime || newStartTime >= existingEndTime);

        if (hasTimeOverlap) {
          return res.status(400).json({
            success: false,
            message: 'This physician already has a schedule with overlapping time on the same day(s). Please choose different days or times to avoid conflicts.'
          });
        }
      }
    }

    // Update schedule
    schedule.physician = new mongoose.Types.ObjectId(physician);
    schedule.startDate = new Date(startDate);
    schedule.days = days;
    schedule.startTime = startTime;
    schedule.endTime = endTime;
    schedule.notes = notes || null;
    schedule.updatedBy = req.user?.id || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'); // This would come from authentication middleware

    await schedule.save();

    // Populate the response
    await schedule.populate({
      path: 'physician',
      select: 'name speciality email phone',
      populate: {
        path: 'speciality',
        select: 'arName enName'
      }
    });
    await schedule.populate('createdBy', 'name username');
    await schedule.populate('updatedBy', 'name username');

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: schedule
    });

  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating schedule',
      error: error.message
    });
  }
});

// PATCH /api/physician-schedules/:id/toggle-status - Toggle schedule status
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const schedule = await PhysicianSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    await schedule.toggleStatus(req.user?.id || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'));

    // Populate the response
    await schedule.populate({
      path: 'physician',
      select: 'name speciality email phone',
      populate: {
        path: 'speciality',
        select: 'arName enName'
      }
    });
    await schedule.populate('createdBy', 'name username');
    await schedule.populate('updatedBy', 'name username');

    res.json({
      success: true,
      message: `Schedule ${schedule.isActive ? 'activated' : 'deactivated'} successfully`,
      data: schedule
    });

  } catch (error) {
    console.error('Error toggling schedule status:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling schedule status',
      error: error.message
    });
  }
});

// DELETE /api/physician-schedules/:id - Delete physician schedule
router.delete('/:id', async (req, res) => {
  try {
    const schedule = await PhysicianSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    await PhysicianSchedule.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting schedule',
      error: error.message
    });
  }
});

// GET /api/physician-schedules/physician/:physicianId - Get schedules for a specific physician
router.get('/physician/:physicianId', async (req, res) => {
  try {
    const { active = true } = req.query;
    const schedules = await PhysicianSchedule.findByPhysician(req.params.physicianId, active === 'true');

    res.json({
      success: true,
      data: schedules
    });

  } catch (error) {
    console.error('Error fetching physician schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching physician schedules',
      error: error.message
    });
  }
});

// GET /api/physician-schedules/clinic/:clinicId - Get schedules for a specific clinic
router.get('/clinic/:clinicId', async (req, res) => {
  try {
    const { active = true } = req.query;
    const schedules = await PhysicianSchedule.findByClinic(req.params.clinicId, active === 'true');

    res.json({
      success: true,
      data: schedules
    });

  } catch (error) {
    console.error('Error fetching clinic schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clinic schedules',
      error: error.message
    });
  }
});

// GET /api/physician-schedules/day/:day - Get schedules for a specific day
router.get('/day/:day', async (req, res) => {
  try {
    const { active = true } = req.query;
    const schedules = await PhysicianSchedule.findByDay(req.params.day, active === 'true');

    res.json({
      success: true,
      data: schedules
    });

  } catch (error) {
    console.error('Error fetching day schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching day schedules',
      error: error.message
    });
  }
});

module.exports = router;
