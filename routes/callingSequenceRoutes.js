const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const CallingSequence = require('../models/CallingSequence');

// GET /api/calling-sequences - Get all calling sequences
router.get('/', async (req, res) => {
    try {
        const { active, defaultOnly, scheduleId } = req.query;
        
        const filter = {};
        if (active === 'true') filter.isActive = true;
        if (defaultOnly === 'true') filter.isDefault = true;
        if (scheduleId) filter.scheduleId = scheduleId;
        
        const sequences = await CallingSequence.find(filter)
            .populate('createdBy', 'name username')
            .populate('updatedBy', 'name username')
            .populate('scheduleId', 'startTime endTime')
            .sort({ isDefault: -1, createdAt: -1 });
        
        res.json({
            success: true,
            data: sequences,
            count: sequences.length
        });
    } catch (error) {
        console.error('Error fetching calling sequences:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching calling sequences',
            error: error.message
        });
    }
});

// GET /api/calling-sequences/default - Get default calling sequence
router.get('/default', async (req, res) => {
    try {
        const defaultSeq = await CallingSequence.getDefault();
        
        if (!defaultSeq || !defaultSeq._id) {
            // Return default structure if no record exists
            return res.json({
                success: true,
                data: {
                    sequence: [
                        { type: 'Examination', count: 2, priority: 1 },
                        { type: 'Consultation', count: 1, priority: 2 },
                        { type: 'Procedure', count: 1, priority: 3 },
                        { type: 'Late', count: 2, priority: 4 }
                    ],
                    settings: {
                        autoRepeat: true,
                        callTimeout: 5,
                        trackDuration: true
                    }
                },
                isDefault: true
            });
        }
        
        res.json({
            success: true,
            data: defaultSeq
        });
    } catch (error) {
        console.error('Error fetching default calling sequence:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching default calling sequence',
            error: error.message
        });
    }
});

// GET /api/calling-sequences/schedule/:scheduleId - Get sequence for a specific schedule
router.get('/schedule/:scheduleId', async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const sequence = await CallingSequence.getForSchedule(scheduleId);
        
        res.json({
            success: true,
            data: sequence
        });
    } catch (error) {
        console.error('Error fetching sequence for schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching sequence for schedule',
            error: error.message
        });
    }
});

// GET /api/calling-sequences/:id - Get calling sequence by ID
router.get('/:id', async (req, res) => {
    try {
        const sequence = await CallingSequence.findById(req.params.id)
            .populate('createdBy', 'name username')
            .populate('updatedBy', 'name username')
            .populate('scheduleId', 'startTime endTime');
        
        if (!sequence) {
            return res.status(404).json({
                success: false,
                message: 'Calling sequence not found'
            });
        }
        
        res.json({
            success: true,
            data: sequence
        });
    } catch (error) {
        console.error('Error fetching calling sequence:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching calling sequence',
            error: error.message
        });
    }
});

