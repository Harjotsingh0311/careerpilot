import mongoose from 'mongoose';
import { TOPICS, DIFFICULTIES } from '../utils/assessmentConstants.js';

const questionSchema = new mongoose.Schema({
    seedKey: {
        type: String,
        unique: true,
        sparse: true,
        select: false
    },
    topic: {
        type: String,
        enum: TOPICS,
        required: true,
        index: true
    },
    subtopic: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    difficulty: {
        type: String,
        enum: DIFFICULTIES,
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1200
    },
    options: {
        type: [String],
        required: true,
        validate: value =>
            Array.isArray(value) &&
            value.length === 4 &&
            value.every(option => typeof option === 'string' && option.length > 0)
    },
    correctIndex: {
        type: Number,
        required: true,
        min: 0,
        max: 3,
        select: false
    },
    explanation: {
        type: String,
        required: true,
        maxlength: 1500,
        select: false
    },
    tags: {
        type: [String],
        default: []
    }
}, {
    timestamps: true,
    versionKey: false
});

questionSchema.index({ topic: 1, difficulty: 1 });

const Question = mongoose.models.Question ||
    mongoose.model('Question', questionSchema);

export default Question;
