const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    uppercase: true,
    sparse: true  // Allow null/undefined for auto-generation
  },
  customer: {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Customer name cannot be more than 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true,
    }
  },
  shippingAddress: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true
    }
  },
  items: [{
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [0, 'Weight cannot be negative']
    }
  }],
  shippingMethod: {
    type: String,
    required: [true, 'Shipping method is required'],
    enum: ['standard', 'express', 'overnight', 'international'],
    default: 'standard'
  },
  platform: {
    type: String,
    enum: ['Website', 'Mobile App', 'Phone', 'Email', 'In-Store'],
    default: 'Website',
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'processing', 'Processing', 'Ready To Delivery', 'shipped', 'delivered', 'cancelled', 'Cancelled', 'returned', 'On Hold'],
    default: 'pending'
  },
  trackingNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  shippingCost: {
    type: Number,
    required: [true, 'Shipping cost is required'],
    min: [0, 'Shipping cost cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  callResult: {
    type: String,
    trim: true,
    enum: ['Confirmed', 'No Answer', 'Wrong Number', 'Callback Requested', 'Cancelled by Customer', 'Pending', 'On Hold', 'Refund Initiated', 'Refunded']
  },
  agent: {
    type: String,
    trim: true,
    maxlength: [100, 'Agent name cannot be more than 100 characters']
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedPreparation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  callHistory: [{
    callResult: {
      type: String,
      enum: ['Confirmed', 'No Answer', 'Wrong Number', 'Callback Requested', 'Cancelled by Customer', 'Pending', 'On Hold', 'Refund Initiated', 'Refunded']
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot be more than 500 characters']
    },
    calledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    calledByName: String,
    calledAt: {
      type: Date,
      default: Date.now
    }
  }],
  deliveryEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryEmployee',
    default: null
  },
  shippingCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShippingCompany',
    default: null
  },
  estimatedDelivery: {
    type: Date
  },
  actualDelivery: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  timeline: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastCallingTime: {
      type: Date,
      default: null
    },
    readyForDeliveryAt: {
      type: Date,
      default: null
    },
    assignedToDeliveryAt: {
      type: Date,
      default: null
    },
    shippedAt: {
      type: Date,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Generate tracking number when status changes to 'shipped'
orderSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'shipped' && !this.trackingNumber) {
    this.trackingNumber = `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

// Indexes for better query performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ trackingNumber: 1 });
orderSchema.index({ agent: 1 });
orderSchema.index({ callResult: 1 });
orderSchema.index({ platform: 1 });
orderSchema.index({ createdAt: -1 });

// Virtual for total items
orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for total weight
orderSchema.virtual('totalWeight').get(function() {
  return this.items.reduce((total, item) => total + (item.weight * item.quantity), 0);
});

// Index for better query performance
orderSchema.index({ assignedAgent: 1 });
orderSchema.index({ assignedPreparation: 1 });

// Ensure virtual fields are serialized
orderSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);

