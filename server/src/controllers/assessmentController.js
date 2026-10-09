import {
    AssessmentError,
    getActiveAssessment,
    getAssessmentHistory,
    getAssessmentMastery,
    getAssessmentResult,
    saveAssessmentAnswers,
    startAssessment,
    submitAssessment
} from '../services/assessmentService.js';

function handleError(error, res, next) {
    if (error instanceof AssessmentError) {
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

export async function start(req, res, next) {
    try {
        const attempt = await startAssessment(req.auth.userId, req.body);
        return res.status(201).json({ ok: true, data: { attempt } });
    } catch (error) {
        return handleError(error, res, next);
    }
}

export async function active(req, res, next) {
    try {
        const attempt = await getActiveAssessment(req.auth.userId);
        return res.status(200).json({ ok: true, data: { attempt } });
    } catch (error) {
        return handleError(error, res, next);
    }
}

export async function saveAnswers(req, res, next) {
    try {
        const attempt = await saveAssessmentAnswers(
            req.auth.userId,
            req.params.id,
            req.body
        );

        return res.status(200).json({ ok: true, data: { attempt } });
    } catch (error) {
        return handleError(error, res, next);
    }
}

export async function submit(req, res, next) {
    try {
        const result = await submitAssessment(
            req.auth.userId,
            req.params.id
        );

        return res.status(200).json({ ok: true, data: { result } });
    } catch (error) {
        return handleError(error, res, next);
    }
}

export async function result(req, res, next) {
    try {
        const assessmentResult = await getAssessmentResult(
            req.auth.userId,
            req.params.id
        );

        return res.status(200).json({
            ok: true,
            data: { result: assessmentResult }
        });
    } catch (error) {
        return handleError(error, res, next);
    }
}

export async function history(req, res, next) {
    try {
        const attempts = await getAssessmentHistory(req.auth.userId);
        return res.status(200).json({ ok: true, data: { attempts } });
    } catch (error) {
        return handleError(error, res, next);
    }
}

export async function mastery(req, res, next) {
    try {
        const topics = await getAssessmentMastery(req.auth.userId);
        return res.status(200).json({ ok: true, data: { topics } });
    } catch (error) {
        return handleError(error, res, next);
    }
}
