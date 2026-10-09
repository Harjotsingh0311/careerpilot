import mongoose from 'mongoose';
import Question from '../models/Question.js';
import TestAttempt from '../models/TestAttempt.js';
import Mastery from '../models/Mastery.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { MASTERY_ALPHA } from '../utils/assessmentConstants.js';

export class AssessmentError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = 'AssessmentError';
        this.status = status;
        this.code = code;
    }
}

export function updateMastery(previous, correct, difficulty) {
    const alpha = MASTERY_ALPHA[difficulty];

    if (alpha === undefined) {
        throw new Error('Unsupported difficulty for mastery update.');
    }

    const score = previous + alpha * ((correct ? 1 : 0) - previous);
    return Math.max(0, Math.min(1, score));
}

export function calculateTestScore(correctValues) {
    const totalQuestions = correctValues.length;
    const correctCount = correctValues.filter(Boolean).length;

    return {
        correctCount,
        totalQuestions,
        score: totalQuestions === 0
            ? 0
            : Math.round((correctCount / totalQuestions) * 100)
    };
}

function shuffle(values) {
    const items = [...values];

    for (let index = items.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }

    return items;
}

function chooseQuestions(available, requestedCount) {
    const count = Math.min(requestedCount, available.length);
    const shares = { easy: 0.3, medium: 0.5, hard: 0.2 };

    const quotas = {};
    let allocated = 0;

    for (const difficulty of Object.keys(shares)) {
        quotas[difficulty] = Math.floor(count * shares[difficulty]);
        allocated += quotas[difficulty];
    }

    const remainders = Object.keys(shares)
        .map(difficulty => ({
            difficulty,
            remainder: count * shares[difficulty] - quotas[difficulty]
        }))
        .sort((a, b) => b.remainder - a.remainder);

    for (let index = 0; index < count - allocated; index += 1) {
        quotas[remainders[index].difficulty] += 1;
    }

    const chosen = [];
    const usedIds = new Set();

    for (const difficulty of Object.keys(shares)) {
        const pool = shuffle(
            available.filter(item => item.difficulty === difficulty)
        );

        for (const question of pool.slice(0, quotas[difficulty])) {
            chosen.push(question);
            usedIds.add(question._id.toString());
        }
    }

    if (chosen.length < count) {
        const remaining = shuffle(
            available.filter(item => !usedIds.has(item._id.toString()))
        );

        chosen.push(...remaining.slice(0, count - chosen.length));
    }

    return shuffle(chosen);
}

function attemptIdIsValid(id) {
    return mongoose.isValidObjectId(id);
}

async function makeAttemptPayload(attempt) {
    const ids = attempt.questions.map(item => item.question);
    const questions = await Question.find({ _id: { $in: ids } })
        .select('_id topic subtopic difficulty text options tags')
        .lean();

    const byId = new Map(
        questions.map(question => [question._id.toString(), question])
    );

    return {
        id: attempt._id.toString(),
        topics: attempt.topics,
        status: attempt.status,
        startedAt: attempt.startedAt,
        durationSeconds: attempt.durationSeconds,
        tabSwitchCount: attempt.tabSwitchCount || 0,
        questions: attempt.questions
            .slice()
            .sort((left, right) => left.order - right.order)
            .map(item => {
                const id = item.question.toString();
                const question = byId.get(id);

                if (!question) {
                    throw new AssessmentError(
                        500,
                        'QUESTION_MISSING',
                        'A question in this attempt is no longer available.'
                    );
                }

                return {
                    questionId: id,
                    order: item.order,
                    topic: question.topic,
                    subtopic: question.subtopic,
                    difficulty: question.difficulty,
                    text: question.text,
                    options: item.optionOrder.map(index => question.options[index]),
                    chosenIndex: item.chosenIndex ?? null,
                    timeMs: item.timeMs || 0,
                    flagged: Boolean(item.flagged)
                };
            })
    };
}

async function findOwnedAttempt(userId, id) {
    if (!attemptIdIsValid(id)) {
        throw new AssessmentError(404, 'ATTEMPT_NOT_FOUND', 'Test attempt not found.');
    }

    const attempt = await TestAttempt.findOne({ _id: id, userId });

    if (!attempt) {
        throw new AssessmentError(404, 'ATTEMPT_NOT_FOUND', 'Test attempt not found.');
    }

    return attempt;
}

