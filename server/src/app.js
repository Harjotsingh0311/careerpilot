import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import env from './config/env.js';
import { getDatabaseStatus } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import skillProfileRoutes from './routes/skillProfileRoutes.js';
import assessmentRoutes from './routes/assessmentRoutes.js';

const app = express();

app.use(helmet());

app.use(cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests. Please try again later.'
    }
});

app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
    res.status(200).json({
        ok: true,
        data: {
            api: 'online',
            db: getDatabaseStatus()
        }
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/skills', skillProfileRoutes);
app.use('/api/assessment', assessmentRoutes);

app.use((req, res) => {
    res.status(404).json({
        ok: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Route not found'
        }
    });
});

// Do not expose database errors, secrets, or stack traces in API responses.
app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    if (error?.code === 11000) {
        return res.status(409).json({
            ok: false,
            error: {
                code: 'CONFLICT',
                message: 'A record with that information already exists.'
            }
        });
    }

    console.error('API request failed:', error?.name || 'UnknownError');

    return res.status(500).json({
        ok: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred.'
        }
    });
});

export default app;


