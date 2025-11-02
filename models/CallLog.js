const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
    index: true
  },
  orderNumber: {
    type: String,
    required: [true, 'Order number is required'],
    index: true
  },
  agentName: {
    type: String,
    required: [true, 'Agent name is required'],
    trim: true,
    maxlength: [100, 'Agent name cannot be more than 100 characters'],
    index: true
  },
  callResult: {
    type: String,
    required: [true, 'Call result is required'],
    trim: true,
    enum: {
      values: ['Confirmed', 'No Answer', 'Wrong Number', 'Callback Requested', 'Cancelled by Customer', 'Pending', 'On Hold', 'Refund Initiated', 'Refunded'],
      message: 'Invalid call result value'
    },
    index: true
  },
  callDuration: {
    type: Number,
    min: [0, 'Call duration cannot be negative'],
    default: 0 // in seconds
  },
  callNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Call notes cannot be more than 500 characters']
  },
  customerPhone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot be more than 20 characters']
  },
  customerName: {
    type: String,
    trim: true,
    maxlength: [100, 'Customer name cannot be more than 100 characters']
  },
  callDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  followUpDate: {
    type: Date,
    index: true
  },
  callType: {
    type: String,
    enum: {
      values: ['Outbound', 'Inbound', 'Follow-up', 'Support'],
      message: 'Invalid call type'
    },
    default: 'Outbound',
    index: true
  },
  statusBeforeCall: {
    type: String,
    trim: true
  },
  statusAfterCall: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
callLogSchema.index({ orderId: 1, callDate: -1 });
callLogSchema.index({ agentName: 1, callDate: -1 });
callLogSchema.index({ callResult: 1, callDate: -1 });
callLogSchema.index({ callDate: -1 });
callLogSchema.index({ isActive: 1 });

// Virtual for formatted call duration
callLogSchema.virtual('formattedDuration').get(function() {
  const minutes = Math.floor(this.callDuration / 60);
  const seconds = this.callDuration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Virtual for formatted call date
callLogSchema.virtual('formattedCallDate').get(function() {
  return this.callDate.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
});

// Pre-save middleware to update timestamps
callLogSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get call statistics
callLogSchema.statics.getCallStatistics = async function(startDate, endDate) {
  const matchStage = {
    isActive: true
  };

  if (startDate || endDate) {
    matchStage.callDate = {};
    if (startDate) matchStage.callDate.$gte = new Date(startDate);
    if (endDate) matchStage.callDate.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        confirmedCalls: {
          $sum: { $cond: [{ $eq: ['$callResult', 'Confirmed'] }, 1, 0] }
        },
        noAnswerCalls: {
          $sum: { $cond: [{ $eq: ['$callResult', 'No Answer'] }, 1, 0] }
        },
        wrongNumberCalls: {
          $sum: { $cond: [{ $eq: ['$callResult', 'Wrong Number'] }, 1, 0] }
        },
        callbackRequests: {
          $sum: { $cond: [{ $eq: ['$callResult', 'Callback Requested'] }, 1, 0] }
        },
        cancelledCalls: {
          $sum: { $cond: [{ $eq: ['$callResult', 'Cancelled by Customer'] }, 1, 0] }
        },
        averageDuration: { $avg: '$callDuration' },
        totalDuration: { $sum: '$callDuration' }
      }
    },
    {
      $project: {
        _id: 0,
        totalCalls: 1,
        confirmedCalls: 1,
        noAnswerCalls: 1,
        wrongNumberCalls: 1,
        callbackRequests: 1,
        cancelledCalls: 1,
        averageDuration: { $round: ['$averageDuration', 2] },
        totalDuration: 1,
        confirmationRate: {
          $round: [
            { $multiply: [{ $divide: ['$confirmedCalls', '$totalCalls'] }, 100] },
            2
          ]
        }
      }
    }
  ]);

  return stats[0] || {
    totalCalls: 0,
    confirmedCalls: 0,
    noAnswerCalls: 0,
    wrongNumberCalls: 0,
    callbackRequests: 0,
    cancelledCalls: 0,
    averageDuration: 0,
    totalDuration: 0,
    confirmationRate: 0
  };
};

module.exports = mongoose.model('CallLog', callLogSchema);


