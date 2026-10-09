import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    category: {
        type: String,
        enum: [
            'Programming',
            'AI/ML',
            'Data',
            'Web Development',
            'Tools',
            'Soft Skills',
            'Other'
        ],
        default: 'Other'
    },
    proficiency: {
        type: String,
        enum: ['Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'],
        default: 'Beginner'
    },
    yearsExperience: {
        type: Number,
        min: 0,
        max: 50,
        default: 0
    }
});

const skillProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    targetRoles: {
        type: [{
            type: String,
            trim: true,
            maxlength: 100
        }],
        default: []
    },
    skills: {
        type: [skillSchema],
        default: []
    }
}, {
    timestamps: true,
    versionKey: false
});

const SkillProfile = mongoose.models.SkillProfile ||
    mongoose.model('SkillProfile', skillProfileSchema);

export default SkillProfile;
