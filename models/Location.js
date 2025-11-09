const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
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
locationSchema.index({ arName: 1, enName: 1 });
locationSchema.index({ isActive: 1, isDisabled: 1 });

module.exports = mongoose.model('Location', locationSchema);












