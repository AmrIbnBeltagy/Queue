const mongoose = require('mongoose');

const degreeSchema = new mongoose.Schema({
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
degreeSchema.index({ arName: 1 });
degreeSchema.index({ enName: 1 });
degreeSchema.index({ isActive: 1, isDisabled: 1 });

// Virtual for full degree status
degreeSchema.virtual('status').get(function() {
  if (this.isDisabled) return 'Disabled';
  if (!this.isActive) return 'Inactive';
  return 'Active';
});

// Method to disable degree
degreeSchema.methods.disableDegree = function(reason, disabledBy) {
  this.isDisabled = true;
  this.disabledDate = new Date();
  this.disabledReason = reason;
  this.disabledBy = disabledBy;
  return this.save();
};

// Method to enable degree
degreeSchema.methods.enableDegree = function(enabledBy) {
  this.isDisabled = false;
  this.disabledDate = null;
  this.disabledReason = null;
  this.disabledBy = null;
  return this.save();
};

// Ensure virtual fields are serialized
degreeSchema.set('toJSON', { virtuals: true });
degreeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Degree', degreeSchema);

