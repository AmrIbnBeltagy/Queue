const express = require('express');
const router = express.Router();
const AgentCounter = require('../models/AgentCounter');
const Location = require('../models/Location');
const mongoose = require('mongoose');

// GET /api/agent-counters - Get all agent counters
router.get('/', async (req, res) => {
    try {
        const { location, isActive, search } = req.query;
        const query = {};

        if (location) query.location = location;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        if (search) {
            query.$or = [
                { counterNo: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const counters = await AgentCounter.find(query)
            .populate('location', 'arName enName')
            .populate('createdBy', 'name username')
            .populate('updatedBy', 'name username')
            .sort({ counterNo: 1 });

        res.json({
            success: true,
            data: counters
        });
    } catch (error) {
        console.error('Error fetching agent counters:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching agent counters',
            error: error.message
        });
    }
});

// GET /api/agent-counters/:id - Get agent counter by ID
router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid agent counter ID'
            });
        }

        const counter = await AgentCounter.findById(req.params.id)
            .populate('location', 'arName enName')
            .populate('createdBy', 'name username')
            .populate('updatedBy', 'name username');

        if (!counter) {
            return res.status(404).json({
                success: false,
                message: 'Agent counter not found'
            });
        }

        res.json({
            success: true,
            data: counter
        });
    } catch (error) {
        console.error('Error fetching agent counter:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching agent counter',
            error: error.message
        });
    }
});

// POST /api/agent-counters - Create new agent counter
router.post('/', async (req, res) => {
    try {
        const { counterNo, location, description } = req.body;

        // Validate required fields
        if (!counterNo || !location) {
            return res.status(400).json({
                success: false,
                message: 'Counter number and location are required'
            });
        }

        // Validate location exists
        const locationExists = await Location.findById(location);
        if (!locationExists) {
            return res.status(404).json({
                success: false,
                message: 'Location not found'
            });
        }

        // Check if counter number already exists
        const existingCounter = await AgentCounter.findOne({ counterNo });
        if (existingCounter) {
            return res.status(400).json({
                success: false,
                message: 'Counter number already exists'
            });
        }

        // Debug logging
        console.log('req.user?.id:', req.user?.id);
        console.log('req.session?.userId:', req.session?.userId);
        console.log('req.body.userId:', req.body.userId);
        console.log('req.body:', req.body);
        
        // Get or create a default admin user
        let createdBy;
        if (req.user?.id || req.session?.userId || req.body.userId) {
            createdBy = req.user?.id || req.session?.userId || req.body.userId;
        } else {
            // Try to find an existing admin user
            const User = require('../models/User');
            const adminUser = await User.findOne({ role: 'admin' });
            if (adminUser) {
                createdBy = adminUser._id;
            } else {
                // Create a default admin user
                const bcrypt = require('bcryptjs');
                const defaultAdmin = new User({
                    name: 'System Admin',
                    username: 'admin',
                    email: 'admin@system.com',
                    password: await bcrypt.hash('admin123', 10),
                    role: 'admin',
                    phone: '+201234567890'
                });
                await defaultAdmin.save();
                createdBy = defaultAdmin._id;
                console.log('Created default admin user:', defaultAdmin._id);
            }
        }
        
        console.log('Final createdBy value:', createdBy);
        
        const counter = new AgentCounter({
            counterNo,
            location,
            description: description || '',
            createdBy: createdBy
        });

        await counter.save();

        // Populate the created counter
        await counter.populate([
            { path: 'location', select: 'arName enName' },
            { path: 'createdBy', select: 'name username' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Agent counter created successfully',
            data: counter
        });
    } catch (error) {
        console.error('Error creating agent counter:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating agent counter',
            error: error.message
        });
    }
});

// PUT /api/agent-counters/:id - Update agent counter
router.put('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid agent counter ID'
            });
        }

        const { counterNo, location, description, isActive } = req.body;

        // Validate location if provided
        if (location) {
            const locationExists = await Location.findById(location);
            if (!locationExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Location not found'
                });
            }
        }

        // Check if counter number already exists (excluding current counter)
        if (counterNo) {
            const existingCounter = await AgentCounter.findOne({ 
                counterNo, 
                _id: { $ne: req.params.id } 
            });
            if (existingCounter) {
                return res.status(400).json({
                    success: false,
                    message: 'Counter number already exists'
                });
            }
        }

        const updateData = {};
        if (counterNo) updateData.counterNo = counterNo;
        if (location) updateData.location = location;
        if (description !== undefined) updateData.description = description;
        if (isActive !== undefined) updateData.isActive = isActive;
        updateData.updatedBy = req.user?.id || req.session?.userId || req.body.userId || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');

        const counter = await AgentCounter.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate([
            { path: 'location', select: 'arName enName' },
            { path: 'createdBy', select: 'name username' },
            { path: 'updatedBy', select: 'name username' }
        ]);

        if (!counter) {
            return res.status(404).json({
                success: false,
                message: 'Agent counter not found'
            });
        }

        res.json({
            success: true,
            message: 'Agent counter updated successfully',
            data: counter
        });
    } catch (error) {
        console.error('Error updating agent counter:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating agent counter',
            error: error.message
        });
    }
});

// PATCH /api/agent-counters/:id/status - Toggle agent counter status
router.patch('/:id/status', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid agent counter ID'
            });
        }

        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isActive must be a boolean value'
            });
        }

        const counter = await AgentCounter.findById(req.params.id);
        if (!counter) {
            return res.status(404).json({
                success: false,
                message: 'Agent counter not found'
            });
        }

        if (isActive) {
            await counter.activate(req.user?.id || req.session?.userId || req.body.userId);
        } else {
            await counter.deactivate(req.user?.id || req.session?.userId || req.body.userId);
        }

        // Populate the updated counter
        await counter.populate([
            { path: 'location', select: 'arName enName' },
            { path: 'createdBy', select: 'name username' },
            { path: 'updatedBy', select: 'name username' }
        ]);

        res.json({
            success: true,
            message: `Agent counter ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: counter
        });
    } catch (error) {
        console.error('Error toggling agent counter status:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling agent counter status',
            error: error.message
        });
    }
});

// DELETE /api/agent-counters/:id - Delete agent counter
router.delete('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid agent counter ID'
            });
        }

        const counter = await AgentCounter.findByIdAndDelete(req.params.id);

        if (!counter) {
            return res.status(404).json({
                success: false,
                message: 'Agent counter not found'
            });
        }

        res.json({
            success: true,
            message: 'Agent counter deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting agent counter:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting agent counter',
            error: error.message
        });
    }
});

module.exports = router;
