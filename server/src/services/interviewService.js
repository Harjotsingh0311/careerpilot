
import { z } from 'zod';
import CareerDocument from '../models/Document.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { getIndiaDayKey } from './readinessService.js';
import InterviewSession from '../models/InterviewSession.js';
import { askJSON } from './groqService.js';
import {
    buildQuestionPlanSystemPrompt,
    buildQuestionPlanUserPrompt
} from '../prompts/interviewPrompts.js';
import { createQuestionPlanSchema } from '../utils/interviewSchemas.js';
import {
    answerEvaluationSchema,
    submitAnswerSchema
} from '../utils/interviewAnswerSchemas.js';
import {
    buildAnswerEvaluationSystemPrompt,
    buildAnswerEvaluationUserPrompt
} from '../prompts/interviewAnswerPrompts.js';
import {
    buildInterviewReportSystemPrompt,
    buildInterviewReportUserPrompt
} from '../prompts/interviewReportPrompts.js';
import { interviewReportNarrativeSchema } from '../utils/interviewReportSchemas.js';
import { calculateInterviewMetrics, collectInterviewFeedback } from './interviewReportMetrics.js';

export class InterviewServiceError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = 'InterviewServiceError';
        this.status = status;
        this.code = code;
    }
}

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

const createInputSchema = z.object({
    userId: objectIdSchema,
    jdId: objectIdSchema,
    resumeId: objectIdSchema.nullable().optional(),
    role: z.string().trim().min(2).max(120),
    type: z.enum(['technical', 'hr', 'behavioral', 'mixed']),
    difficulty: z.string().trim().min(1).max(40),
    numQuestions: z.number().int().min(5).max(10)
}).strict();

function uniqueStrings(values, limit, maxLength = 160) {
    const output = [];
    const seen = new Set();

    for (const value of values) {
        if (typeof value !== 'string') continue;

        const cleaned = value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
        const key = cleaned.toLowerCase();

        if (!cleaned || seen.has(key)) continue;

        seen.add(key);
        output.push(cleaned);

        if (output.length >= limit) break;
    }

    return output;
}

function buildCompactContext(jobDoc, resumeDoc, role) {
    const jd = jobDoc.parsed || {};
    const resume = resumeDoc?.parsed || {};

    const responsibilities = Array.isArray(jd.responsibilities)
        ? jd.responsibilities
        : [];

    const roleSummarySource = [
        jd.roleTitle || role,
        ...responsibilities.slice(0, 3)
    ].join('. ');

    // Keep the summary under 60 words as specified in the blueprint.
    const roleSummary = roleSummarySource
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 59)
        .join(' ');

    const mustHave = uniqueStrings([
        ...(Array.isArray(jd.mustHave) ? jd.mustHave : []),
        ...(Array.isArray(jobDoc.extractedSkills)
            ? jobDoc.extractedSkills
            : [])
    ], 10, 80);

    const resumeHighlights = uniqueStrings([
        ...(Array.isArray(resume.highlights) ? resume.highlights : []),
        ...(Array.isArray(resume.skills) ? resume.skills : []),
        ...(Array.isArray(resumeDoc?.extractedSkills)
            ? resumeDoc.extractedSkills
            : [])
    ], 5);

    return {
        roleSummary: roleSummary || role,
        mustHave,
        resumeHighlights
    };
}

function publicQuestion(turn) {
    if (!turn) return null;

    // Never expose expectedPoints, which are the private grading answer key.
    return {
        idx: turn.idx,
        kind: turn.kind,
        question: turn.question
    };
}

