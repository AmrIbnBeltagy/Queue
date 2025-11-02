const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const PhysicianSchedule = require('../models/PhysicianSchedule');
const PhysicianClinicAssignment = require('../models/PhysicianClinicAssignment');
const Doctor = require('../models/Doctor');
const Configuration = require('../models/Configuration');

// Get physician's patient queue
router.get('/queue', async (req, res) => {
    try {
        const { physicianId, username, email, scheduleId } = req.query;
        
        
        let doctorId = physicianId;
        let scheduleIds = [];
        
        // If scheduleId is provided, use it directly
        if (scheduleId) {
            scheduleIds = [scheduleId];
        } else {
            // If no physicianId provided, try to find doctor by username or email
            if (!doctorId && (username || email)) {
                const doctor = await Doctor.findOne({
                    $or: [
                        { username: username },
                        { email: email }
                    ]
                });
                
                if (doctor) {
                    doctorId = doctor._id;
                } else {
                    return res.status(404).json({
                        success: false,
                        message: 'No doctor found for the provided credentials'
                    });
                }
            }
            
            if (!doctorId) {
                return res.status(400).json({
                    success: false,
                    message: 'Physician ID, username, email, or scheduleId is required'
                });
            }
        }
        
        // Prepare today's date range (used for both code paths)
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        // If scheduleId not provided, get schedules for physician
        if (scheduleIds.length === 0) {
            // Find physician's schedules for today
            const schedules = await PhysicianSchedule.find({
                physician: doctorId,
                isActive: { $ne: false },
                startDate: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            }).select('_id');
            
            console.log('Searching for schedules with doctorId:', doctorId);
            console.log('Date range:', { startOfDay, endOfDay });
            console.log('Found schedules for physician:', schedules.length);
            console.log('Schedules:', schedules);
            
            scheduleIds = schedules.map(s => s._id);
            
            if (scheduleIds.length === 0) {
                console.log('No schedules found for physician today');
                return res.json({
                    success: true,
                    data: [],
                    message: 'No schedules found for today'
                });
            }
        }
        
        // Get tickets for these schedules
        const tickets = await Ticket.find({
            scheduleId: { $in: scheduleIds },
            printedAt: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ['waiting', 'called', 'in_progress'] }
        })
        .populate('scheduleId', 'physician startTime endTime')
        .sort({ printedAt: 1 });
        
        // Format the data
        const queue = tickets.map(ticket => ({
            _id: ticket._id,
            sequenceNumber: ticket.sequenceNumber,
            ticketType: ticket.ticketType,
            patientCode: ticket.patientCode,
            printedAt: ticket.printedAt,
            status: ticket.status,
            isCurrent: ticket.status === 'in_progress',
            scheduleId: ticket.scheduleId._id,
            physicianId: ticket.scheduleId.physician
        }));
        
        
        res.json({
            success: true,
            data: queue,
            count: queue.length
        });
    } catch (error) {
        console.error('Error fetching physician queue:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching physician queue',
            error: error.message
        });
    }
});

// Get physician's queue statistics
router.get('/stats', async (req, res) => {
    try {
        const { physicianId, username, email } = req.query;
        
        let doctorId = physicianId;
        
        // If no physicianId provided, try to find doctor by username or email
        if (!doctorId && (username || email)) {
            const doctor = await Doctor.findOne({
                $or: [
                    { username: username },
                    { email: email }
                ]
            });
            
            if (doctor) {
                doctorId = doctor._id;
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'No doctor found for the provided credentials'
                });
            }
        }
        
        if (!doctorId) {
            return res.status(400).json({
                success: false,
                message: 'Physician ID, username, or email is required'
            });
        }
        
        // Get today's date
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Find physician's schedules for today
        const schedules = await PhysicianSchedule.find({
            physician: doctorId,
            isActive: { $ne: false },
            startDate: { $lte: endOfDay }
        }).select('_id');
        
        const scheduleIds = schedules.map(s => s._id);
        
        if (scheduleIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    examination: 0,
                    consultation: 0,
                    procedure: 0,
                    late: 0
                }
            });
        }
        
        // Get ticket counts by type
        const stats = await Ticket.aggregate([
            {
                $match: {
                    scheduleId: { $in: scheduleIds },
                    printedAt: { $gte: startOfDay, $lte: endOfDay },
                    status: { $in: ['waiting', 'called', 'in_progress'] }
                }
            },
            {
                $group: {
                    _id: '$ticketType',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        // Format the results
        const result = {
            examination: 0,
            consultation: 0,
            procedure: 0,
            late: 0
        };
        
        stats.forEach(stat => {
            const type = stat._id.toLowerCase();
            if (result.hasOwnProperty(type)) {
                result[type] = stat.count;
            }
        });
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error fetching physician stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching physician stats',
            error: error.message
        });
    }
});


