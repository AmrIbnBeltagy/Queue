const mongoose = require('mongoose');

const shippingCompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Company name cannot be more than 100 characters']
  },
  code: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
  },
  website: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'Please enter a valid URL']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    zipCode: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    }
  },
  services: [{
    type: String,
    enum: ['Standard Shipping', 'Express Shipping', 'Overnight Shipping', 'International Shipping', 'Same Day Delivery', 'Freight Shipping']
  }],
  apiCredentials: {
    hasApi: {
      type: Boolean,
      default: false
    },
    apiKey: {
      type: String,
      trim: true
    },
    apiSecret: {
      type: String,
      trim: true
    },
    apiEndpoint: {
      type: String,
      trim: true
    }
  },
  pricing: {
    baseRate: {
      type: Number,
      default: 0,
      min: [0, 'Base rate cannot be negative']
    },
    perKgRate: {
      type: Number,
      default: 0,
      min: [0, 'Per kg rate cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
      uppercase: true
    }
  },
  operatingHours: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    weekdays: {
      open: {
        type: String,
        default: '09:00',
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
      },
      close: {
        type: String,
        default: '17:00',
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
      }
    },
    weekend: {
      open: {
        type: String,
        default: '10:00',
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
      },
      close: {
        type: String,
        default: '14:00',
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
      }
    },
    operatesWeekend: {
      type: Boolean,
      default: false
    }
  },
  contactPerson: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    position: {
      type: String,
      trim: true
    }
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot be more than 5']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  statistics: {
    totalShipments: {
      type: Number,
      default: 0
    },
    successfulDeliveries: {
      type: Number,
      default: 0
    },
    failedDeliveries: {
      type: Number,
      default: 0
    },
    averageDeliveryTime: {
      type: Number,
      default: 0 // in days
    }
  }
}, {
  timestamps: true
});

// Pre-save hook to auto-generate code if not provided
shippingCompanySchema.pre('save', async function(next) {
  try {
    if (this.isNew && (!this.code || this.code.trim() === '' || this.code.startsWith('Will be generated'))) {
      // Generate prefix from name: take first 3 letters or first letters of words, uppercase
      let prefix = this.name
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 3);
      
      // If prefix is less than 3 chars, use first 3 letters of name
      if (prefix.length < 3) {
        prefix = this.name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
      }
      
      if (!prefix || prefix.length === 0) {
        prefix = 'COM';
      }
      
      // Pad prefix to 3 characters if needed
      prefix = prefix.padEnd(3, 'X');
      
      // Find the highest number for this prefix
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^${escapedPrefix}-\\d{4}$`);
      
      const existingCompanies = await this.constructor.find({
        code: regex
      }).sort({ code: -1 }).limit(1).lean();
      
      let nextNumber = 1;
      if (existingCompanies.length > 0) {
        const lastCode = existingCompanies[0].code;
        const parts = lastCode.split('-');
        if (parts.length === 2) {
          const lastNumber = parseInt(parts[1], 10);
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
      }
      
      // Format: PREFIX-0001
      const paddedNumber = nextNumber.toString().padStart(4, '0');
      this.code = `${prefix}-${paddedNumber}`;
      
      console.log(`Generated code for ${this.name}: ${this.code}`);
    }
    next();
  } catch (error) {
    console.error('Error in pre-save hook:', error);
    next(error);
  }
});

// Index for better query performance
shippingCompanySchema.index({ name: 1 });
shippingCompanySchema.index({ code: 1 });
shippingCompanySchema.index({ isActive: 1 });
shippingCompanySchema.index({ 'services': 1 });

// Virtual for success rate
shippingCompanySchema.virtual('successRate').get(function() {
  if (this.statistics.totalShipments === 0) return 0;
  return ((this.statistics.successfulDeliveries / this.statistics.totalShipments) * 100).toFixed(2);
});

// Method to activate company
shippingCompanySchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

// Method to deactivate company
shippingCompanySchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Ensure virtual fields are serialized
shippingCompanySchema.set('toJSON', { virtuals: true });
shippingCompanySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ShippingCompany', shippingCompanySchema);
