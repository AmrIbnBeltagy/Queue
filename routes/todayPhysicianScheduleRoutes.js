const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const TodayPhysicianSchedule = require('../models/TodayPhysicianSchedule');
const Doctor = require('../models/Doctor');
const Speciality = require('../models/Speciality');
const Clinic = require('../models/Clinic');

// Get all today's physician schedules
router.get('/', async (req, res) => {
    try {
        const { date, physicianId, speciality, clinic, location, scheduleId } = req.query;
        
        // Build query
        let query = { isActive: true };
        
        if (date) {
            const targetDate = new Date(date);
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            query.date = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        } else {
            // Default to today
            const today = new Date();
            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);
            
            query.date = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }
        
        if (physicianId) {
            // Ensure proper ObjectId matching
            if (mongoose.Types.ObjectId.isValid(physicianId)) {
                query.physicianId = new mongoose.Types.ObjectId(physicianId);
            } else {
                query.physicianId = physicianId; // fallback string match if custom ids used
            }
        }
        
        if (speciality) {
            query.speciality = { $regex: speciality, $options: 'i' };
        }
        
        if (clinic) {
            // Search by clinic code (exact match) or clinic name (regex match)
            query.$or = [
                { clinicCode: clinic },
                { clinicName: { $regex: clinic, $options: 'i' } }
            ];
        }
        
        if (location) {
            query.location = { $regex: location, $options: 'i' };
        }
        
        if (scheduleId) {
            if (mongoose.Types.ObjectId.isValid(scheduleId)) {
                query.scheduleId = new mongoose.Types.ObjectId(scheduleId);
            } else {
                query.scheduleId = scheduleId;
            }
        }
        
        const schedules = await TodayPhysicianSchedule.find(query)
            .populate('scheduleId', 'startTime endTime days')
            .populate('physicianId', 'username email')
            .populate('createdBy', 'username email')
            .populate('updatedBy', 'username email')
            .sort({ date: 1, clinicTimeFrom: 1 });
        
        res.json({
            success: true,
            data: schedules,
            count: schedules.length
        });
        
    } catch (error) {
        console.error('Error fetching today physician schedules:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching today physician schedules'
        });
    }
});

// Get single today physician schedule
router.get('/:id', async (req, res) => {
    try {
        const schedule = await TodayPhysicianSchedule.findById(req.params.id)
            .populate('scheduleId', 'startTime endTime days')
            .populate('physicianId', 'username email')
            .populate('createdBy', 'username email')
            .populate('updatedBy', 'username email');
        
        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Today physician schedule not found'
            });
        }
        
        res.json({
            success: true,
            data: schedule
        });
        
    } catch (error) {
        console.error('Error fetching today physician schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching today physician schedule'
        });
    }
});

// Create new today physician schedule
router.post('/', async (req, res) => {
    try {
        const {
            scheduleId,
            physicianId,
            physicianName,
            speciality,
            degree,
            clinicTimeFrom,
            clinicTimeTo,
            day,
            date,
            clinicName,
            location
        } = req.body;
        
        // Validate required fields
        if (!physicianId || !physicianName || !speciality || !degree || 
            !clinicTimeFrom || !clinicTimeTo || !day || !date || !clinicName || !location) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        // Check if physician exists
        const physician = await Doctor.findById(physicianId);
        if (!physician) {
            return res.status(404).json({
                success: false,
                message: 'Physician not found'
            });
        }
        
        // Get clinic code from clinic name
        let clinicCode = req.body.clinicCode || null;
        if (!clinicCode && clinicName) {
            // Try to find clinic by name and get its code
            const clinic = await Clinic.findOne({
                $or: [
                    { arName: clinicName },
                    { enName: clinicName }
                ]
            }).select('code');
            
            if (clinic && clinic.code) {
                clinicCode = clinic.code;
            }
        }
        
        // Create new schedule
        const newSchedule = new TodayPhysicianSchedule({
            scheduleId: scheduleId || null,
            physicianId,
            physicianName,
            speciality,
            degree,
            clinicTimeFrom,
            clinicTimeTo,
            day,
            date: new Date(date),
            clinicName,
            clinicCode: clinicCode,
            location,
            createdBy: req.user?.id || new mongoose.Types.ObjectId(),
            updatedBy: req.user?.id || new mongoose.Types.ObjectId()
        });
        
        const savedSchedule = await newSchedule.save();
        
        res.status(201).json({
            success: true,
            message: 'Today physician schedule created successfully',
            data: savedSchedule
        });
        
    } catch (error) {
        console.error('Error creating today physician schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating today physician schedule'
        });
    }
});

