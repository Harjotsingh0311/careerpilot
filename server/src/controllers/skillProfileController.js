import SkillProfile from '../models/SkillProfile.js';

function toPublicProfile(profile) {
    if (!profile) return null;

    return {
        id: profile._id.toString(),
        targetRoles: profile.targetRoles || [],
        skills: (profile.skills || []).map(skill => ({
            id: skill._id.toString(),
            name: skill.name,
            category: skill.category,
            proficiency: skill.proficiency,
            yearsExperience: skill.yearsExperience
        })),
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
    };
}

export async function getSkillProfile(req, res, next) {
    try {
        const profile = await SkillProfile.findOne({
            userId: req.auth.userId
        }).lean();

        return res.status(200).json({
            ok: true,
            data: {
                profile: toPublicProfile(profile)
            }
        });
    } catch (error) {
        next(error);
    }
}

export async function saveSkillProfile(req, res, next) {
    try {
        // Ownership is derived from the verified access token, never the body.
        const profile = await SkillProfile.findOneAndUpdate(
            { userId: req.auth.userId },
            {
                $set: {
                    targetRoles: req.body.targetRoles,
                    skills: req.body.skills
                }
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        return res.status(200).json({
            ok: true,
            data: {
                profile: toPublicProfile(profile)
            }
        });
    } catch (error) {
        next(error);
    }
}
