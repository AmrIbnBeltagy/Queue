const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Doctor name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Doctor code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]+$/, 'Doctor code should contain only letters and numbers']
  },
  speciality: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Speciality',
    required: [true, 'Speciality is required']
  },
  degree: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Degree',
    required: [true, 'Degree is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[0-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot be more than 30 characters'],
    match: [/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false  // Don't include password in queries by default
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  },
  licenseNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'License number cannot be more than 50 characters']
  }
}, {
  timestamps: true
});

// Index for better query performance
doctorSchema.index({ email: 1 });
doctorSchema.index({ code: 1 });
doctorSchema.index({ username: 1 });
doctorSchema.index({ isActive: 1, isDisabled: 1 });
doctorSchema.index({ speciality: 1 });
doctorSchema.index({ user: 1 });

// Virtual for full doctor status
doctorSchema.virtual('status').get(function() {
  if (this.isDisabled) return 'Disabled';
  if (!this.isActive) return 'Inactive';
  return 'Active';
});

// Method to disable doctor
doctorSchema.methods.disableDoctor = function(reason, disabledBy) {
  this.isDisabled = true;
  this.disabledDate = new Date();
  this.disabledReason = reason;
  this.disabledBy = disabledBy;
  return this.save();
};

// Method to enable doctor
doctorSchema.methods.enableDoctor = function(enabledBy) {
  this.isDisabled = false;
  this.disabledDate = null;
  this.disabledReason = null;
  this.disabledBy = null;
  return this.save();
};

// Ensure virtual fields are serialized
doctorSchema.set('toJSON', { virtuals: true });
doctorSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Doctor', doctorSchema);
