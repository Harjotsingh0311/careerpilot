
import mongoose from 'mongoose';

const { Schema } = mongoose;

const evaluationSchema = new Schema({
    score: {
        type: Number,
        min: 0,
        max: 10,
        required: true
    },
    correctness: {
        type: Number,
        min: 0,
        max: 10,
        required: true
    },
    clarity: {
        type: Number,
        min: 0,
        max: 10,
        required: true
    },
    strengths: {
        type: [String],
        default: []
    },
    gaps: {
        type: [String],
        default: []
    },
    tip: {
        type: String,
        maxlength: 300,
        default: ''
    },
    followUp: {
        type: String,
        maxlength: 600,
        default: null
    }
}, {
    _id: false,
    versionKey: false
});

const turnSchema = new Schema({
    idx: {
        type: Number,
        required: true,
        min: 0
    },
    kind: {
        type: String,
        enum: ['jd', 'resume', 'fundamental', 'behavioral', 'followup'],
        required: true
    },
    question: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1200
    },
    // This answer key must never be sent to the frontend.
    expectedPoints: {
        type: [String],
        default: []
    },
    answer: {
        type: String,
        default: null,
        maxlength: 10000
    },
    answerMode: {
        type: String,
        enum: ['text', 'voice'],
        default: 'text'
    },
    evaluation: {
        type: evaluationSchema,
        default: undefined
    },
    hintUsed: {
        type: Boolean,
        default: false
    },
    askedAt: {
        type: Date,
        default: Date.now
    },
    answeredAt: {
        type: Date,
        default: null
    }
}, {
    _id: false,
    versionKey: false
});

const configSchema = new Schema({
    role: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    type: {
        type: String,
        enum: ['technical', 'hr', 'behavioral', 'mixed'],
        required: true
    },
    difficulty: {
        type: String,
        required: true,
        trim: true,
        maxlength: 40
    },
    numQuestions: {
        type: Number,
        required: true,
        min: 5,
        max: 10,
        validate: {
            validator: Number.isInteger,
            message: 'numQuestions must be a whole number.'
        }
    }
}, {
    _id: false,
    versionKey: false
});

const contextSchema = new Schema({
    roleSummary: {
        type: String,
        required: true,
        maxlength: 1000
    },
    mustHave: {
        type: [String],
        default: []
    },
    resumeHighlights: {
        type: [String],
        default: []
    }
}, {
    _id: false,
    versionKey: false
});

const interviewSessionSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    jobDoc: {
        type: Schema.Types.ObjectId,
        ref: 'CareerDocument',
        required: true
    },
    resumeDoc: {
        type: Schema.Types.ObjectId,
        ref: 'CareerDocument',
        default: null
    },
    config: {
        type: configSchema,
        required: true
    },
    context: {
        type: contextSchema,
        required: true
    },
    turns: {
        type: [turnSchema],
        default: []
    },
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'abandoned'],
        default: 'in_progress',
        required: true
    },
    report: {
        type: Schema.Types.Mixed,
        default: undefined
    }
}, {
    timestamps: true,
    versionKey: false
});

// Supports a user's interview history, newest first.
interviewSessionSchema.index({ user: 1, createdAt: -1 });

const InterviewSession = mongoose.models.InterviewSession ||
    mongoose.model('InterviewSession', interviewSessionSchema);

export default InterviewSession;
