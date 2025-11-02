const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const PhysicianSchedule = require('../models/PhysicianSchedule');
const mongoose = require('mongoose');
const TodayPhysicianSchedule = require('../models/TodayPhysicianSchedule');

// Create a new ticket
router.post('/', async (req, res) => {
    try {
        const { scheduleId, ticketType, patientCode, notes, clinicCode } = req.body;
        
        
        // Validate required fields
        if (!scheduleId || !ticketType) {
            return res.status(400).json({
                success: false,
                message: 'Schedule ID and ticket type are required'
            });
        }
        
        // Convert scheduleId to ObjectId if it's a string
        const scheduleObjectId = mongoose.Types.ObjectId.isValid(scheduleId) 
            ? new mongoose.Types.ObjectId(scheduleId) 
            : scheduleId;
        
        // Validate schedule exists - try both PhysicianSchedule and TodayPhysicianSchedule
        let schedule = await PhysicianSchedule.findById(scheduleObjectId);
        
        if (!schedule) {
            // Try TodayPhysicianSchedule if not found in PhysicianSchedule
            const TodayPhysicianSchedule = require('../models/TodayPhysicianSchedule');
            schedule = await TodayPhysicianSchedule.findById(scheduleObjectId);
        }
        
        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Schedule not found'
            });
        }
        
        // Check if ticket printing is allowed based on time constraints
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Parse start time - handle both PhysicianSchedule and TodayPhysicianSchedule
        let startHour, startMinute;
        const startTime = (schedule.startTime || schedule.clinicTimeFrom || '09:00').trim();
        
        if (startTime.includes('AM') || startTime.includes('PM')) {
            const [timePart, period] = startTime.split(/(AM|PM)/i);
            const [hour, minute] = timePart.split(':').map(Number);
            startHour = hour;
            if (period.toUpperCase() === 'AM' && hour === 12) {
                startHour = 0;
            } else if (period.toUpperCase() === 'PM' && hour !== 12) {
                startHour = hour + 12;
            }
            startMinute = minute || 0;
        } else {
            const [hour, minute] = startTime.split(':').map(Number);
            startHour = hour;
            startMinute = minute || 0;
        }
        
        // Parse end time - handle both PhysicianSchedule and TodayPhysicianSchedule
        let endHour, endMinute;
        const endTime = (schedule.endTime || schedule.clinicTimeTo || '17:00').trim();
        
        if (endTime.includes('AM') || endTime.includes('PM')) {
            const [timePart, period] = endTime.split(/(AM|PM)/i);
            const [hour, minute] = timePart.split(':').map(Number);
            endHour = hour;
            if (period.toUpperCase() === 'AM' && hour === 12) {
                endHour = 0;
            } else if (period.toUpperCase() === 'PM' && hour !== 12) {
                endHour = hour + 12;
            }
            endMinute = minute || 0;
        } else {
            const [hour, minute] = endTime.split(':').map(Number);
            endHour = hour;
            endMinute = minute || 0;
        }
        
        const scheduleStartTime = new Date(today);
        scheduleStartTime.setHours(startHour, startMinute, 0, 0);
        
        const scheduleEndTime = new Date(today);
        scheduleEndTime.setHours(endHour, endMinute, 0, 0);
        
        // Get configuration values
        const Configuration = require('../models/Configuration');
        const printHoursBeforeClinic = await Configuration.getConfig('print_hours_before_clinic', 2);
        const printMinutesAfterClinicEnd = await Configuration.getConfig('print_minutes_after_clinic_end', 10);
        
        // Calculate time windows
        const hoursBeforeStart = new Date(scheduleStartTime);
        hoursBeforeStart.setHours(hoursBeforeStart.getHours() - printHoursBeforeClinic);
        
        const minutesAfterEnd = new Date(scheduleEndTime);
        minutesAfterEnd.setMinutes(minutesAfterEnd.getMinutes() + printMinutesAfterClinicEnd);
        
        // Check if current time is within allowed window
        const canPrintBeforeStart = now >= hoursBeforeStart;
        const canPrintAfterEnd = now <= minutesAfterEnd;
        
        if (!canPrintBeforeStart) {
            return res.status(400).json({
                success: false,
                message: `Tickets can only be printed ${printHoursBeforeClinic} hours before clinic start time`
            });
        }
        
        if (!canPrintAfterEnd) {
            return res.status(400).json({
                success: false,
                message: `Tickets cannot be printed more than ${printMinutesAfterClinicEnd} minutes after clinic end time`
            });
        }
        
        // Get next sequence number for this ticket type
        const sequenceNumber = await Ticket.getNextSequence(scheduleObjectId, ticketType);
                
                // Get formatted ticket number
                const formattedTicketNumber = Ticket.getFormattedTicketNumber(sequenceNumber, ticketType);
                
                // Get clinicCode from schedule if not provided in request
                let finalClinicCode = clinicCode;
                if (!finalClinicCode && schedule) {
                    finalClinicCode = schedule.clinicCode || null;
                }
                
                // Create ticket
                const ticket = new Ticket({
                    scheduleId: scheduleObjectId,
                    sequenceNumber,
                    ticketType,
                    patientCode: patientCode || null, // Make patient code optional
                    printedBy: req.user?.id || req.session?.userId || req.body.userId || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
                    notes: notes || '',
                    clinicCode: finalClinicCode
                });
        
        await ticket.save();
        
        // Populate the ticket with related data
        await ticket.populate([
            { path: 'scheduleId', populate: { path: 'physician', populate: ['speciality', 'degree'] } },
            { path: 'printedBy', select: 'name email' }
        ]);
        
                res.status(201).json({
                    success: true,
                    message: 'Ticket created successfully',
                    data: {
                        ...ticket.toObject(),
                        formattedTicketNumber: formattedTicketNumber
                    }
                });
        
    } catch (error) {
        console.error('Error creating ticket:', error);
        console.error('Request body:', req.body);
        console.error('Schedule ID:', req.body.scheduleId);
        console.error('Ticket Type:', req.body.ticketType);
        res.status(500).json({
            success: false,
            message: 'Error creating ticket',
            error: error.message
        });
    }
});

