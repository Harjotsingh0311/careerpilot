import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import env from '../config/env.js';

const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_COOKIE = 'careerpilot_refresh';

const refreshCookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth'
};

function hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
}

function publicUser(user) {
    return {
        id: user._id.toString(),
        displayName: user.displayName,
        email: user.email
    };
}

function createAccessToken(user) {
    return jwt.sign(
        { sub: user._id.toString() },
        env.JWT_ACCESS_SECRET,
        {
            expiresIn: '15m',
            issuer: 'careerpilot-api',
            audience: 'careerpilot-client'
        }
    );
}

function setRefreshCookie(res, token) {
    res.cookie(REFRESH_COOKIE, token, {
        ...refreshCookieOptions,
        maxAge: REFRESH_TOKEN_LIFETIME_MS
    });
}

function clearRefreshCookie(res) {
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
}

async function createRefreshSession(userId, sessionId = randomUUID()) {
    const rawToken = randomBytes(32).toString('hex');

    await RefreshToken.create({
        userId,
        sessionId,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS)
    });

    return { rawToken, sessionId };
}

function sendDuplicateEmail(res) {
    return res.status(409).json({
        ok: false,
        error: {
            code: 'EMAIL_ALREADY_REGISTERED',
            message: 'An account with this email already exists.'
        }
    });
}

export async function register(req, res, next) {
    try {
        const { displayName, email, password } = req.body;

        if (await User.exists({ email })) {
            return sendDuplicateEmail(res);
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await User.create({
            displayName,
            email,
            passwordHash
        });

        const session = await createRefreshSession(user._id);
        setRefreshCookie(res, session.rawToken);

        return res.status(201).json({
            ok: true,
            data: {
                user: publicUser(user),
                accessToken: createAccessToken(user)
            }
        });
    } catch (error) {
        if (error?.code === 11000) {
            return sendDuplicateEmail(res);
        }
        next(error);
    }
}

export async function login(req, res, next) {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('+passwordHash');

        // Use the same response for an unknown email and an incorrect password.
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({
                ok: false,
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: 'Email or password is incorrect.'
                }
            });
        }

        const session = await createRefreshSession(user._id);
        setRefreshCookie(res, session.rawToken);

        return res.status(200).json({
            ok: true,
            data: {
                user: publicUser(user),
                accessToken: createAccessToken(user)
            }
        });
    } catch (error) {
        next(error);
    }
}

export async function refresh(req, res, next) {
    try {
        const rawToken = req.cookies?.[REFRESH_COOKIE];

        if (!rawToken) {
            clearRefreshCookie(res);
            return res.status(401).json({
                ok: false,
                error: {
                    code: 'REFRESH_REQUIRED',
                    message: 'Please sign in again.'
                }
            });
        }

        // Look up using the hash. The raw refresh token is never stored in MongoDB.
        const tokenHash = hashToken(rawToken);
        const record = await RefreshToken.findOne({ tokenHash });

        if (!record) {
            clearRefreshCookie(res);
            return res.status(401).json({
                ok: false,
                error: {
                    code: 'INVALID_REFRESH_TOKEN',
                    message: 'Please sign in again.'
                }
            });
        }

        // A revoked token being presented again may indicate token reuse.
        if (record.revokedAt) {
            await RefreshToken.updateMany(
                { sessionId: record.sessionId, revokedAt: null },
                { $set: { revokedAt: new Date() } }
            );
            clearRefreshCookie(res);
            return res.status(401).json({
                ok: false,
                error: {
                    code: 'REFRESH_TOKEN_REUSED',
                    message: 'This session is no longer valid. Please sign in again.'
                }
            });
        }

        if (record.expiresAt <= new Date()) {
            await RefreshToken.updateOne(
                { _id: record._id, revokedAt: null },
                { $set: { revokedAt: new Date() } }
            );
            clearRefreshCookie(res);
            return res.status(401).json({
                ok: false,
                error: {
                    code: 'REFRESH_EXPIRED',
                    message: 'Please sign in again.'
                }
            });
        }

        // Atomically claim this token so two refresh requests cannot both rotate it.
        const claimed = await RefreshToken.findOneAndUpdate(
            { _id: record._id, revokedAt: null },
            { $set: { revokedAt: new Date() } },
            { new: true }
        );

        if (!claimed) {
            await RefreshToken.updateMany(
                { sessionId: record.sessionId, revokedAt: null },
                { $set: { revokedAt: new Date() } }
            );
            clearRefreshCookie(res);
            return res.status(401).json({
                ok: false,
                error: {
                    code: 'REFRESH_TOKEN_REUSED',
                    message: 'Please sign in again.'
                }
            });
        }

        const user = await User.findById(record.userId);

        if (!user) {
            await RefreshToken.updateMany(
                { sessionId: record.sessionId, revokedAt: null },
                { $set: { revokedAt: new Date() } }
            );
            clearRefreshCookie(res);
            return res.status(401).json({
                ok: false,
                error: {
                    code: 'ACCOUNT_NOT_FOUND',
                    message: 'Please sign in again.'
                }
            });
        }

        const session = await createRefreshSession(user._id, record.sessionId);
        setRefreshCookie(res, session.rawToken);

        return res.status(200).json({
            ok: true,
            data: {
                user: publicUser(user),
                accessToken: createAccessToken(user)
            }
        });
    } catch (error) {
        next(error);
    }
}

export async function logout(req, res, next) {
    try {
        const rawToken = req.cookies?.[REFRESH_COOKIE];

        if (rawToken) {
            const record = await RefreshToken.findOne({
                tokenHash: hashToken(rawToken)
            });

            if (record) {
                await RefreshToken.updateMany(
                    { sessionId: record.sessionId, revokedAt: null },
                    { $set: { revokedAt: new Date() } }
                );
            }
        }

        clearRefreshCookie(res);
        return res.status(200).json({
            ok: true,
            data: { loggedOut: true }
        });
    } catch (error) {
        next(error);
    }
}

export async function me(req, res, next) {
    try {
        const user = await User.findById(req.auth.userId);

        if (!user) {
            return res.status(401).json({
                ok: false,
                error: {
                    code: 'ACCOUNT_NOT_FOUND',
                    message: 'This account no longer exists.'
                }
            });
        }

        return res.status(200).json({
            ok: true,
            data: { user: publicUser(user) }
        });
    } catch (error) {
        next(error);
    }
}