export async function createInterviewSession(input) {
    const validation = createInputSchema.safeParse(input);

    if (!validation.success) {
        throw new InterviewServiceError(
            400,
            'INVALID_INTERVIEW_CONFIG',
            'Check the role, document IDs, interview type, difficulty, and question count.'
        );
    }

    const config = {
        role: validation.data.role,
        type: validation.data.type,
        difficulty: validation.data.difficulty,
        numQuestions: validation.data.numQuestions
    };

    const { userId, jdId, resumeId } = validation.data;

    // Only load documents owned by this user and of the correct type.
    // Do not load or send the raw document text to the AI.
    const jobDoc = await CareerDocument.findOne({
        _id: jdId,
        userId,
        kind: 'jd'
    }).select('kind name extractedSkills parsed');

    if (!jobDoc) {
        throw new InterviewServiceError(
            404,
            'JD_NOT_FOUND',
            'The selected job description was not found. Select one of your saved job descriptions.'
        );
    }

    let resumeDoc = null;

    if (resumeId) {
        resumeDoc = await CareerDocument.findOne({
            _id: resumeId,
            userId,
            kind: 'resume'
        }).select('kind name extractedSkills parsed');

        if (!resumeDoc) {
            throw new InterviewServiceError(
                404,
                'RESUME_NOT_FOUND',
                'The selected resume was not found. Select one of your saved resumes or continue without one.'
            );
        }
    }

    const context = buildCompactContext(jobDoc, resumeDoc, config.role);

    const system = buildQuestionPlanSystemPrompt({
        type: config.type,
        difficulty: config.difficulty,
        numQuestions: config.numQuestions
    });

    const user = buildQuestionPlanUserPrompt({
        role: config.role,
        roleSummary: context.roleSummary,
        mustHave: context.mustHave,
        resumeHighlights: context.resumeHighlights
    });

    // One planning call. askJSON already applies the user's daily AI quota.
    const response = await askJSON({
        userId,
        system,
        user,
        schema: createQuestionPlanSchema(config.numQuestions),
        maxTokens: 2400
    });

    const session = await InterviewSession.create({
        user: userId,
        jobDoc: jobDoc._id,
        resumeDoc: resumeDoc?._id || null,
        config,
        context,
        turns: response.data.questions.map((question, idx) => ({
            idx,
            kind: question.kind,
            question: question.question,
            expectedPoints: question.expectedPoints
        })),
        status: 'in_progress'
    });

    return {
        id: session._id.toString(),
        status: session.status,
        config: session.config.toObject
            ? session.config.toObject()
            : session.config,
        progress: {
            answered: 0,
            total: session.turns.length
        },
        question: publicQuestion(session.turns[0]),
        createdAt: session.createdAt
    };
}


// Return evaluation feedback without the private follow-up planning field.
function publicEvaluation(evaluation) {
    if (!evaluation) return null;

    return {
        score: evaluation.score,
        correctness: evaluation.correctness,
        clarity: evaluation.clarity,
        strengths: evaluation.strengths || [],
        gaps: evaluation.gaps || [],
        tip: evaluation.tip || ''
    };
}

function publicTurnDetails(turn) {
    return {
        idx: turn.idx,
        kind: turn.kind,
        question: turn.question,
        answer: turn.answer ?? null,
        answerMode: turn.answerMode || 'text',
        evaluation: publicEvaluation(turn.evaluation),
        hintUsed: Boolean(turn.hintUsed),
        askedAt: turn.askedAt,
        answeredAt: turn.answeredAt ?? null
    };
}

function validateInterviewId(interviewId) {
    if (!objectIdSchema.safeParse(interviewId).success) {
        throw new InterviewServiceError(
            400,
            'INVALID_INTERVIEW_ID',
            'The interview ID is invalid.'
        );
    }
}

function sessionProgress(session) {
    const turns = session.turns || [];
    return {
        answered: turns.filter(turn =>
            typeof turn.answer === 'string' && turn.answer.trim().length > 0
        ).length,
        total: turns.length
    };
}

export async function listInterviewSessions(userId) {
    const sessions = await InterviewSession.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(50);

    return sessions.map(session => ({
        id: session._id.toString(),
        role: session.config.role,
        type: session.config.type,
        difficulty: session.config.difficulty,
        status: session.status,
        progress: sessionProgress(session),
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
    }));
}

export async function getInterviewSession({ userId, interviewId }) {
    validateInterviewId(interviewId);

    const session = await InterviewSession.findOne({
        _id: interviewId,
        user: userId
    });

    if (!session) {
        throw new InterviewServiceError(
            404,
            'INTERVIEW_NOT_FOUND',
            'Interview session not found.'
        );
    }

    return {
        id: session._id.toString(),
        status: session.status,
        config: session.config,
        progress: sessionProgress(session),
        turns: (session.turns || []).map(publicTurnDetails),
        report: session.report || null,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
    };
}

