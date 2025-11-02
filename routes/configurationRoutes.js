const express = require('express');
const router = express.Router();
const Configuration = require('../models/Configuration');
const mongoose = require('mongoose');

// GET /api/configuration - Get all configurations
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        
        let query = { isActive: true };
        if (category) {
            query.category = category;
        }
        
        const configurations = await Configuration.find(query)
            .populate('updatedBy', 'name username email')
            .sort({ category: 1, key: 1 });
        
        res.json({
            success: true,
            data: configurations
        });
    } catch (error) {
        console.error('Error fetching configurations:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching configurations',
            error: error.message
        });
    }
});

// GET /api/configuration/:key - Get specific configuration by key
router.get('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        
        const configuration = await Configuration.findOne({ key, isActive: true })
            .populate('updatedBy', 'name username email');
        
        if (!configuration) {
            return res.status(404).json({
                success: false,
                message: 'Configuration not found'
            });
        }
        
        res.json({
            success: true,
            data: configuration
        });
    } catch (error) {
        console.error('Error fetching configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching configuration',
            error: error.message
        });
    }
});

// POST /api/configuration - Create or update configuration
router.post('/', async (req, res) => {
    try {
        const { key, value, description, category, dataType } = req.body;
        
        // Validate required fields
        if (!key || value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Key and value are required'
            });
        }
        
        // Validate data type
        if (dataType === 'number' && isNaN(Number(value))) {
            return res.status(400).json({
                success: false,
                message: 'Value must be a number for number data type'
            });
        }
        
        if (dataType === 'boolean' && typeof value !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Value must be a boolean for boolean data type'
            });
        }
        
        // Get user ID
        const updatedBy = req.user?.id || req.session?.userId || req.body.userId || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
        
        const configuration = await Configuration.setConfig(
            key,
            value,
            description || '',
            category || 'system',
            dataType || 'string',
            updatedBy
        );
        
        // Populate the updatedBy field
        await configuration.populate('updatedBy', 'name username email');
        
        res.status(201).json({
            success: true,
            message: 'Configuration saved successfully',
            data: configuration
        });
    } catch (error) {
        console.error('Error saving configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving configuration',
            error: error.message
        });
    }
});

// PUT /api/configuration/:key - Update specific configuration
router.put('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { value, description, category, dataType } = req.body;
        
        if (value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Value is required'
            });
        }
        
        // Get user ID
        const updatedBy = req.user?.id || req.session?.userId || req.body.userId || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
        
        const configuration = await Configuration.setConfig(
            key,
            value,
            description || '',
            category || 'system',
            dataType || 'string',
            updatedBy
        );
        
        // Populate the updatedBy field
        await configuration.populate('updatedBy', 'name username email');
        
        res.json({
            success: true,
            message: 'Configuration updated successfully',
            data: configuration
        });
    } catch (error) {
        console.error('Error updating configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating configuration',
            error: error.message
        });
    }
});

// DELETE /api/configuration/:key - Deactivate configuration
router.delete('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        
        const configuration = await Configuration.findOneAndUpdate(
            { key },
            { 
                isActive: false,
                updatedBy: req.user?.id || req.session?.userId || req.body.userId || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
            },
            { new: true }
        );
        
        if (!configuration) {
            return res.status(404).json({
                success: false,
                message: 'Configuration not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Configuration deactivated successfully'
        });
    } catch (error) {
        console.error('Error deactivating configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Error deactivating configuration',
            error: error.message
        });
    }
});

// POST /api/configuration/initialize - Initialize default configurations
router.post('/initialize', async (req, res) => {
    try {
        const adminUserId = req.user?.id || req.session?.userId || req.body.userId || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
        
        await Configuration.initializeDefaults(adminUserId);
        
        res.json({
            success: true,
            message: 'Default configurations initialized successfully'
        });
    } catch (error) {
        console.error('Error initializing default configurations:', error);
        res.status(500).json({
            success: false,
            message: 'Error initializing default configurations',
            error: error.message
        });
    }
});

// GET /api/configuration/category/:category - Get configurations by category
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        
        const configurations = await Configuration.getConfigsByCategory(category);
        
        res.json({
            success: true,
            data: configurations
        });
    } catch (error) {
        console.error('Error fetching configurations by category:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching configurations by category',
            error: error.message
        });
    }
});

// GET /api/configuration/print_hours_before_clinic - Get print hours before clinic configuration
router.get('/print_hours_before_clinic', async (req, res) => {
    try {
        const printHours = await Configuration.getConfig('print_hours_before_clinic', 2);
        res.json({
            success: true,
            data: {
                key: 'print_hours_before_clinic',
                value: printHours,
                description: 'Number of hours before clinic start time when tickets can be printed'
            }
        });
    } catch (error) {
        console.error('Error getting print hours configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting print hours configuration',
            error: error.message
        });
    }
});

// GET /api/configuration/print_minutes_after_clinic_end - Get print minutes after clinic end configuration
router.get('/print_minutes_after_clinic_end', async (req, res) => {
    try {
        const printMinutesAfterEnd = await Configuration.getConfig('print_minutes_after_clinic_end', 10);
        res.json({
            success: true,
            data: {
                key: 'print_minutes_after_clinic_end',
                value: printMinutesAfterEnd,
                description: 'Number of minutes after clinic end time when ticket printing is no longer allowed'
            }
        });
    } catch (error) {
        console.error('Error getting print minutes after end configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting print minutes after end configuration',
            error: error.message
        });
    }
});


// POST /api/configuration/initialize-defaults - Initialize default configurations
router.post('/initialize-defaults', async (req, res) => {
    try {
        const defaultConfigs = [
            {
                key: 'print_hours_before_clinic',
                value: 2,
                description: 'Number of hours before clinic start time when tickets can be printed',
                category: 'printing',
                dataType: 'number'
            },
            {
                key: 'print_minutes_after_clinic_end',
                value: 10,
                description: 'Number of minutes after clinic end time when ticket printing is no longer allowed',
                category: 'printing',
                dataType: 'number'
            },
            {
                key: 'max_tickets_per_schedule',
                value: 100,
                description: 'Maximum number of tickets that can be printed per schedule per day',
                category: 'printing',
                dataType: 'number'
            }
        ];
        
        let createdCount = 0;
        let existingCount = 0;
        
        for (const configData of defaultConfigs) {
            try {
                const existingConfig = await Configuration.findOne({ key: configData.key });
                if (!existingConfig) {
                    const newConfig = new Configuration(configData);
                    await newConfig.save();
                    createdCount++;
                    console.log(`Created default configuration: ${configData.key}`);
                } else {
                    existingCount++;
                    console.log(`Configuration already exists: ${configData.key}`);
                }
            } catch (error) {
                console.error(`Error creating configuration ${configData.key}:`, error);
            }
        }
        
        res.json({
            success: true,
            message: `Default configurations initialized. Created: ${createdCount}, Already existed: ${existingCount}`,
            data: {
                created: createdCount,
                existing: existingCount,
                total: defaultConfigs.length
            }
        });
    } catch (error) {
        console.error('Error initializing default configurations:', error);
        res.status(500).json({
            success: false,
            message: 'Error initializing default configurations',
            error: error.message
        });
    }
});

module.exports = router;