async function calculateResult(attempt) {
    const questionIds = attempt.questions.map(item => item.question);
    const questions = await Question.find({ _id: { $in: questionIds } })
        .select('_id topic subtopic difficulty text options tags +correctIndex +explanation')
        .lean();

    const questionById = new Map(
        questions.map(question => [question._id.toString(), question])
    );

    const detail = attempt.questions
        .slice()
        .sort((left, right) => left.order - right.order)
        .map(item => {
            const question = questionById.get(item.question.toString());

            if (!question) {
                throw new AssessmentError(
                    500,
                    'QUESTION_MISSING',
                    'A question in this attempt is no longer available.'
                );
            }

            const correctIndex = item.optionOrder.indexOf(question.correctIndex);
            const chosenIndex = item.chosenIndex ?? null;
            const isCorrect = chosenIndex !== null && chosenIndex === correctIndex;

            return {
                questionId: question._id.toString(),
                topic: question.topic,
                subtopic: question.subtopic,
                difficulty: question.difficulty,
                text: question.text,
                options: item.optionOrder.map(index => question.options[index]),
                chosenIndex,
                correctIndex,
                isCorrect,
                correctOption: question.options[question.correctIndex],
                explanation: question.explanation,
                timeMs: item.timeMs || 0,
                flagged: Boolean(item.flagged)
            };
        });

    const summary = calculateTestScore(detail.map(item => item.isCorrect));
    const byTopic = new Map();

    for (const item of detail) {
        if (!byTopic.has(item.topic)) {
            byTopic.set(item.topic, { correct: 0, total: 0 });
        }

        const entry = byTopic.get(item.topic);
        entry.total += 1;
        if (item.isCorrect) entry.correct += 1;
    }

    const topicBreakdown = [...byTopic.entries()].map(([topic, entry]) => ({
        topic,
        correct: entry.correct,
        total: entry.total,
        score: Math.round((entry.correct / entry.total) * 100)
    }));

    return { ...summary, topicBreakdown, questions: detail };
}

