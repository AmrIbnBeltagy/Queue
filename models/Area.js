const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Area name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Area name cannot be more than 100 characters']
  },
  code: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  city: {
    type: String,
    trim: true
  },
  region: {
    type: String,
    trim: true
  },
  zipCode: {
    type: String,
    trim: true
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
    totalOrders: {
      type: Number,
      default: 0
    },
    completedOrders: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Pre-save hook to auto-generate code if not provided
areaSchema.pre('save', async function(next) {
  try {
    if (this.isNew && (!this.code || this.code.trim() === '')) {
      // Generate prefix from name
      let prefix = this.name
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 3);
      
      if (prefix.length < 3) {
        prefix = this.name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
      }
      
      if (!prefix || prefix.length === 0) {
        prefix = 'ARE';
      }
      
      prefix = prefix.padEnd(3, 'X');
      
      // Find the highest number for this prefix
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^${escapedPrefix}-\\d{4}$`);
      
      const existingAreas = await this.constructor.find({
        code: regex
      }).sort({ code: -1 }).limit(1).lean();
      
      let nextNumber = 1;
      if (existingAreas.length > 0) {
        const lastCode = existingAreas[0].code;
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
      
      console.log(`Generated code for area ${this.name}: ${this.code}`);
    }
    next();
  } catch (error) {
    console.error('Error in area pre-save hook:', error);
    next(error);
  }
});

// Index for better query performance
areaSchema.index({ name: 1 });
areaSchema.index({ code: 1 });
areaSchema.index({ group: 1 });
areaSchema.index({ isActive: 1 });

// Method to activate area
areaSchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

// Method to deactivate area
areaSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

module.exports = mongoose.model('Area', areaSchema);
