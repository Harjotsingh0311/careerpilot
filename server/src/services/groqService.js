import Groq from 'groq-sdk';
import PQueue from 'p-queue';
import { z } from 'zod';
import env from '../config/env.js';
import AiUsage from '../models/AiUsage.js';
import { getIndiaDayKey } from './readinessService.js';

const queue = new PQueue({ concurrency: 2 });

export class AiServiceError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = 'AiServiceError';
        this.status = status;
        this.code = code;
    }
}

async function consumeQuota(userId) {
    if (!userId) {
        throw new AiServiceError(
            500,
            'AI_USER_REQUIRED',
            'An authenticated user is required for AI processing.'
        );
    }

    const day = getIndiaDayKey();
    const limit = env.AI_CALLS_PER_USER_PER_DAY;

    const existing = await AiUsage.findOneAndUpdate(
        {
            userId,
            day,
            calls: { $lt: limit }
        },
        { $inc: { calls: 1 } },
        { new: true }
    );

    if (existing) return { userId, day };

    try {
        const created = await AiUsage.create({
            userId,
            day,
            calls: 1
        });

        return { userId: created.userId, day };
    } catch (error) {
        if (error?.code === 11000) {
            throw new AiServiceError(
                429,
                'AI_QUOTA',
                'Your daily AI limit has been reached. Try again tomorrow.'
            );
        }

        throw error;
    }
}

export async function consumeAiQuota(userId) {
    return consumeQuota(userId);
}
function retryAfterMs(error, attempt) {
    const headers = error.headers;
    const value = typeof headers?.get === 'function'
        ? headers.get('retry-after')
        : headers?.['retry-after'];

    return Math.min((Number(value) || (2 ** attempt)) * 1000, 20000);
}

async function callGroq(client, params, attempts = 3) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            return await queue.add(() => client.chat.completions.create(params));
        } catch (error) {
            if (error.status === 429 && attempt < attempts - 1) {
                await new Promise(resolve =>
                    setTimeout(resolve, retryAfterMs(error, attempt))
                );
                continue;
            }

            throw error;
        }
    }

    throw new Error('AI request failed.');
}

export async function askJSON({
    userId,
    system,
    user,
    schema,
    model = env.GROQ_MODEL_MAIN,
    maxTokens = 1200
}) {
    if (!env.GROQ_API_KEY) {
        throw new AiServiceError(
            503,
            'AI_NOT_CONFIGURED',
            'Groq is not configured yet. Add GROQ_API_KEY to server/.env to enable AI extraction and rewrite suggestions.'
        );
    }

    const quota = await consumeQuota(userId);
    const client = new Groq({ apiKey: env.GROQ_API_KEY });
    const models = [...new Set([
        model,
        env.GROQ_MODEL_FALLBACK
    ].filter(Boolean))];

    let lastError;

    for (const currentModel of models) {
        try {
            const response = await callGroq(client, {
                model: currentModel,
                temperature: 0.2,
                max_completion_tokens: maxTokens,
                ...(currentModel.startsWith('openai/gpt-oss') && {
                    reasoning_effort: 'low'
                }),
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: user }
                ]
            });

            const choice = response.choices?.[0];

            if (!choice?.message?.content || choice.finish_reason === 'length') {
                throw new Error('AI output was empty or cut off.');
            }

            // All model output is parsed against a strict Zod schema.
            const data = schema.parse(JSON.parse(choice.message.content));

            await AiUsage.updateOne(
                { userId: quota.userId, day: quota.day },
                {
                    $inc: {
                        promptTokens: response.usage?.prompt_tokens || 0,
                        completionTokens: response.usage?.completion_tokens || 0
                    }
                }
            );

            return {
                data,
                usage: response.usage || null,
                model: currentModel
            };
        } catch (error) {
            lastError = error;

            const safeMessage = String(error.message || 'Unknown provider error')
                .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
                .replace(/gsk_[A-Za-z0-9_-]+/g, '[redacted]')
                .replace(/\s+/g, ' ')
                .slice(0, 180);

            const diagnostics = {
                model: currentModel,
                name: error.name || 'UnknownError',
                status: Number.isInteger(error.status) ? error.status : null,
                code: typeof error.code === 'string' ? error.code : null,
                message: safeMessage
            };

            if (error instanceof z.ZodError) {
                diagnostics.validationIssues = error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    code: issue.code
                }));
            }

            console.error(
                'Groq request failed (safe diagnostics):',
                JSON.stringify(diagnostics)
            );
        }
    }

    if (lastError instanceof AiServiceError) throw lastError;

    throw new AiServiceError(
        503,
        'AI_UNAVAILABLE',
        'AI processing is temporarily unavailable. Your document text remains private; retry later.'
    );
}

export const plainString = z.string().trim().max(500);