// Start patient visit
router.post('/start-visit', async (req, res) => {
    try {
        const { patientId, physicianId } = req.body;
        
        if (!patientId || !physicianId) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID and Physician ID are required'
            });
        }
        
        // Update ticket status to 'in_progress'
        const ticket = await Ticket.findByIdAndUpdate(
            patientId,
            { 
                status: 'in_progress',
                visitStartedAt: new Date(),
                visitedBy: physicianId
            },
            { new: true }
        );
        
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Patient ticket not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Patient visit started',
            data: ticket
        });
    } catch (error) {
        console.error('Error starting patient visit:', error);
        res.status(500).json({
            success: false,
            message: 'Error starting patient visit',
            error: error.message
        });
    }
});

// End patient visit
router.post('/end-visit', async (req, res) => {
    try {
        const { patientId, physicianId, visitDuration } = req.body;
        
        if (!patientId || !physicianId) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID and Physician ID are required'
            });
        }
        
        // Update ticket status to 'completed'
        const ticket = await Ticket.findByIdAndUpdate(
            patientId,
            { 
                status: 'completed',
                visitEndedAt: new Date(),
                visitDuration: visitDuration || 0,
                completedBy: physicianId
            },
            { new: true }
        );
        
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Patient ticket not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Patient visit completed',
            data: ticket
        });
    } catch (error) {
        console.error('Error ending patient visit:', error);
        res.status(500).json({
            success: false,
            message: 'Error ending patient visit',
            error: error.message
        });
    }
});

// Recall patient
router.post('/recall-patient', async (req, res) => {
    try {
        const { patientId, physicianId } = req.body;
        
        if (!patientId || !physicianId) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID and Physician ID are required'
            });
        }
        
        // Update ticket status to 'called' (recall)
        const ticket = await Ticket.findByIdAndUpdate(
            patientId,
            { 
                status: 'called',
                recalledAt: new Date(),
                recalledBy: physicianId
            },
            { new: true }
        );
        
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Patient ticket not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Patient recalled successfully',
            data: ticket
        });
    } catch (error) {
        console.error('Error recalling patient:', error);
        res.status(500).json({
            success: false,
            message: 'Error recalling patient',
            error: error.message
        });
    }
});

// Reset all 'called' tickets back to 'waiting' for today (by schedule or physician)
router.post('/reset-called', async (req, res) => {
    try {
        const { scheduleId, physicianId, deleteAll } = req.body;

        // Prepare today's date range
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        let scheduleIds = [];

        if (scheduleId) {
            scheduleIds = [scheduleId];
        } else if (physicianId) {
            const schedules = await PhysicianSchedule.find({
                physician: physicianId,
                isActive: { $ne: false },
                startDate: { $lte: endOfDay }
            }).select('_id');
            scheduleIds = schedules.map(s => s._id);
        } else {
            return res.status(400).json({
                success: false,
                message: 'scheduleId or physicianId is required'
            });
        }

        if (scheduleIds.length === 0) {
            return res.json({ success: true, message: 'No schedules found', modified: 0 });
        }

        const result = await Ticket.updateMany(
            {
                scheduleId: { $in: scheduleIds },
                printedAt: { $gte: startOfDay, $lte: endOfDay },
                status: { $in: ['called', 'in_progress', 'in progress'] }
            },
            {
                $set: { status: 'waiting' },
                $unset: { calledAt: 1, calledBy: 1, recalledAt: 1, recalledBy: 1, visitStartedAt: 1, visitEndedAt: 1, visitDuration: 1, completedBy: 1 }
            }
        );

        res.json({
            success: true,
            message: 'Reset called tickets to waiting',
            modified: result.modifiedCount
        });
    } catch (error) {
        console.error('Error resetting called tickets:', error);
        res.status(500).json({ success: false, message: 'Error resetting called tickets', error: error.message });
    }
});

