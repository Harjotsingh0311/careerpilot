import { getDashboardSummary, getDashboardTrends } from '../services/dashboardService.js';

export async function summary(req, res, next) {
    try {
        const data = await getDashboardSummary(req.auth.userId);

        return res.status(200).json({
            ok: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function trends(req, res, next) {
    try {
        const requested = Number.parseInt(req.query.days ?? '14', 10);
        const days = Number.isFinite(requested)
            ? Math.max(7, Math.min(84, requested))
            : 14;

        const data = await getDashboardTrends(req.auth.userId, days);

        return res.status(200).json({
            ok: true,
            data
        });
    } catch (error) {
        next(error);
    }
}
