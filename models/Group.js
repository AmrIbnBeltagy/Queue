const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Group name cannot be more than 100 characters']
  },
  code: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  statistics: {
    totalAreas: {
      type: Number,
      default: 0
    },
    totalOrders: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Pre-save hook to auto-generate code if not provided
groupSchema.pre('save', async function(next) {
  try {
    if (this.isNew && (!this.code || this.code.trim() === '')) {
      // Fixed prefix for all groups
      const prefix = 'GRP';
      
      // Find the highest number for GRP prefix
      const regex = new RegExp(`^GRP-\\d{4}$`);
      
      const existingGroups = await this.constructor.find({
        code: regex
      }).sort({ code: -1 }).limit(1).lean();
      
      let nextNumber = 1;
      if (existingGroups.length > 0) {
        const lastCode = existingGroups[0].code;
        const parts = lastCode.split('-');
        if (parts.length === 2) {
          const lastNumber = parseInt(parts[1], 10);
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
      }
      
      const paddedNumber = nextNumber.toString().padStart(4, '0');
      this.code = `${prefix}-${paddedNumber}`;
      
      console.log(`Generated code for group ${this.name}: ${this.code}`);
    }
    next();
  } catch (error) {
    console.error('Error in group pre-save hook:', error);
    next(error);
  }
});

// Index for better query performance
groupSchema.index({ name: 1 });
groupSchema.index({ code: 1 });
groupSchema.index({ isActive: 1 });

// Method to activate group
groupSchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

// Method to deactivate group
groupSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

module.exports = mongoose.model('Group', groupSchema);
