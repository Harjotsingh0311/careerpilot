import mongoose from 'mongoose';

const roleSkillSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 1, max: 5 },
    tier: { type: String, enum: ['core', 'plus'], required: true }
}, { _id: false });

const roleProfileSchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    skills: { type: [roleSkillSchema], required: true },
    topics: { type: [String], default: [] }
}, {
    timestamps: true,
    versionKey: false
});

const RoleProfile = mongoose.models.RoleProfile ||
    mongoose.model('RoleProfile', roleProfileSchema);

export default RoleProfile;
