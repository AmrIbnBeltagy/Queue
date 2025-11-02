const mongoose = require('mongoose');

const physicianClinicAssignmentSchema = new mongoose.Schema({
  physicianSchedule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PhysicianSchedule',
    required: [true, 'Physician Schedule is required']
  },
  clinic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: [true, 'Clinic is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  assignedDate: {
    type: Date,
    default: Date.now
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters'],
    default: null
  },
  // Track last clinic before the most recent change
  previousClinic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    default: null
  },
  previousUpdatedAt: {
    type: Date,
    default: null
  },
  previousUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deactivatedAt: {
    type: Date,
    default: null
  },
  deactivatedReason: {
    type: String,
    maxlength: [200, 'Deactivation reason cannot be more than 200 characters'],
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
physicianClinicAssignmentSchema.index({ physicianSchedule: 1, clinic: 1 });
physicianClinicAssignmentSchema.index({ isActive: 1 });
physicianClinicAssignmentSchema.index({ clinic: 1, isActive: 1 });

// Ensure each clinic can only be assigned to one active schedule at a time
physicianClinicAssignmentSchema.index({ clinic: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

// Virtual for assignment status
physicianClinicAssignmentSchema.virtual('status').get(function() {
  if (!this.isActive) return 'Inactive';
  return 'Active';
});

// Method to deactivate assignment
physicianClinicAssignmentSchema.methods.deactivate = function(deactivatedBy) {
  this.isActive = false;
  return this.save();
};

// Method to reactivate assignment
physicianClinicAssignmentSchema.methods.reactivate = function(reactivatedBy) {
  this.isActive = true;
  return this.save();
};

// Static method to find assignments by physician schedule
physicianClinicAssignmentSchema.statics.findByPhysicianSchedule = function(physicianScheduleId, activeOnly = true) {
  const query = { physicianSchedule: physicianScheduleId };
  if (activeOnly) {
    query.isActive = true;
  }
  return this.find(query)
    .populate('physicianSchedule', 'startTime endTime days')
    .populate('clinic', 'arName enName location')
    .populate('assignedBy', 'name username')
    .sort({ createdAt: -1 });
};

// Static method to find assignments by clinic
physicianClinicAssignmentSchema.statics.findByClinic = function(clinicId, activeOnly = true) {
  const query = { clinic: clinicId };
  if (activeOnly) {
    query.isActive = true;
  }
  return this.find(query)
    .populate('physician', 'name speciality degree email phone')
    .populate('assignedBy', 'name username')
    .sort({ createdAt: -1 });
};

// Static method to get statistics
physicianClinicAssignmentSchema.statics.getStats = async function() {
  const total = await this.countDocuments();
  const active = await this.countDocuments({ isActive: true });
  const inactive = await this.countDocuments({ isActive: false });
  
  return {
    total,
    active,
    inactive
  };
};

// Ensure virtual fields are serialized
physicianClinicAssignmentSchema.set('toJSON', { virtuals: true });
physicianClinicAssignmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PhysicianClinicAssignment', physicianClinicAssignmentSchema);
