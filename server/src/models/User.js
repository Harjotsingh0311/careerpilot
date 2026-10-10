import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    displayName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 254
    },
    college: { type: String, trim: true, maxlength: 120 },
    gradYear: { type: Number, min: 2020, max: 2100 },
    passwordHash: {
        type: String,
        required: true,
        select: false
    },
    xp: { type: Number, min: 0, default: 0 }

}, {
    timestamps: true,
    versionKey: false
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
