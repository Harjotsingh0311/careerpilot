import mongoose from 'mongoose';

const skillCatalogSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    aliases: { type: [String], default: [] },
    category: { type: String, required: true },
    topic: { type: String, default: null }
}, {
    timestamps: true,
    versionKey: false
});

const SkillCatalog = mongoose.models.SkillCatalog ||
    mongoose.model('SkillCatalog', skillCatalogSchema);

export default SkillCatalog;