// Delete all today's tickets for given schedule or physician
router.post('/delete-tickets', async (req, res) => {
    try {
        const { scheduleId, physicianId, deleteAll, truncate } = req.body;

        // Truncate collection (delete all documents) if requested
        if (truncate) {
            const result = await Ticket.deleteMany({});
            return res.json({ success: true, message: 'All tickets deleted successfully', deleted: result.deletedCount || 0 });
        }

        // Global delete: when deleteAll is true (or no filters provided), delete everything
        let result;
        if (deleteAll || (!scheduleId && !physicianId)) {
            result = await Ticket.deleteMany({});
        } else {
            let scheduleIds = [];
            if (scheduleId) {
                scheduleIds = [scheduleId];
            } else if (physicianId) {
                // Prepare today's date range for schedule lookup
                const today = new Date();
                const endOfDay = new Date(today);
                endOfDay.setHours(23, 59, 59, 999);
                const schedules = await PhysicianSchedule.find({
                    physician: physicianId,
                    isActive: { $ne: false },
                    startDate: { $lte: endOfDay }
                }).select('_id');
                scheduleIds = schedules.map(s => s._id);
            }

            if (scheduleIds.length === 0 && scheduleId) {
                return res.json({ success: true, message: 'No schedules found', deleted: 0 });
            }

            // Delete ALL tickets for these schedules (regardless of date)
            if (scheduleIds.length > 0) {
                result = await Ticket.deleteMany({ scheduleId: { $in: scheduleIds } });
            } else {
                result = await Ticket.deleteMany({});
            }
        }

        res.json({ success: true, message: 'Deleted tickets successfully', deleted: result.deletedCount || 0 });
    } catch (error) {
        console.error('Error deleting tickets:', error);
        res.status(500).json({ success: false, message: 'Error deleting tickets', error: error.message });
    }
});

// End clinic
router.post('/end-clinic', async (req, res) => {
    try {
        const { physicianId } = req.body;
        
        if (!physicianId) {
            return res.status(400).json({
                success: false,
                message: 'Physician ID is required'
            });
        }
        
        // Get today's date
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Find physician's schedules for today
        const schedules = await PhysicianSchedule.find({
            physician: doctorId,
            isActive: { $ne: false },
            startDate: { $lte: endOfDay }
        }).select('_id');
        
        const scheduleIds = schedules.map(s => s._id);
        
        if (scheduleIds.length === 0) {
            return res.json({
                success: true,
                message: 'No active schedules found for today'
            });
        }
        
        // Update all pending tickets to 'cancelled'
        const result = await Ticket.updateMany(
            {
                scheduleId: { $in: scheduleIds },
                printedAt: { $gte: startOfDay, $lte: endOfDay },
                status: { $in: ['waiting', 'called', 'in_progress'] }
            },
            {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelledBy: physicianId,
                cancellationReason: 'Clinic ended'
            }
        );
        
        res.json({
            success: true,
            message: 'Clinic ended successfully',
            cancelledTickets: result.modifiedCount
        });
    } catch (error) {
        console.error('Error ending clinic:', error);
        res.status(500).json({
            success: false,
            message: 'Error ending clinic',
            error: error.message
        });
    }
});