// Get tickets for a specific schedule
router.get('/schedule/:scheduleId', async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const { date } = req.query;
        
        if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid schedule ID'
            });
        }
        
        const tickets = await Ticket.getTicketsForSchedule(scheduleId, date);
        
        res.json({
            success: true,
            data: tickets
        });
        
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tickets',
            error: error.message
        });
    }
});

// Get daily statistics for a schedule
router.get('/schedule/:scheduleId/stats', async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const { date } = req.query;
        
        if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid schedule ID'
            });
        }
        
        const stats = await Ticket.getDailyStats(scheduleId, date);
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Error fetching ticket stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ticket stats',
            error: error.message
        });
    }
});

// Get all tickets with filters
router.get('/', async (req, res) => {
    try {
        const { scheduleId, status, ticketType, date, clinicCode } = req.query;
        const filter = {};
        
        if (scheduleId) filter.scheduleId = scheduleId;
        if (status) filter.status = status;
        if (ticketType) filter.ticketType = ticketType;
        if (clinicCode) filter.clinicCode = clinicCode;
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            filter.printedAt = { $gte: startDate, $lt: endDate };
        }
        
        const tickets = await Ticket.find(filter)
            .populate({
                path: 'scheduleId',
                select: 'startTime endTime',
                populate: {
                    path: 'physician',
                    select: 'name speciality degree',
                    populate: [
                        { path: 'speciality', select: 'arName enName' },
                        { path: 'degree', select: 'arName enName' }
                    ]
                }
            })
            .populate({
                path: 'todayScheduleId',
                select: 'physicianName speciality degree clinicName clinicTimeFrom clinicTimeTo location'
            })
            .populate('printedBy', 'name email')
            .sort({ printedAt: -1 });
        
        res.json({
            success: true,
            data: tickets
        });
        
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tickets',
            error: error.message
        });
    }
});

// Update ticket status
router.patch('/:ticketId/status', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status, notes } = req.body;
        
        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ticket ID'
            });
        }
        
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }
        
        if (status) ticket.status = status;
        if (notes !== undefined) ticket.notes = notes;
        
        await ticket.save();
        
        res.json({
            success: true,
            message: 'Ticket status updated successfully',
            data: ticket
        });
        
    } catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating ticket status',
            error: error.message
        });
    }
});

// Delete ticket
router.delete('/:ticketId', async (req, res) => {
    try {
        const { ticketId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ticket ID'
            });
        }
        
        const ticket = await Ticket.findByIdAndDelete(ticketId);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Ticket deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting ticket',
            error: error.message
        });
    }
});

module.exports = router;
 
// Link tickets for a PhysicianSchedule to a TodayPhysicianSchedule for today
router.post('/link-today-schedule', async (req, res) => {
    try {
        const { scheduleId, todayScheduleId, date } = req.body;
        if (!scheduleId || !todayScheduleId) {
            return res.status(400).json({ success: false, message: 'scheduleId and todayScheduleId are required' });
        }

        if (!mongoose.Types.ObjectId.isValid(scheduleId) || !mongoose.Types.ObjectId.isValid(todayScheduleId)) {
            return res.status(400).json({ success: false, message: 'Invalid ids' });
        }

        // Validate TodayPhysicianSchedule exists
        const todaySchedule = await TodayPhysicianSchedule.findById(todayScheduleId);
        if (!todaySchedule) {
            return res.status(404).json({ success: false, message: 'TodayPhysicianSchedule not found' });
        }

        // Build date range (default: today)
        const target = date ? new Date(date) : new Date();
        const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
        const endOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate() + 1);

        const filter = {
            scheduleId: new mongoose.Types.ObjectId(scheduleId),
            printedAt: { $gte: startOfDay, $lt: endOfDay },
        };

        const result = await Ticket.updateMany(filter, { $set: { todayScheduleId: new mongoose.Types.ObjectId(todayScheduleId) } });

        res.json({ success: true, message: 'Tickets linked to TodayPhysicianSchedule', matched: result.matchedCount ?? result.n, modified: result.modifiedCount ?? result.nModified });
    } catch (error) {
        console.error('Error linking tickets to TodayPhysicianSchedule:', error);
        res.status(500).json({ success: false, message: 'Error linking tickets', error: error.message });
    }
});
