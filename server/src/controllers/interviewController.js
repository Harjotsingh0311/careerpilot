import { z } from 'zod';
import { validateBody } from '../middleware/validateBody.js';
import {
    InterviewServiceError,
    createInterviewSession,
    listInterviewSessions,
    getInterviewSession,
    submitInterviewAnswer,
    requestInterviewHint,
    finishInterviewSession
} from '../services/interviewService.js';
import { submitAnswerSchema } from '../utils/interviewAnswerSchemas.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i);

const createInterviewSchema = z.object({
    jdId: objectId,
    resumeId: objectId.nullable().optional(),
    role: z.string().trim().min(2).max(120),
    type: z.enum(['technical', 'hr', 'behavioral', 'mixed']),
    difficulty: z.string().trim().min(1).max(40),
    numQuestions: z.number().int().min(5).max(10)
}).strict();

export const validateCreateInterview = validateBody(createInterviewSchema);
export const validateInterviewAnswer = validateBody(submitAnswerSchema);

function handleError(error, res, next) {
    if (error instanceof InterviewServiceError ||
        (Number.isInteger(error?.status) && error?.code)) {
        return res.status(error.status).json({
            ok: false,
            error: {
                code: error.code,
                message: error.message
            }
        });
    }

    return next(error);
}

export async function createInterview(req, res, next) {
    try {
        const data = await createInterviewSession({
            ...req.body,
            userId: req.auth.userId
        });

        return res.status(201).json({ ok: true, data });
    } catch (error) {
        return handleError(error, res, next);
    }
}

export async function listInterviews(req, res, next) {
    try {
        const data = await listInterviewSessions(req.auth.userId);
        return res.status(200).json({ ok: true, data });
    } catch (error) {
        return handleError(error, res, next);
    }
}

export async function getInterview(req, res, next) {
    try {
        const data = await getInterviewSession({
            userId: req.auth.userId,
            interviewId: req.params.id
        });

        return res.status(200).json({ ok: true, data });
    } catch (error) {
        return handleError(error, res, next);
    }
}

export async function answerInterview(req, res, next) {
    try {
        const data = await submitInterviewAnswer({
            userId: req.auth.userId,
            interviewId: req.params.id,
            answer: req.body.answer,
            mode: req.body.mode
        });

        return res.status(200).json({ ok: true, data });
    } catch (error) {
        return handleError(error, res, next);
    }
}

export async function hintInterview(req, res, next) {
    try {
        const data = await requestInterviewHint({
            userId: req.auth.userId,
            interviewId: req.params.id
        });

        return res.status(200).json({ ok: true, data });
    } catch (error) {
        return handleError(error, res, next);
    }
}

export async function finishInterview(req, res, next) {
    try {
        const data = await finishInterviewSession({
            userId: req.auth.userId,
            interviewId: req.params.id
        });

        return res.status(200).json({ ok: true, data });
    } catch (error) {
        return handleError(error, res, next);
    }
}
