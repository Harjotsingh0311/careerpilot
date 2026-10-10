import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    kind: {
        type: String,
        enum: ['resume', 'jd', 'notes'],
        required: true
    },
    name: {
        type: String,
        required: true,
        maxlength: 180
    },
    text: {
        type: String,
        required: true,
        maxlength: 20000,
        select: false
    },
    textHash: {
        type: String,
        required: true
    },
    extractedSkills: {
        type: [String],
        default: []
    },
    parsed: {
        type: mongoose.Schema.Types.Mixed,
        default: () => ({})
    },
    parsingMode: {
        type: String,
        enum: ['ai', 'deterministic_fallback'],
        required: true
    },
    aiWarning: {
        type: String,
        default: ''
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
}, {
    timestamps: true,
    versionKey: false
});

// Cache per user, document kind and cleaned-text hash.
documentSchema.index(
    { userId: 1, kind: 1, textHash: 1 },
    { unique: true }
);

// MongoDB automatically deletes expired documents after the TTL monitor runs.
documentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const CareerDocument = mongoose.models.CareerDocument ||
    mongoose.model('CareerDocument', documentSchema);

export default CareerDocument;