// POST /api/calling-sequences - Create new calling sequence
router.post('/', async (req, res) => {
    try {
        const { name, description, sequence, settings, isDefault, scheduleId } = req.body;
        
        // Validation
        if (!sequence || !Array.isArray(sequence) || sequence.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Sequence array is required and must contain at least one item'
            });
        }
        
        // Validate sequence items
        for (const item of sequence) {
            if (!item.type || !['Examination', 'Consultation', 'Procedure', 'Late'].includes(item.type)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid type: ${item.type}. Must be one of: Examination, Consultation, Procedure, Late`
                });
            }
            if (!item.count || item.count < 1 || item.count > 10) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid count for ${item.type}. Must be between 1 and 10`
                });
            }
            if (!item.priority || item.priority < 1 || item.priority > 10) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid priority for ${item.type}. Must be between 1 and 10`
                });
            }
        }
        
        // Sort sequence by priority
        const sortedSequence = [...sequence].sort((a, b) => a.priority - b.priority);
        
        // Get current user ID (from authentication middleware or request)
        const currentUserId = req.user?.id || req.session?.userId || req.body.userId || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
        
        // If setting as default, unset other defaults
        if (isDefault) {
            await CallingSequence.updateMany(
                { isDefault: true },
                { isDefault: false, updatedBy: currentUserId }
            );
        }
        
        // If scheduleId is provided, deactivate other sequences for that schedule
        if (scheduleId) {
            await CallingSequence.updateMany(
                { scheduleId: scheduleId, isActive: true },
                { isActive: false, updatedBy: currentUserId }
            );
        }
        
        // Create new sequence
        const newSequence = new CallingSequence({
            name: name || 'Calling Sequence',
            description: description || '',
            sequence: sortedSequence,
            settings: settings || {
                autoRepeat: true,
                callTimeout: 5,
                trackDuration: true
            },
            isDefault: isDefault || false,
            scheduleId: scheduleId || null,
            createdBy: currentUserId,
            updatedBy: currentUserId
        });
        
        await newSequence.save();
        
        await newSequence.populate('createdBy', 'name username');
        await newSequence.populate('updatedBy', 'name username');
        
        res.status(201).json({
            success: true,
            message: 'Calling sequence created successfully',
            data: newSequence
        });
    } catch (error) {
        console.error('Error creating calling sequence:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating calling sequence',
            error: error.message
        });
    }
});

// PUT /api/calling-sequences/:id - Update calling sequence
router.put('/:id', async (req, res) => {
    try {
        const { name, description, sequence, settings, isDefault, scheduleId } = req.body;
        
        const existingSeq = await CallingSequence.findById(req.params.id);
        if (!existingSeq) {
            return res.status(404).json({
                success: false,
                message: 'Calling sequence not found'
            });
        }
        
        // Get current user ID
        const currentUserId = req.user?.id || req.session?.userId || req.body.userId || existingSeq.updatedBy;
        
        // Validate sequence if provided
        if (sequence) {
            if (!Array.isArray(sequence) || sequence.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Sequence array is required and must contain at least one item'
                });
            }
            
            // Validate and sort sequence items
            for (const item of sequence) {
                if (!item.type || !['Examination', 'Consultation', 'Procedure', 'Late'].includes(item.type)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid type: ${item.type}`
                    });
                }
                if (!item.count || item.count < 1 || item.count > 10) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid count for ${item.type}`
                    });
                }
                if (!item.priority || item.priority < 1 || item.priority > 10) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid priority for ${item.type}`
                    });
                }
            }
        }
        
        // If setting as default, unset other defaults
        if (isDefault && !existingSeq.isDefault) {
            await CallingSequence.updateMany(
                { isDefault: true, _id: { $ne: req.params.id } },
                { isDefault: false, updatedBy: currentUserId }
            );
        }
        
        // If scheduleId changed, deactivate other sequences for new schedule
        if (scheduleId && String(scheduleId) !== String(existingSeq.scheduleId)) {
            await CallingSequence.updateMany(
                { scheduleId: scheduleId, isActive: true, _id: { $ne: req.params.id } },
                { isActive: false, updatedBy: currentUserId }
            );
        }
        
        // Update sequence
        if (name !== undefined) existingSeq.name = name;
        if (description !== undefined) existingSeq.description = description;
        if (sequence !== undefined) {
            const sortedSequence = [...sequence].sort((a, b) => a.priority - b.priority);
            existingSeq.sequence = sortedSequence;
        }
        if (settings !== undefined) existingSeq.settings = settings;
        if (isDefault !== undefined) existingSeq.isDefault = isDefault;
        if (scheduleId !== undefined) existingSeq.scheduleId = scheduleId || null;
        existingSeq.updatedBy = currentUserId;
        
        await existingSeq.save();
        
        await existingSeq.populate('createdBy', 'name username');
        await existingSeq.populate('updatedBy', 'name username');
        
        res.json({
            success: true,
            message: 'Calling sequence updated successfully',
            data: existingSeq
        });
    } catch (error) {
        console.error('Error updating calling sequence:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating calling sequence',
            error: error.message
        });
    }
});

// DELETE /api/calling-sequences/:id - Delete calling sequence
router.delete('/:id', async (req, res) => {
    try {
        const sequence = await CallingSequence.findById(req.params.id);
        if (!sequence) {
            return res.status(404).json({
                success: false,
                message: 'Calling sequence not found'
            });
        }
        
        // Don't allow deleting default sequence - deactivate instead
        if (sequence.isDefault) {
            sequence.isActive = false;
            await sequence.save();
            return res.json({
                success: true,
                message: 'Default sequence deactivated (cannot be deleted)'
            });
        }
        
        await CallingSequence.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: 'Calling sequence deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting calling sequence:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting calling sequence',
            error: error.message
        });
    }
});

module.exports = router;

