import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

dotenv.config({
    path: path.resolve(currentDirectory, '../../.env')
});

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production'])
        .default('development'),

    PORT: z.coerce.number()
        .int()
        .min(1)
        .max(65535)
        .default(5000),

    CLIENT_ORIGIN: z.string()
        .url()
        .default('http://localhost:5173'),

    MONGODB_URI: z.string()
        .min(1, 'MONGODB_URI is required')
        .refine(
            value => value.startsWith('mongodb://') ||
                value.startsWith('mongodb+srv://'),
            'MONGODB_URI must be a MongoDB connection URI'
        ),

    JWT_ACCESS_SECRET: z.string()
        .min(32, 'JWT_ACCESS_SECRET must contain at least 32 characters'),

    GROQ_API_KEY: z.string().default(''),

    GROQ_MODEL_MAIN: z.string()
        .default('openai/gpt-oss-120b'),

    GROQ_MODEL_FALLBACK: z.string()
        .default('openai/gpt-oss-20b'),

    AI_CALLS_PER_USER_PER_DAY: z.coerce.number()
        .int()
        .min(1)
        .max(500)
        .default(40)
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
    const details = result.error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n');

    throw new Error(`Invalid environment configuration:\n${details}`);
}

export default result.data;
