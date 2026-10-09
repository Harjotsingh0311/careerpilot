import express from 'express';
import { rateLimit } from 'express-rate-limit';
import {
    login,
    logout,
    me,
    refresh,
    register
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validateBody.js';
import { loginSchema, registerSchema } from '../utils/authSchemas.js';

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        ok: false,
        error: {
            code: 'AUTH_RATE_LIMITED',
            message: 'Too many authentication requests. Please try again later.'
        }
    }
});

router.use(authLimiter);

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

export default router;
