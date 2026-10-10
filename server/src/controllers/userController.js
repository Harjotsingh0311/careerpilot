import {
    getUserProfile,
    updateUserProfile
} from '../services/userService.js';

export async function getMe(req, res, next) {
    try {
        const user = await getUserProfile(req.auth.userId);
        return res.status(200).json({ ok: true, data: { user } });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({
                ok: false,
                error: {
                    code: error.code || 'PROFILE_ERROR',
                    message: error.message
                }
            });
        }
        next(error);
    }
}

export async function patchMe(req, res, next) {
    try {
        const user = await updateUserProfile(req.auth.userId, req.body);
        return res.status(200).json({ ok: true, data: { user } });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({
                ok: false,
                error: {
                    code: error.code || 'PROFILE_ERROR',
                    message: error.message
                }
            });
        }
        next(error);
    }
}
