import mongoose from 'mongoose';

const { Schema } = mongoose;

const metricsSchema = new Schema({
    wpm: { type: Number, required: true, min: 0 },
    longPauses: { type: Number, required: true, min: 0 },
    pauseRatio: { type: Number, required: true, min: 0, max: 1 },
    fillerRatio: { type: Number, required: true, min: 0, max: 1 },
    fillerCount: { type: Number, required: true, min: 0 },
    wordCount: { type: Number, required: true, min: 20 },
    durationSec: { type: Number, required: true, min: 15, max: 90 }
}, { _id: false, versionKey: false });

const scoresSchema = new Schema({
    pace: { type: Number, required: true, min: 0, max: 100 },
    filler: { type: Number, required: true, min: 0, max: 100 },
    pause: { type: Number, required: true, min: 0, max: 100 },
    volume: { type: Number, default: null, min: 0, max: 100 },
    delivery: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false, versionKey: false });

const voiceSessionSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    promptText: {
        type: String,
        maxlength: 1200,
        default: ''
    },
    transcript: {
        type: String,
        required: true,
        maxlength: 20000
    },
    metrics: {
        type: metricsSchema,
        required: true
    },
    scores: {
        type: scoresSchema,
        required: true
    },
    tips: {
        type: [String],
        default: [],
        validate: {
            validator: values => values.length <= 2,
            message: 'At most two coaching tips may be stored.'
        }
    },
    tipsSource: {
        type: String,
        enum: ['ai', 'fallback'],
        default: 'ai'
    }
}, {
    timestamps: true,
    versionKey: false,
    strict: 'throw'
});

voiceSessionSchema.index({ user: 1, createdAt: -1 });

const VoiceSession = mongoose.models.VoiceSession ||
    mongoose.model('VoiceSession', voiceSessionSchema);

export default VoiceSession;