export async function submitInterviewAnswer({
    userId,
    interviewId,
    answer,
    mode
}) {
    validateInterviewId(interviewId);

    const validation = submitAnswerSchema.safeParse({ answer, mode });

    if (!validation.success) {
        throw new InterviewServiceError(
            400,
            'INVALID_INTERVIEW_ANSWER',
            'Enter a non-empty answer of at most 10,000 characters.'
        );
    }

    const session = await InterviewSession.findOne({
        _id: interviewId,
        user: userId
    });

    if (!session) {
        throw new InterviewServiceError(
            404,
            'INTERVIEW_NOT_FOUND',
            'Interview session not found.'
        );
    }

    if (session.status !== 'in_progress') {
        throw new InterviewServiceError(
            409,
            'INTERVIEW_NOT_IN_PROGRESS',
            'This interview is no longer accepting answers.'
        );
    }

    const turnIndex = session.turns.findIndex(turn =>
        typeof turn.answer !== 'string' || !turn.answer.trim()
    );

    if (turnIndex < 0) {
        throw new InterviewServiceError(
            409,
            'NO_QUESTION_PENDING',
            'There are no unanswered questions. Finish the interview to view your report.'
        );
    }

    const turn = session.turns[turnIndex];

    const response = await askJSON({
        userId,
        system: buildAnswerEvaluationSystemPrompt(),
        user: buildAnswerEvaluationUserPrompt({
            roleSummary: session.context.roleSummary,
            question: turn.question,
            expectedPoints: turn.expectedPoints,
            answer: validation.data.answer
        }),
        schema: answerEvaluationSchema,
        maxTokens: 450
    });

    const evaluation = { ...response.data };

    // A hint can reduce the score, but cannot increase it.
    if (turn.hintUsed) {
        evaluation.score = Math.min(evaluation.score, 8);
    }

    turn.answer = validation.data.answer;
    turn.answerMode = validation.data.mode;
    turn.evaluation = evaluation;
    turn.answeredAt = new Date();

    const followUpsUsed = session.turns.filter(
        item => item.kind === 'followup'
    ).length;

    const maximumTurns = session.config.numQuestions + 2;
    const followUpQuestion = evaluation.followUp;

    if (
        evaluation.score <= 4 &&
        typeof followUpQuestion === 'string' &&
        followUpQuestion.trim() &&
        followUpsUsed < 2 &&
        session.turns.length < maximumTurns
    ) {
        session.turns.splice(turnIndex + 1, 0, {
            idx: turnIndex + 1,
            kind: 'followup',
            question: followUpQuestion.trim(),
            expectedPoints: turn.evaluation.gaps?.length
                ? turn.evaluation.gaps
                : turn.expectedPoints.slice(0, 5),
            answer: null,
            answerMode: 'text',
            hintUsed: false,
            askedAt: new Date()
        });
    }

    // Keep turn indices ordered after inserting a follow-up.
    session.turns.forEach((item, index) => {
        item.idx = index;
    });

    await session.save();

    const nextTurn = session.turns.find(item =>
        typeof item.answer !== 'string' || !item.answer.trim()
    );

    return {
        id: session._id.toString(),
        evaluation: publicEvaluation(turn.evaluation),
        progress: sessionProgress(session),
        nextQuestion: nextTurn ? {
            idx: nextTurn.idx,
            kind: nextTurn.kind,
            question: nextTurn.question
        } : null
    };
}

// Produce a hint from one expected point without returning the full answer key.
function hintForTurn(turn) {
    const clue = turn.expectedPoints?.[0];

    return clue
        ? `Consider addressing: ${clue}. Then explain your reasoning in your own words.`
        : 'Start with the core concept, explain your approach, and add an example.';
}

