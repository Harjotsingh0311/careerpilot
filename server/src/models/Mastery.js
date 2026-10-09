import mongoose from 'mongoose';

const masterySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    topic: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
        default: 0.5
    },
    attempts: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    }
}, {
    timestamps: true,
    versionKey: false
});

masterySchema.index({ userId: 1, topic: 1 }, { unique: true });

const Mastery = mongoose.models.Mastery ||
    mongoose.model('Mastery', masterySchema);

export default Mastery;
