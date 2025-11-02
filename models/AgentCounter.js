const mongoose = require('mongoose');

const agentCounterSchema = new mongoose.Schema({
    counterNo: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    description: {
        type: String,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

// Indexes
agentCounterSchema.index({ counterNo: 1 }, { unique: true });
agentCounterSchema.index({ location: 1 });
agentCounterSchema.index({ isActive: 1 });
agentCounterSchema.index({ createdBy: 1 });

// Static methods
agentCounterSchema.statics.findByLocation = function(locationId) {
    return this.find({ location: locationId, isActive: true })
        .populate('location', 'arName enName')
        .populate('createdBy', 'name username')
        .sort({ counterNo: 1 });
};

agentCounterSchema.statics.findActive = function() {
    return this.find({ isActive: true })
        .populate('location', 'arName enName')
        .populate('createdBy', 'name username')
        .sort({ counterNo: 1 });
};

// Instance methods
agentCounterSchema.methods.activate = function(userId = null) {
    this.isActive = true;
    if (userId) this.updatedBy = userId;
    return this.save();
};

agentCounterSchema.methods.deactivate = function(userId = null) {
    this.isActive = false;
    if (userId) this.updatedBy = userId;
    return this.save();
};

module.exports = mongoose.model('AgentCounter', agentCounterSchema);
