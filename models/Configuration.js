const mongoose = require('mongoose');

const configurationSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: [100, 'Configuration key cannot be more than 100 characters']
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot be more than 500 characters'],
        default: ''
    },
    category: {
        type: String,
        enum: ['system', 'printing', 'scheduling', 'notifications', 'security'],
        default: 'system'
    },
    dataType: {
        type: String,
        enum: ['string', 'number', 'boolean', 'object', 'array'],
        default: 'string'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
configurationSchema.index({ key: 1 });
configurationSchema.index({ category: 1 });
configurationSchema.index({ isActive: 1 });

// Static method to get configuration value by key
configurationSchema.statics.getConfig = async function(key, defaultValue = null) {
    try {
        const config = await this.findOne({ key, isActive: true });
        return config ? config.value : defaultValue;
    } catch (error) {
        console.error(`Error getting configuration for key ${key}:`, error);
        return defaultValue;
    }
};

// Static method to set configuration value
configurationSchema.statics.setConfig = async function(key, value, description = '', category = 'system', dataType = 'string', updatedBy) {
    try {
        const config = await this.findOneAndUpdate(
            { key },
            {
                value,
                description,
                category,
                dataType,
                updatedBy,
                isActive: true
            },
            { 
                upsert: true, 
                new: true, 
                runValidators: true 
            }
        );
        return config;
    } catch (error) {
        console.error(`Error setting configuration for key ${key}:`, error);
        throw error;
    }
};

// Static method to get all configurations by category
configurationSchema.statics.getConfigsByCategory = async function(category) {
    try {
        return await this.find({ category, isActive: true }).sort({ key: 1 });
    } catch (error) {
        console.error(`Error getting configurations for category ${category}:`, error);
        return [];
    }
};

// Static method to initialize default configurations
configurationSchema.statics.initializeDefaults = async function(adminUserId) {
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
        },
        {
            key: 'ticket_sequence_reset_time',
            value: '00:00',
            description: 'Time when ticket sequences reset daily (24-hour format)',
            category: 'printing',
            dataType: 'string'
        },
        {
            key: 'system_name',
            value: 'Queue Management System',
            description: 'Name of the system displayed in the interface',
            category: 'system',
            dataType: 'string'
        },
        {
            key: 'auto_assign_clinics',
            value: false,
            description: 'Automatically assign clinics to schedules when created',
            category: 'scheduling',
            dataType: 'boolean'
        }
    ];

    for (const config of defaultConfigs) {
        await this.setConfig(
            config.key,
            config.value,
            config.description,
            config.category,
            config.dataType,
            adminUserId
        );
    }
};

module.exports = mongoose.model('Configuration', configurationSchema);