// Update today physician schedule
router.put('/:id', async (req, res) => {
    try {
        const {
            scheduleId,
            physicianName,
            speciality,
            degree,
            clinicTimeFrom,
            clinicTimeTo,
            day,
            date,
            clinicName,
            clinicCode,
            location
        } = req.body;
        
        const updateData = {
            updatedBy: req.user?.id || new mongoose.Types.ObjectId()
        };
        
        if (scheduleId !== undefined) updateData.scheduleId = scheduleId;
        if (physicianName) updateData.physicianName = physicianName;
        if (speciality) updateData.speciality = speciality;
        if (degree) updateData.degree = degree;
        if (clinicTimeFrom) updateData.clinicTimeFrom = clinicTimeFrom;
        if (clinicTimeTo) updateData.clinicTimeTo = clinicTimeTo;
        if (day) updateData.day = day;
        if (date) updateData.date = new Date(date);
        if (clinicName) {
            updateData.clinicName = clinicName;
            // If clinicName is updated but clinicCode is not provided, try to get it from clinic
            if (!clinicCode) {
                const clinic = await Clinic.findOne({
                    $or: [
                        { arName: clinicName },
                        { enName: clinicName }
                    ]
                }).select('code');
                
                if (clinic && clinic.code) {
                    updateData.clinicCode = clinic.code;
                }
            }
        }
        if (clinicCode !== undefined) updateData.clinicCode = clinicCode;
        if (location) updateData.location = location;
        
        const updatedSchedule = await TodayPhysicianSchedule.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!updatedSchedule) {
            return res.status(404).json({
                success: false,
                message: 'Today physician schedule not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Today physician schedule updated successfully',
            data: updatedSchedule
        });
        
    } catch (error) {
        console.error('Error updating today physician schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating today physician schedule'
        });
    }
});

// Delete today physician schedule (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const deletedSchedule = await TodayPhysicianSchedule.findByIdAndUpdate(
            req.params.id,
            { 
                isActive: false,
                updatedBy: req.user?.id || new mongoose.Types.ObjectId()
            },
            { new: true }
        );
        
        if (!deletedSchedule) {
            return res.status(404).json({
                success: false,
                message: 'Today physician schedule not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Today physician schedule deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting today physician schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting today physician schedule'
        });
    }
});

// Get physicians for dropdown
router.get('/physicians/list', async (req, res) => {
    try {
        const physicians = await Doctor.find({ status: { $ne: 'Inactive' } })
            .populate('speciality', 'name')
            .select('_id username email firstName lastName speciality degree');
        
        const formattedPhysicians = physicians.map(physician => ({
            _id: physician._id,
            name: `${physician.firstName || ''} ${physician.lastName || ''}`.trim() || physician.username,
            username: physician.username,
            email: physician.email,
            speciality: physician.speciality?.name || 'Unknown',
            degree: physician.degree || 'Unknown'
        }));
        
        res.json({
            success: true,
            data: formattedPhysicians
        });
        
    } catch (error) {
        console.error('Error fetching physicians list:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching physicians list'
        });
    }
});

// Get specialities for dropdown
router.get('/specialities/list', async (req, res) => {
    try {
        const specialities = await Speciality.find({ isActive: true })
            .select('_id name code');
        
        res.json({
            success: true,
            data: specialities
        });
        
    } catch (error) {
        console.error('Error fetching specialities list:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching specialities list'
        });
    }
});

// Get clinics for dropdown
router.get('/clinics/list', async (req, res) => {
    try {
        const clinics = await Clinic.find({ isActive: true })
            .populate('location', 'enName arName')
            .select('_id name location');
        
        const formattedClinics = clinics.map(clinic => ({
            _id: clinic._id,
            name: clinic.name,
            location: clinic.location?.enName || clinic.location?.arName || 'Unknown'
        }));
        
        res.json({
            success: true,
            data: formattedClinics
        });
        
    } catch (error) {
        console.error('Error fetching clinics list:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching clinics list'
        });
    }
});

module.exports = router;