// Get physician's visit history
router.get('/history', async (req, res) => {
    try {
        const { physicianId, date } = req.query;
        
        if (!physicianId) {
            return res.status(400).json({
                success: false,
                message: 'Physician ID is required'
            });
        }
        
        // Get date range
        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Find physician's schedules for the date
        const schedules = await PhysicianSchedule.find({
            physician: doctorId,
            isActive: { $ne: false },
            startDate: { $lte: endOfDay }
        }).select('_id');
        
        const scheduleIds = schedules.map(s => s._id);
        
        if (scheduleIds.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: 'No schedules found for the specified date'
            });
        }
        
        // Get completed tickets
        const tickets = await Ticket.find({
            scheduleId: { $in: scheduleIds },
            printedAt: { $gte: startOfDay, $lte: endOfDay },
            status: 'completed'
        })
        .populate('scheduleId', 'physician startTime endTime')
        .sort({ visitEndedAt: -1 });
        
        res.json({
            success: true,
            data: tickets,
            count: tickets.length
        });
    } catch (error) {
        console.error('Error fetching physician history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching physician history',
            error: error.message
        });
    }
});


// Update ticket status to in progress
router.post('/call-patient', async (req, res) => {
    try {
        const { ticketId, physicianId } = req.body;
        
        console.log('Call patient request:', { ticketId, physicianId });
        
        if (!ticketId || !physicianId) {
            return res.status(400).json({
                success: false,
                message: 'Ticket ID and Physician ID are required'
            });
        }
        
        // Update ticket status to in_progress (not completed) when calling
        const updatedTicket = await Ticket.findByIdAndUpdate(
            ticketId,
            {
                status: 'in_progress',
                calledAt: new Date(),
                calledBy: physicianId,
                visitStartedAt: new Date()
                // visitCompletedAt is set later when ticket is completed
            },
            { new: true }
        );
        
        if (!updatedTicket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }
        
        console.log('Ticket updated to in_progress:', updatedTicket._id);
        
        res.json({
            success: true,
            message: 'Patient called successfully',
            data: updatedTicket
        });
        
    } catch (error) {
        console.error('Error calling patient:', error);
        res.status(500).json({
            success: false,
            message: 'Error calling patient'
        });
    }
});

// Get current patient in progress
router.get('/current-patient', async (req, res) => {
    try {
        const { scheduleId } = req.query;
        
        console.log('Get current patient request:', { scheduleId });
        
        if (!scheduleId) {
            return res.status(400).json({
                success: false,
                message: 'Schedule ID is required'
            });
        }
        
        // Find current patient (in_progress, not completed)
        // Priority: first try in_progress, if not found try called status
        let currentPatient = await Ticket.findOne({
            scheduleId: scheduleId,
            status: 'in_progress'
        }).sort({ calledAt: -1 });
        
        // If no in_progress ticket, check for called status (for backward compatibility)
        if (!currentPatient) {
            currentPatient = await Ticket.findOne({
                scheduleId: scheduleId,
                status: 'called'
            }).sort({ calledAt: -1 });
        }
        
        if (currentPatient) {
            console.log('Current patient in progress found:', currentPatient._id, 'status:', currentPatient.status);
            res.json({
                success: true,
                data: currentPatient
            });
        } else {
            console.log('No current patient in progress');
            res.json({
                success: false,
                message: 'No current patient in progress'
            });
        }
        
    } catch (error) {
        console.error('Error getting current patient:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting current patient'
        });
    }
});

// End patient visit
router.post('/end-visit', async (req, res) => {
    try {
        const { ticketId, physicianId } = req.body;
        
        console.log('End visit request:', { ticketId, physicianId });
        
        if (!ticketId || !physicianId) {
            return res.status(400).json({
                success: false,
                message: 'Ticket ID and Physician ID are required'
            });
        }
        
        // Calculate visit duration
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }
        
        const visitDuration = ticket.visitStartedAt ? 
            Math.floor((new Date() - new Date(ticket.visitStartedAt)) / 1000) : 0;
        
        // Update ticket status
        const updatedTicket = await Ticket.findByIdAndUpdate(
            ticketId,
            {
                status: 'completed',
                visitEndedAt: new Date(),
                completedBy: physicianId,
                visitDuration: visitDuration
            },
            { new: true }
        );
        
        console.log('Visit ended:', updatedTicket._id, 'Duration:', visitDuration);
        
        res.json({
            success: true,
            message: 'Visit ended successfully',
            data: updatedTicket
        });
        
    } catch (error) {
        console.error('Error ending visit:', error);
        res.status(500).json({
            success: false,
            message: 'Error ending visit'
        });
    }
});

module.exports = router;
