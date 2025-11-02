const mongoose = require('mongoose');

const monitorSchema = new mongoose.Schema({
  arName: {
    type: String,
    required: [true, 'Arabic name is required'],
    trim: true,
    maxlength: [100, 'Arabic name cannot be more than 100 characters']
  },
  enName: {
    type: String,
    required: [true, 'English name is required'],
    trim: true,
    maxlength: [100, 'English name cannot be more than 100 characters']
  },
  ip: {
    type: String,
    required: [true, 'IP address is required'],
    trim: true,
    match: [/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Please enter a valid IP address']
  },
  assignedClinics: [{
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    assignedDate: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: String,
      default: null
    },
    notes: {
      type: String,
      default: null
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isDisabled: {
    type: Boolean,
    default: false
  },
  disabledDate: {
    type: Date,
    default: null
  },
  disabledBy: {
    type: String,
    default: null
  },
  disabledReason: {
    type: String,
    default: null
  },
  enabledDate: {
    type: Date,
    default: null
  },
  enabledBy: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for better performance
monitorSchema.index({ arName: 1, enName: 1 });
monitorSchema.index({ ip: 1 });
monitorSchema.index({ isActive: 1, isDisabled: 1 });

module.exports = mongoose.model('Monitor', monitorSchema);
