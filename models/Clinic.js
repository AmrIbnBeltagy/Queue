const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
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
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: [true, 'Location is required']
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
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better performance
clinicSchema.index({ arName: 1, enName: 1 });
clinicSchema.index({ location: 1 });
clinicSchema.index({ isActive: 1, isDisabled: 1 });
clinicSchema.index({ code: 1 }, { unique: true, sparse: true });

// Static method to generate next clinic code
clinicSchema.statics.generateNextCode = async function() {
  try {
    // Find all clinics with codes
    const clinicsWithCodes = await this.find({ 
      code: { $exists: true, $ne: null, $ne: '' } 
    })
      .select('code')
      .exec();
    
    if (!clinicsWithCodes || clinicsWithCodes.length === 0) {
      // If no clinic with code exists, start from 1
      return 'C001';
    }
    
    // Extract numbers from all codes and find the maximum
    let maxNumber = 0;
    clinicsWithCodes.forEach(clinic => {
      if (clinic.code) {
        const codeMatch = clinic.code.match(/\d+/);
        if (codeMatch) {
          const number = parseInt(codeMatch[0], 10);
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      }
    });
    
    // Generate next code
    const nextNumber = maxNumber + 1;
    // Format with leading zeros (e.g., "C001", "C010", "C100")
    return `C${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating clinic code:', error);
    // Fallback: use timestamp-based code
    return `C${Date.now().toString().slice(-6)}`;
  }
};

// Pre-save hook to auto-generate code if not provided
clinicSchema.pre('save', async function(next) {
  // Only generate code if it doesn't exist and this is a new document
  if (!this.code && this.isNew) {
    try {
      this.code = await this.constructor.generateNextCode();
    } catch (error) {
      console.error('Error generating code in pre-save hook:', error);
      // Continue even if code generation fails
    }
  }
  next();
});

module.exports = mongoose.model('Clinic', clinicSchema);






