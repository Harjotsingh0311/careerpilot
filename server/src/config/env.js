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
        .min(32, 'JWT_ACCESS_SECRET must contain at least 32 characters')
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
    const details = result.error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n');

    throw new Error(`Invalid environment configuration:\n${details}`);
}

export default result.data;