async function updateMasteryAndActivity(attempt, result) {
    for (const item of result.questions) {
        const current = await Mastery.findOne({
            userId: attempt.userId,
            topic: item.topic
        }).lean();

        const previous = current?.score ?? 0.5;
        const updated = updateMastery(previous, item.isCorrect, item.difficulty);

        await Mastery.findOneAndUpdate(
            { userId: attempt.userId, topic: item.topic },
            {
                $set: { score: updated },
                $inc: { attempts: 1 }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
                runValidators: true
            }
        );
    }

    const xpEarned = 10 + result.correctCount * 2;
    const day = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata'
    });

    await User.updateOne(
        { _id: attempt.userId },
        { $inc: { xp: xpEarned } }
    );

    await Activity.findOneAndUpdate(
        { userId: attempt.userId, day },
        {
            $inc: { xp: xpEarned },
            $addToSet: { actions: 'assessment_completed' }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return xpEarned;
}

export async function startAssessment(userId, input) {
    const existing = await TestAttempt.findOne({
        userId,
        status: 'in_progress'
    }).sort({ startedAt: -1 });

    if (existing) {
        throw new AssessmentError(
            409,
            'ACTIVE_ATTEMPT_EXISTS',
            'Resume or submit your existing assessment before starting another.'
        );
    }

    const available = await Question.find({
        topic: { $in: input.topics }
    })
        .select('_id topic subtopic difficulty text options tags')
        .lean();

    if (available.length < 3) {
        throw new AssessmentError(
            409,
            'QUESTION_BANK_TOO_SMALL',
            'There are not enough questions for this assessment yet. Seed the question bank first.'
        );
    }

    const selected = chooseQuestions(available, input.questionCount);

    const attempt = await TestAttempt.create({
        userId,
        topics: input.topics,
        status: 'in_progress',
        startedAt: new Date(),
        durationSeconds: input.durationMinutes * 60,
        questions: selected.map((question, order) => ({
            question: question._id,
            order,
            optionOrder: shuffle([0, 1, 2, 3]),
            chosenIndex: null,
            timeMs: 0,
            flagged: false
        }))
    });

    return makeAttemptPayload(attempt);
}

export async function getActiveAssessment(userId) {
    const attempt = await TestAttempt.findOne({
        userId,
        status: 'in_progress'
    }).sort({ startedAt: -1 });

    return attempt ? makeAttemptPayload(attempt) : null;
}

export async function saveAssessmentAnswers(userId, id, input) {
    const attempt = await findOwnedAttempt(userId, id);

    if (attempt.status !== 'in_progress') {
        throw new AssessmentError(
            409,
            'ATTEMPT_NOT_ACTIVE',
            'This assessment is no longer accepting answers.'
        );
    }

    const deadline =
        new Date(attempt.startedAt).getTime() +
        attempt.durationSeconds * 1000 +
        10000;

    if (Date.now() > deadline) {
        attempt.status = 'expired';
        await attempt.save();

        throw new AssessmentError(
            410,
            'ASSESSMENT_TIME_EXPIRED',
            'The time limit has passed. This attempt is now closed.'
        );
    }

    for (const answer of input.answers || []) {
        const item = attempt.questions.find(
            entry => entry.question.toString() === answer.questionId
        );

        if (!item) {
            throw new AssessmentError(
                400,
                'QUESTION_NOT_IN_ATTEMPT',
                'An answer references a question that is not part of this attempt.'
            );
        }

        if (Object.hasOwn(answer, 'chosenIndex')) {
            item.chosenIndex = answer.chosenIndex;
        }

        if (answer.timeMs !== undefined) {
            item.timeMs = answer.timeMs;
        }

        if (answer.flagged !== undefined) {
            item.flagged = answer.flagged;
        }
    }

    if (input.tabSwitchCount !== undefined) {
        attempt.tabSwitchCount = Math.max(
            attempt.tabSwitchCount || 0,
            input.tabSwitchCount
        );
    }

    await attempt.save();
    return makeAttemptPayload(attempt);
}

export async function submitAssessment(userId, id) {
    if (!attemptIdIsValid(id)) {
        throw new AssessmentError(404, 'ATTEMPT_NOT_FOUND', 'Test attempt not found.');
    }

    // Claim the attempt once to prevent concurrent submissions from double-awarding XP.
    const attempt = await TestAttempt.findOneAndUpdate(
        { _id: id, userId, status: 'in_progress' },
        { $set: { status: 'grading' } },
        { new: false }
    );

    if (!attempt) {
        const existing = await findOwnedAttempt(userId, id);

        if (existing.status === 'submitted') {
            const result = await calculateResult(existing);
            return {
                attemptId: existing._id.toString(),
                status: existing.status,
                score: existing.score,
                xpEarned: existing.xpEarned || 0,
                ...result
            };
        }

        throw new AssessmentError(
            409,
            'ATTEMPT_NOT_SUBMITTABLE',
            'This assessment cannot be submitted in its current state.'
        );
    }

    try {
        const result = await calculateResult(attempt);
        const xpEarned = 10 + result.correctCount * 2;

        attempt.status = 'submitted';
        attempt.submittedAt = new Date();
        attempt.score = result.score;
        attempt.topicBreakdown = result.topicBreakdown;
        attempt.xpEarned = xpEarned;

        for (const saved of attempt.questions) {
            const detail = result.questions.find(
                question => question.questionId === saved.question.toString()
            );
            saved.correct = detail?.isCorrect ?? false;
        }

        await attempt.save();
        await updateMasteryAndActivity(attempt, result);

        return {
            attemptId: attempt._id.toString(),
            status: 'submitted',
            xpEarned,
            ...result
        };
    } catch (error) {
        // Restore the attempt to an active state if grading failed before completion.
        await TestAttempt.updateOne(
            { _id: attempt._id, status: 'grading' },
            { $set: { status: 'in_progress' } }
        ).catch(() => {});

        throw error;
    }
}

export async function getAssessmentResult(userId, id) {
    const attempt = await findOwnedAttempt(userId, id);

    if (attempt.status !== 'submitted') {
        throw new AssessmentError(
            409,
            'RESULT_NOT_READY',
            'Submit the assessment before viewing its answers and explanations.'
        );
    }

    return {
        attemptId: attempt._id.toString(),
        status: attempt.status,
        score: attempt.score,
        xpEarned: attempt.xpEarned || 0,
        ...(await calculateResult(attempt))
    };
}

export async function getAssessmentHistory(userId) {
    const attempts = await TestAttempt.find({
        userId,
        status: 'submitted'
    })
        .select('topics startedAt submittedAt durationSeconds score topicBreakdown questions xpEarned')
        .sort({ submittedAt: -1 })
        .limit(20)
        .lean();

    return attempts.map(attempt => ({
        id: attempt._id.toString(),
        topics: attempt.topics,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        durationSeconds: attempt.durationSeconds,
        score: attempt.score,
        questionCount: attempt.questions.length,
        topicBreakdown: attempt.topicBreakdown,
        xpEarned: attempt.xpEarned || 0
    }));
}

export async function getAssessmentMastery(userId) {
    const mastery = await Mastery.find({ userId })
        .select('topic score attempts updatedAt')
        .sort({ topic: 1 })
        .lean();

    return mastery.map(item => ({
        topic: item.topic,
        score: item.score,
        attempts: item.attempts,
        updatedAt: item.updatedAt
    }));
}
