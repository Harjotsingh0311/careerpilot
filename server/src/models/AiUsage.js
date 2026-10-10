import mongoose from 'mongoose';

const aiUsageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    day: {
        type: String,
        required: true
    },
    calls: {
        type: Number,
        min: 0,
        default: 0
    },
    promptTokens: {
        type: Number,
        min: 0,
        default: 0
    },
    completionTokens: {
        type: Number,
        min: 0,
        default: 0
    }
}, {
    timestamps: true,
    versionKey: false
});

aiUsageSchema.index({ userId: 1, day: 1 }, { unique: true });

const AiUsage = mongoose.models.AiUsage ||
    mongoose.model('AiUsage', aiUsageSchema);

export default AiUsage;
