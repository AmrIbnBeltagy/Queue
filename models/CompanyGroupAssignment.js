const mongoose = require('mongoose');

const companyGroupAssignmentSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShippingCompany',
    required: [true, 'Shipping company is required']
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group is required']
  },
  receivedPrice: {
    type: Number,
    required: [true, 'Received price is required'],
    min: [0, 'Received price cannot be negative']
  },
  refundPrice: {
    type: Number,
    required: [true, 'Refund price is required'],
    min: [0, 'Refund price cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  }
}, {
  timestamps: true
});

// Compound index to ensure unique company-group combination
companyGroupAssignmentSchema.index({ company: 1, group: 1 }, { unique: true });

// Index for better query performance
companyGroupAssignmentSchema.index({ company: 1 });
companyGroupAssignmentSchema.index({ group: 1 });
companyGroupAssignmentSchema.index({ isActive: 1 });

module.exports = mongoose.model('CompanyGroupAssignment', companyGroupAssignmentSchema);
