import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    tokenHash: {
        type: String,
        required: true,
        unique: true,
        select: false
    },
    expiresAt: {
        type: Date,
        required: true
    },
    revokedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    versionKey: false
});

const RefreshToken = mongoose.models.RefreshToken ||
    mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;
