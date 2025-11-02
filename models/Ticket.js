const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    scheduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PhysicianSchedule',
        required: true
    },
    todayScheduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TodayPhysicianSchedule',
        required: false,
        default: null
    },
    sequenceNumber: {
        type: Number,
        required: true
    },
    ticketType: {
        type: String,
        enum: ['Examination', 'Consultation', 'Procedure', 'Late'],
        required: true
    },
    patientCode: {
        type: String,
        required: false,
        default: null
    },
    printedAt: {
        type: Date,
        default: Date.now
    },
    printedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['waiting', 'called', 'in_progress', 'completed', 'cancelled'],
        default: 'waiting'
    },
    calledAt: {
        type: Date,
        default: null
    },
    calledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    visitStartedAt: {
        type: Date,
        default: null
    },
    visitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    visitEndedAt: {
        type: Date,
        default: null
    },
    visitDuration: {
        type: Number,
        default: 0
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    recalledAt: {
        type: Date,
        default: null
    },
    recalledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    cancelledAt: {
        type: Date,
        default: null
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    cancellationReason: {
        type: String,
        default: null
    },
    notes: {
        type: String,
        default: ''
    },
    clinicCode: {
        type: String,
        required: false,
        default: null
    }
}, {
    timestamps: true
});

// Compound index to ensure unique sequence per schedule and ticket type per day
// Note: The unique constraint is handled by the getNextSequence method logic
// We don't need a unique index here as it would prevent multiple tickets per day

// Index for efficient queries
ticketSchema.index({ scheduleId: 1, status: 1 });
ticketSchema.index({ todayScheduleId: 1 });
ticketSchema.index({ printedAt: 1 });
ticketSchema.index({ printedBy: 1 });
ticketSchema.index({ ticketType: 1, printedAt: 1 });
ticketSchema.index({ clinicCode: 1 });

// Static method to get next sequence number for a schedule and ticket type for today
ticketSchema.statics.getNextSequence = async function(scheduleId, ticketType) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    // Convert scheduleId to ObjectId if it's a string
    const scheduleObjectId = mongoose.Types.ObjectId.isValid(scheduleId) 
        ? new mongoose.Types.ObjectId(scheduleId) 
        : scheduleId;
    
    // Try to find the last ticket for this schedule and ticket type today
    const lastTicket = await this.findOne({ 
        scheduleId: scheduleObjectId, 
        ticketType,
        printedAt: { $gte: startOfDay, $lt: endOfDay }
    }).sort({ sequenceNumber: -1 });
    
    if (lastTicket) {
        return lastTicket.sequenceNumber + 1;
    }
    
    return 1;
};

// Static method to get formatted ticket number with prefix
ticketSchema.statics.getFormattedTicketNumber = function(sequenceNumber, ticketType) {
    const prefixes = {
        'Examination': 'E',
        'Consultation': 'C', 
        'Procedure': 'P',
        'Late': 'L'
    };
    
    const prefix = prefixes[ticketType] || 'T';
    return `${prefix}${sequenceNumber.toString().padStart(3, '0')}`;
};

// Static method to get tickets for a schedule
ticketSchema.statics.getTicketsForSchedule = function(scheduleId, date = null) {
    const query = { scheduleId };
    
    if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setDate(endOfDay.getDate() + 1);
        endOfDay.setHours(0, 0, 0, 0);
        
        query.printedAt = { $gte: startOfDay, $lt: endOfDay };
    }
    
    return this.find(query)
        .populate('printedBy', 'name email')
        .sort({ ticketType: 1, sequenceNumber: 1 });
};

// Static method to get daily ticket statistics
ticketSchema.statics.getDailyStats = async function(scheduleId, date = null) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
    
    
    try {
        const stats = await this.aggregate([
            {
                $match: {
                    scheduleId: new mongoose.Types.ObjectId(scheduleId),
                    printedAt: { $gte: startOfDay, $lt: endOfDay }
                }
            },
            {
                $group: {
                    _id: '$ticketType',
                    count: { $sum: 1 },
                    maxSequence: { $max: '$sequenceNumber' },
                    lastPrinted: { $max: '$printedAt' }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);
        
        return stats;
    } catch (error) {
        console.error('Error in getDailyStats:', error);
        throw error;
    }
};


module.exports = mongoose.model('Ticket', ticketSchema);
