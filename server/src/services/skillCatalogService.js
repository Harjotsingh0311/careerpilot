import SkillCatalog from '../models/SkillCatalog.js';

export async function listSkillCatalog() {
    return SkillCatalog.find({})
        .select('name aliases category topic')
        .sort({ category: 1, name: 1 })
        .lean();
}
