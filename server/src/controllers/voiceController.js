import {
    analyzeVoiceRecording,
    VoiceServiceError
} from '../services/voiceService.js';

function handleError(error, res, next) {
    if (error instanceof VoiceServiceError ||
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

export async function analyzeVoice(req, res, next) {
    try {
        const data = await analyzeVoiceRecording({
            userId: req.auth.userId,
            file: req.file,
            volumeCv: req.body?.volumeCv,
            promptText: req.body?.promptText
        });

        return res.status(201).json({
            ok: true,
            data
        });
    } catch (error) {
        return handleError(error, res, next);
    }
}
