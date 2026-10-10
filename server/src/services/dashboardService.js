import Activity from '../models/Activity.js';
import Mastery from '../models/Mastery.js';
import SkillProfile from '../models/SkillProfile.js';
import TestAttempt from '../models/TestAttempt.js';
import User from '../models/User.js';
import { getRoleMatchesForUser } from './roleMatchService.js';
import {
    calculateReadiness,
    computeStreak,
    getIndiaDayKey,
    READINESS_WEIGHTS,
    shiftDayKey
} from './readinessService.js';

function getComponents(mastery, activities, roleData) {
    const targetMatch = roleData.matches
        .filter(match => match.isTargetRole)
        .sort((a, b) => b.matchPercentage - a.matchPercentage)[0] || null;

    // Blueprint Section 12.4: technical readiness is the mean mastery
    // over topics for the user's target role, not every assessed topic.
    const roleTopics = new Set(targetMatch?.topics || []);
    const relevantMastery = mastery.filter(item => roleTopics.has(item.topic));

    const technicalScore = relevantMastery.length
        ? Math.round(
            relevantMastery.reduce((sum, item) => sum + item.score, 0) /
            relevantMastery.length * 100
        )
        : null;

    const consistencyScore = activities.length
        ? Math.min(100, Math.round(activities.length / 10 * 100))
        : null;

    return {
        targetMatch,
        readiness: calculateReadiness([
            {
                key: 'technical',
                label: 'Technical mastery',
                weight: READINESS_WEIGHTS.technical,
                score: technicalScore,
                description: technicalScore === null
                    ? 'Complete assessments for the topics mapped to your target role.'
                    : 'Mean topic mastery for your selected target role.'
            },
            {
                key: 'interview',
                label: 'Interview performance',
                weight: READINESS_WEIGHTS.interview,
                score: null,
                description: 'Available after interview sessions are implemented and scored.'
            },
            {
                key: 'roleFit',
                label: 'Role fit',
                weight: READINESS_WEIGHTS.roleFit,
                score: targetMatch ? targetMatch.matchPercentage : null,
                description: targetMatch
                    ? 'Weighted match based on skills and available assessment evidence.'
                    : 'Choose one of the seeded roles to measure role fit.'
            },
            {
                key: 'delivery',
                label: 'Delivery',
                weight: READINESS_WEIGHTS.delivery,
                score: null,
                description: 'Available after voice analysis is implemented and used.'
            },
            {
                key: 'consistency',
                label: 'Consistency',
                weight: READINESS_WEIGHTS.consistency,
                score: consistencyScore,
                description: 'Active days in the last 14 days divided by 10, capped at 100.'
            }
        ])
    };
}

export async function getDashboardSummary(userId) {
    const today = getIndiaDayKey();
    const firstDay = shiftDayKey(today, -13);

    const [user, profile, mastery, activities, latestAttempts, roleData] = await Promise.all([
        User.findById(userId).select('displayName xp').lean(),

        SkillProfile.findOne({ userId })
            .select('targetRoles skills updatedAt')
            .lean(),

        Mastery.find({ userId })
            .select('topic score attempts updatedAt')
            .sort({ score: 1 })
            .lean(),

        Activity.find({
            userId,
            day: { $gte: firstDay, $lte: today }
        })
            .select('day xp actions')
            .sort({ day: -1 })
            .lean(),

        TestAttempt.find({ userId, status: 'submitted' })
            .select('topics submittedAt score questions xpEarned')
            .sort({ submittedAt: -1 })
            .limit(5)
            .lean(),

        getRoleMatchesForUser(userId)
    ]);

    const { readiness, targetMatch } = getComponents(mastery, activities, roleData);
    const activeDays = activities.map(item => item.day);
    const totalXP = user?.xp ?? 0;

    let nextAction;

    if (mastery.length === 0) {
        nextAction = {
            title: 'Take your first assessment',
            description: 'Establish a baseline for the topics relevant to your career goals.',
            path: '/assessments'
        };
    } else if (!targetMatch) {
        nextAction = {
            title: 'Choose a target career role',
            description: 'Compare your current skills against seeded role profiles.',
            path: '/roles'
        };
    } else if (targetMatch.topGaps.length > 0) {
        const topGap = targetMatch.topGaps[0];

        nextAction = {
            title: `Build your ${topGap.name} skill`,
            description: `${topGap.name} is one of the highest-weight gaps for ${targetMatch.title}. Its current evidence strength is ${Math.round(topGap.strength * 100)}%.`,
            path: '/skills'
        };
    } else {
        const topicScore = mastery
            .filter(item => targetMatch.topics.includes(item.topic))
            .sort((a, b) => a.score - b.score)[0];

        nextAction = topicScore
            ? {
                title: `Practise ${topicScore.topic.toUpperCase()}`,
                description: 'Improve the lowest measured topic mapped to your target role.',
                path: '/assessments'
            }
            : {
                title: 'Assess your target role topics',
                description: 'Take a test to gather evidence for your selected career role.',
                path: '/assessments'
            };
    }

    return {
        displayName: user?.displayName ?? null,
        xp: totalXP,
        targetRoles: profile?.targetRoles ?? [],
        readiness,
        activeDays: activeDays.length,
        streak: computeStreak(activeDays, today),
        mastery: mastery.map(item => ({
            topic: item.topic,
            score: item.score,
            attempts: item.attempts,
            updatedAt: item.updatedAt
        })),
        roleMatches: roleData.matches.slice(0, 5).map(match => ({
            slug: match.slug,
            title: match.title,
            matchPercentage: match.matchPercentage,
            isTargetRole: match.isTargetRole
        })),
        nextAction,
        recentAttempts: latestAttempts.map(attempt => ({
            id: attempt._id.toString(),
            topics: attempt.topics,
            submittedAt: attempt.submittedAt,
            score: attempt.score,
            questionCount: attempt.questions.length,
            xpEarned: attempt.xpEarned || 0
        }))
    };
}

export async function getDashboardTrends(userId, requestedDays = 14) {
    const days = Math.max(7, Math.min(84, requestedDays));
    const today = getIndiaDayKey();
    const firstDay = shiftDayKey(today, -(days - 1));

    const [activities, attempts] = await Promise.all([
        Activity.find({
            userId,
            day: { $gte: firstDay, $lte: today }
        })
            .select('day xp')
            .lean(),

        TestAttempt.find({
            userId,
            status: 'submitted',
            submittedAt: {
                $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            }
        })
            .select('score submittedAt')
            .lean()
    ]);

    const xpByDay = new Map(activities.map(item => [item.day, item.xp]));
    const scoresByDay = new Map();

    for (const attempt of attempts) {
        const day = getIndiaDayKey(attempt.submittedAt);
        const existing = scoresByDay.get(day) || { total: 0, count: 0 };
        existing.total += attempt.score ?? 0;
        existing.count += 1;
        scoresByDay.set(day, existing);
    }

    const trends = [];

    for (let offset = -(days - 1); offset <= 0; offset += 1) {
        const day = shiftDayKey(today, offset);
        const group = scoresByDay.get(day);

        trends.push({
            day,
            label: day.slice(5),
            xp: xpByDay.get(day) ?? 0,
            attempts: group?.count ?? 0,
            averageScore: group
                ? Math.round(group.total / group.count)
                : null
        });
    }

    return { days, trends };
}
