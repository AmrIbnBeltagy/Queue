const mongoose = require('mongoose');

const callingSequenceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'Sequence name cannot be more than 100 characters'],
        default: 'Default Calling Sequence'
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot be more than 500 characters'],
        default: ''
    },
    sequence: {
        type: [{
            type: {
                type: String,
                enum: ['Examination', 'Consultation', 'Procedure', 'Late'],
                required: true
            },
            count: {
                type: Number,
                required: true,
                min: [1, 'Count must be at least 1'],
                max: [10, 'Count cannot exceed 10']
            },
            priority: {
                type: Number,
                required: true,
                min: [1, 'Priority must be at least 1'],
                max: [10, 'Priority cannot exceed 10']
            }
        }],
        required: true,
        validate: {
            validator: function(v) {
                return v && v.length > 0;
            },
            message: 'Sequence must contain at least one item'
        }
    },
    settings: {
        autoRepeat: {
            type: Boolean,
            default: true
        },
        callTimeout: {
            type: Number,
            default: 5,
            min: [1, 'Call timeout must be at least 1 minute'],
            max: [60, 'Call timeout cannot exceed 60 minutes']
        },
        trackDuration: {
            type: Boolean,
            default: true
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    scheduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PhysicianSchedule',
        default: null,
        sparse: true // Allow null values but ensure uniqueness when not null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Indexes
callingSequenceSchema.index({ isActive: 1, isDefault: 1 });
callingSequenceSchema.index({ scheduleId: 1 }, { sparse: true });
callingSequenceSchema.index({ 'sequence.type': 1 });

// Static method to get default sequence
callingSequenceSchema.statics.getDefault = async function() {
    try {
        const defaultSeq = await this.findOne({ isDefault: true, isActive: true });
        if (defaultSeq) {
            // Ensure sequence is sorted by priority
            if (defaultSeq.sequence && Array.isArray(defaultSeq.sequence)) {
                defaultSeq.sequence.sort((a, b) => (a.priority || 0) - (b.priority || 0));
            }
            return defaultSeq;
        }
        
        // Return default sequence structure if none exists
        return {
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
        };
    } catch (error) {
        console.error('Error getting default sequence:', error);
        return null;
    }
};

// Static method to get sequence for a schedule
callingSequenceSchema.statics.getForSchedule = async function(scheduleId) {
    try {
        // First try to get schedule-specific sequence
        if (scheduleId) {
            const scheduleSeq = await this.findOne({ 
                scheduleId: scheduleId, 
                isActive: true 
            }).sort({ createdAt: -1 });
            if (scheduleSeq) {
                // Ensure sequence is sorted by priority
                if (scheduleSeq.sequence && Array.isArray(scheduleSeq.sequence)) {
                    scheduleSeq.sequence.sort((a, b) => (a.priority || 0) - (b.priority || 0));
                }
                return scheduleSeq;
            }
        }
        
        // Fall back to default sequence
        return await this.getDefault();
    } catch (error) {
        console.error('Error getting sequence for schedule:', error);
        return await this.getDefault();
    }
};

// Instance method to get formatted sequence string
callingSequenceSchema.methods.getFormattedSequence = function() {
    if (!this.sequence || this.sequence.length === 0) return '';
    
    const items = [];
    this.sequence.forEach(step => {
        for (let i = 0; i < step.count; i++) {
            items.push(step.type.charAt(0));
        }
    });
    return items.join(' → ');
};

module.exports = mongoose.model('CallingSequence', callingSequenceSchema);

