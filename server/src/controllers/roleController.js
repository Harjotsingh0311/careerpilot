import RoleProfile from '../models/RoleProfile.js';
import { getRoleMatchesForUser } from '../services/roleMatchService.js';

export async function listRoles(req, res, next) {
    try {
        const roles = await RoleProfile.find({})
            .select('slug title description skills topics')
            .sort({ title: 1 })
            .lean();

        return res.status(200).json({
            ok: true,
            data: { roles }
        });
    } catch (error) {
        next(error);
    }
}

export async function roleMatches(req, res, next) {
    try {
        const data = await getRoleMatchesForUser(req.auth.userId);

        return res.status(200).json({
            ok: true,
            data
        });
    } catch (error) {
        next(error);
    }
}
