import RoleProfile from '../models/RoleProfile.js';
import SkillCatalog from '../models/SkillCatalog.js';
import SkillProfile from '../models/SkillProfile.js';
import Mastery from '../models/Mastery.js';

const PROFICIENCY_LEVELS = {
    beginner: 1,
    basic: 2,
    intermediate: 3,
    advanced: 4,
    expert: 5
};

export function normalizeName(value) {
    return String(value ?? '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9+#. ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function toSlug(value) {
    return normalizeName(value)
        .replace(/[+#.]/g, '')
        .replace(/\s+/g, '-');
}

function makeCatalogLookup(catalog) {
    const lookup = new Map();

    for (const item of catalog) {
        lookup.set(normalizeName(item.name), item);

        for (const alias of item.aliases || []) {
            lookup.set(normalizeName(alias), item);
        }
    }

    return lookup;
}

function ratingForSkill(skill) {
    if (!skill) return 0;

    if (Number.isFinite(skill.level)) {
        return Math.max(0, Math.min(5, skill.level)) / 5;
    }

    const level = PROFICIENCY_LEVELS[
        normalizeName(skill.proficiency)
    ];

    return level ? level / 5 : 0;
}

export function calculateRoleMatch(role, userSkills, mastery, catalog) {
    const catalogLookup = makeCatalogLookup(catalog);
    const userRatings = new Map();

    for (const skill of userSkills || []) {
        const canonical = catalogLookup.get(normalizeName(skill.name));
        const key = normalizeName(canonical?.name || skill.name);
        const rating = ratingForSkill(skill);
        const existing = userRatings.get(key) ?? 0;

        // If aliases were entered more than once, retain the stronger self-rating.
        userRatings.set(key, Math.max(existing, rating));
    }

    const masteryByTopic = new Map(
        (mastery || []).map(item => [item.topic, item.score])
    );

    let weightedStrength = 0;
    let totalWeight = 0;

    const skillDetails = (role.skills || []).map(roleSkill => {
        const canonical = catalogLookup.get(normalizeName(roleSkill.name));
        const key = normalizeName(canonical?.name || roleSkill.name);
        const rating = userRatings.get(key) ?? 0;

        // Assessment proof only counts when this catalog skill maps to a
        // topic for which mastery data exists.
        const topic = canonical?.topic || null;
        const proof = topic && masteryByTopic.has(topic)
            ? masteryByTopic.get(topic)
            : null;

        // Blueprint Section 12.3:
        // no proof -> 0.7 * rating
        // with proof -> 0.5 * rating + 0.5 * proof
        const strength = proof === null
            ? 0.7 * rating
            : 0.5 * rating + 0.5 * proof;

        weightedStrength += roleSkill.weight * strength;
        totalWeight += roleSkill.weight;

        return {
            name: roleSkill.name,
            weight: roleSkill.weight,
            tier: roleSkill.tier,
            rating,
            proof,
            strength,
            evidence: proof === null ? 'self-rating only' : 'self-rating + assessment',
            status: strength >= 0.5 ? 'matched' : 'gap'
        };
    });

    const matchPercentage = totalWeight > 0
        ? Math.round(100 * weightedStrength / totalWeight)
        : 0;

    const gaps = skillDetails
        .filter(skill => skill.strength < 0.5)
        .sort((a, b) => {
            if (b.weight !== a.weight) return b.weight - a.weight;
            if (a.tier !== b.tier) return a.tier === 'core' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

    const matchedSkills = skillDetails.filter(skill => skill.strength >= 0.5);

    return {
        slug: role.slug,
        title: role.title,
        description: role.description,
        topics: role.topics || [],
        matchPercentage,
        matchedSkills,
        gaps,
        topGaps: gaps.slice(0, 5),
        skillDetails,
        coreSkillsCount: (role.skills || []).filter(skill => skill.tier === 'core').length
    };
}

export async function getRoleMatchesForUser(userId) {
    const [profile, mastery, catalog, roles] = await Promise.all([
        SkillProfile.findOne({ userId }).lean(),
        Mastery.find({ userId }).select('topic score').lean(),
        SkillCatalog.find({}).select('name aliases category topic').lean(),
        RoleProfile.find({}).lean()
    ]);

    const targetRoles = profile?.targetRoles || [];
    const targetSlugs = new Set(targetRoles.map(toSlug));

    const matches = roles.map(role => ({
        ...calculateRoleMatch(role, profile?.skills || [], mastery, catalog),
        isTargetRole: targetSlugs.has(toSlug(role.slug)) ||
            targetSlugs.has(toSlug(role.title))
    })).sort((a, b) => {
        if (a.isTargetRole !== b.isTargetRole) {
            return a.isTargetRole ? -1 : 1;
        }

        return b.matchPercentage - a.matchPercentage;
    });

    return { targetRoles, matches };
}
