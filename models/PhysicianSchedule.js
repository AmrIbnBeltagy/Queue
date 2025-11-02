const mongoose = require('mongoose');

const physicianScheduleSchema = new mongoose.Schema({
  physician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Physician is required']
  },
  days: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  }],
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^((1[0-2]|[1-9]):[0-5][0-9]\s?(AM|PM)|([01]?[0-9]|2[0-3]):[0-5][0-9])$/i, 'Please enter a valid time format (e.g., 9:00 AM or 09:00)']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^((1[0-2]|[1-9]):[0-5][0-9]\s?(AM|PM)|([01]?[0-9]|2[0-3]):[0-5][0-9])$/i, 'Please enter a valid time format (e.g., 5:00 PM or 17:00)']
  },
  maxPatients: {
    type: Number,
    min: [1, 'Max patients must be at least 1'],
    default: null
  },
  appointmentDuration: {
    type: Number,
    min: [5, 'Appointment duration must be at least 5 minutes'],
    default: null
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters'],
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for better query performance
physicianScheduleSchema.index({ physician: 1, isActive: 1 });
physicianScheduleSchema.index({ days: 1 });
physicianScheduleSchema.index({ startDate: 1 });

// Virtual for formatted time range
physicianScheduleSchema.virtual('timeRange').get(function() {
  return `${this.startTime} - ${this.endTime}`;
});

// Virtual for formatted days
physicianScheduleSchema.virtual('formattedDays').get(function() {
  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };
  return this.days.map(day => dayNames[day]).join(', ');
});

// Method to toggle active status
physicianScheduleSchema.methods.toggleStatus = function(updatedBy) {
  this.isActive = !this.isActive;
  this.updatedBy = updatedBy || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
  return this.save();
};

// Method to check if schedule is valid for a specific day
physicianScheduleSchema.methods.isValidForDay = function(day) {
  return this.days.includes(day.toLowerCase()) && this.isActive;
};

// Method to get available time slots
physicianScheduleSchema.methods.getAvailableSlots = function(date) {
  if (!this.isValidForDay(date.getDay())) {
    return [];
  }
  
  // This would be implemented based on existing appointments
  // For now, return the basic time range
  return {
    startTime: this.startTime,
    endTime: this.endTime,
    duration: this.appointmentDuration || 30
  };
};

// Static method to find schedules for a physician
physicianScheduleSchema.statics.findByPhysician = function(physicianId, activeOnly = true) {
  const query = { physician: physicianId };
  if (activeOnly) {
    query.isActive = true;
  }
  return this.find(query).populate('physician', 'name speciality').populate('clinic', 'arName enName').sort({ createdAt: -1 });
};

// Static method to find schedules for a clinic
physicianScheduleSchema.statics.findByClinic = function(clinicId, activeOnly = true) {
  const query = { clinic: clinicId };
  if (activeOnly) {
    query.isActive = true;
  }
  return this.find(query).populate('physician', 'name speciality').populate('clinic', 'arName enName').sort({ createdAt: -1 });
};

// Static method to find schedules for a specific day
physicianScheduleSchema.statics.findByDay = function(day, activeOnly = true) {
  const query = { days: day };
  if (activeOnly) {
    query.isActive = true;
  }
  return this.find(query).populate('physician', 'name speciality').populate('clinic', 'arName enName');
};

// Static method to get statistics
physicianScheduleSchema.statics.getStats = async function() {
  const total = await this.countDocuments();
  const active = await this.countDocuments({ isActive: true });
  const inactive = await this.countDocuments({ isActive: false });
  
  return {
    total,
    active,
    inactive
  };
};

module.exports = mongoose.model('PhysicianSchedule', physicianScheduleSchema);
