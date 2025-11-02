const mongoose = require('mongoose');

const specialitySchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Speciality code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9-]+$/, 'Speciality code should contain only letters, numbers, and hyphens']
  },
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
  disabledReason: {
    type: String,
    trim: true,
    maxlength: [200, 'Disable reason cannot be more than 200 characters']
  },
  disabledBy: {
    type: String,
    trim: true,
    maxlength: [50, 'Disabled by name cannot be more than 50 characters']
  }
}, {
  timestamps: true
});

// Index for better query performance
specialitySchema.index({ code: 1 });
specialitySchema.index({ arName: 1 });
specialitySchema.index({ enName: 1 });
specialitySchema.index({ isActive: 1, isDisabled: 1 });

// Virtual for full speciality status
specialitySchema.virtual('status').get(function() {
  if (this.isDisabled) return 'Disabled';
  if (!this.isActive) return 'Inactive';
  return 'Active';
});

// Method to disable speciality
specialitySchema.methods.disableSpeciality = function(reason, disabledBy) {
  this.isDisabled = true;
  this.disabledDate = new Date();
  this.disabledReason = reason;
  this.disabledBy = disabledBy;
  return this.save();
};

// Method to enable speciality
specialitySchema.methods.enableSpeciality = function(enabledBy) {
  this.isDisabled = false;
  this.disabledDate = null;
  this.disabledReason = null;
  this.disabledBy = null;
  return this.save();
};

// Ensure virtual fields are serialized
specialitySchema.set('toJSON', { virtuals: true });
specialitySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Speciality', specialitySchema);

