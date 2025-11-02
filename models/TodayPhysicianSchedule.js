const mongoose = require('mongoose');

const todayPhysicianScheduleSchema = new mongoose.Schema({
    scheduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PhysicianSchedule',
        required: false
    },
    physicianId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    physicianName: {
        type: String,
        required: true
    },
    speciality: {
        type: String,
        required: true
    },
    degree: {
        type: String,
        required: true
    },
    clinicTimeFrom: {
        type: String,
        required: true
    },
    clinicTimeTo: {
        type: String,
        required: true
    },
    day: {
        type: String,
        required: true,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    date: {
        type: Date,
        required: true
    },
    clinicName: {
        type: String,
        required: true
    },
    clinicCode: {
        type: String,
        required: false,
        trim: true
    },
    location: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for efficient queries
todayPhysicianScheduleSchema.index({ physicianId: 1, date: 1 });
todayPhysicianScheduleSchema.index({ date: 1 });
todayPhysicianScheduleSchema.index({ isActive: 1 });
todayPhysicianScheduleSchema.index({ scheduleId: 1 });
todayPhysicianScheduleSchema.index({ clinicCode: 1 });
todayPhysicianScheduleSchema.index({ clinicName: 1, date: 1 });

module.exports = mongoose.model('TodayPhysicianSchedule', todayPhysicianScheduleSchema);
