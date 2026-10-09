import mongoose from 'mongoose';

const attemptQuestionSchema = new mongoose.Schema({
    question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    },
    order: {
        type: Number,
        required: true,
        min: 0
    },
    optionOrder: {
        type: [Number],
        required: true,
        validate: value =>
            Array.isArray(value) &&
            value.length === 4 &&
            new Set(value).size === 4 &&
            value.every(index => Number.isInteger(index) && index >= 0 && index <= 3)
    },
    chosenIndex: {
        type: Number,
        default: null,
        min: 0,
        max: 3
    },
    correct: {
        type: Boolean,
        default: null
    },
    timeMs: {
        type: Number,
        default: 0,
        min: 0
    },
    flagged: {
        type: Boolean,
        default: false
    }
}, {
    _id: false
});

const topicResultSchema = new mongoose.Schema({
    topic: { type: String, required: true },
    correct: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    score: { type: Number, required: true, min: 0, max: 100 }
}, {
    _id: false
});

const testAttemptSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    topics: {
        type: [String],
        required: true
    },
    questions: {
        type: [attemptQuestionSchema],
        required: true
    },
    status: {
        type: String,
        enum: ['in_progress', 'grading', 'submitted', 'expired'],
        default: 'in_progress',
        index: true
    },
    startedAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    durationSeconds: {
        type: Number,
        required: true,
        min: 60,
        max: 3600
    },
    submittedAt: {
        type: Date,
        default: null
    },
    score: {
        type: Number,
        default: null,
        min: 0,
        max: 100
    },
    topicBreakdown: {
        type: [topicResultSchema],
        default: []
    },
    tabSwitchCount: {
        type: Number,
        default: 0,
        min: 0
    },
    xpEarned: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true,
    versionKey: false
});

testAttemptSchema.index({ userId: 1, startedAt: -1 });

const TestAttempt = mongoose.models.TestAttempt ||
    mongoose.model('TestAttempt', testAttemptSchema);

export default TestAttempt;
