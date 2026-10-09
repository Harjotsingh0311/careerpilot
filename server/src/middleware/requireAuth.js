import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export function requireAuth(req, res, next) {
    const authorization = req.get('authorization') || '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            ok: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Please sign in to continue.'
            }
        });
    }

    try {
        const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
            issuer: 'careerpilot-api',
            audience: 'careerpilot-client'
        });

        if (typeof payload === 'string' || !payload.sub) {
            throw new Error('Invalid access-token payload');
        }

        req.auth = { userId: payload.sub };
        next();
    } catch {
        return res.status(401).json({
            ok: false,
            error: {
                code: 'INVALID_ACCESS_TOKEN',
                message: 'Your session has expired. Please sign in again.'
            }
        });
    }
}