export async function requestInterviewHint({ userId, interviewId }) {
    validateInterviewId(interviewId);

    const session = await InterviewSession.findOne({
        _id: interviewId,
        user: userId
    });

    if (!session) {
        throw new InterviewServiceError(
            404,
            'INTERVIEW_NOT_FOUND',
            'Interview session not found.'
        );
    }

    if (session.status !== 'in_progress') {
        throw new InterviewServiceError(
            409,
            'INTERVIEW_NOT_IN_PROGRESS',
            'This interview is no longer active.'
        );
    }

    const turn = session.turns.find(item =>
        typeof item.answer !== 'string' || !item.answer.trim()
    );

    if (!turn) {
        throw new InterviewServiceError(
            409,
            'NO_QUESTION_PENDING',
            'There are no unanswered questions.'
        );
    }

    // A repeated hint on the same question does not charge XP again.
    if (turn.hintUsed) {
        return {
            hint: hintForTurn(turn),
            xpCharged: 0,
            hintUsed: true
        };
    }

    const updatedUser = await User.findOneAndUpdate(
        {
            _id: userId,
            xp: { $gte: 5 }
        },
        { $inc: { xp: -5 } },
        { new: true }
    );

    if (!updatedUser) {
        throw new InterviewServiceError(
            409,
            'INSUFFICIENT_XP',
            'You need at least 5 XP to use a hint.'
        );
    }

    const day = getIndiaDayKey();
    await Activity.findOneAndUpdate(
        { userId, day },
        {
            $addToSet: {
                actions: `interview_hint_used:${session._id}:${turn.idx}`
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    turn.hintUsed = true;
    await session.save();

    return {
        hint: hintForTurn(turn),
        xpCharged: 5,
        xpRemaining: updatedUser.xp,
        hintUsed: true
    };
}

async function awardInterviewXpIfNeeded(userId, interviewId, xpAwarded) {
    const day = getIndiaDayKey();
    const action = `interview_completed:${interviewId}`;

    // The action marker prevents ordinary repeat finish requests from paying twice.
    let activity;

    try {
        activity = await Activity.findOneAndUpdate(
            {
                userId,
                day,
                actions: { $ne: action }
            },
            {
                $inc: { xp: xpAwarded },
                $addToSet: { actions: action }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        if (error?.code === 11000) return;
        throw error;
    }

    if (activity) {
        await User.updateOne(
            { _id: userId },
            { $inc: { xp: xpAwarded } }
        );
    }
}

export async function finishInterviewSession({ userId, interviewId }) {
    validateInterviewId(interviewId);

    const session = await InterviewSession.findOne({
        _id: interviewId,
        user: userId
    });

    if (!session) {
        throw new InterviewServiceError(
            404,
            'INTERVIEW_NOT_FOUND',
            'Interview session not found.'
        );
    }

    if (session.status === 'completed' && session.report) {
        await awardInterviewXpIfNeeded(
            userId,
            session._id,
            session.report.xpAwarded || 0
        );

        return {
            id: session._id.toString(),
            status: session.status,
            report: session.report
        };
    }

    if (session.status !== 'in_progress') {
        throw new InterviewServiceError(
            409,
            'INTERVIEW_NOT_IN_PROGRESS',
            'This interview cannot be finished.'
        );
    }

    const turns = session.turns || [];
    const allAnswered = turns.every(turn =>
        typeof turn.answer === 'string' &&
        turn.answer.trim().length > 0 &&
        Boolean(turn.evaluation)
    );

    if (!turns.length || !allAnswered) {
        throw new InterviewServiceError(
            409,
            'INTERVIEW_INCOMPLETE',
            'Answer all interview questions before requesting the final report.'
        );
    }

    const metrics = calculateInterviewMetrics(session);
    const feedback = collectInterviewFeedback(session);

    const narrative = await askJSON({
        userId,
        system: buildInterviewReportSystemPrompt(),
        user: buildInterviewReportUserPrompt({
            metrics,
            strengths: feedback.strengths,
            gaps: feedback.gaps
        }),
        schema: interviewReportNarrativeSchema,
        maxTokens: 700
    });

    const xpAwarded = 40 + Math.round(metrics.overallScore);

    session.report = {
        ...metrics,
        ...narrative.data,
        xpAwarded
    };
    session.status = 'completed';
    await session.save();

    // If a request retries after the report is saved, the action marker avoids
    // awarding the same completion XP again during normal repeat requests.
    await awardInterviewXpIfNeeded(userId, session._id, xpAwarded);

    return {
        id: session._id.toString(),
        status: session.status,
        report: session.report
    };
}
