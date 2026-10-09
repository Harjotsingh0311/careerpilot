import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    day: {
        type: String,
        required: true
    },
    xp: {
        type: Number,
        min: 0,
        default: 0
    },
    actions: {
        type: [String],
        default: []
    }
}, {
    timestamps: true,
    versionKey: false
});

activitySchema.index({ userId: 1, day: 1 }, { unique: true });

const Activity = mongoose.models.Activity ||
    mongoose.model('Activity', activitySchema);

export default Activity;
