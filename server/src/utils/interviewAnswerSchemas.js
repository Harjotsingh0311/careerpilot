import { z } from 'zod';

export const submitAnswerSchema = z.object({
    answer: z.string().trim().min(1).max(10000),
    mode: z.enum(['text', 'voice']).default('text')
}).strict();

export const answerEvaluationSchema = z.object({
    score: z.number().int().min(0).max(10),
    correctness: z.number().int().min(0).max(10),
    clarity: z.number().int().min(0).max(10),
    strengths: z.array(z.string().trim().min(1).max(160)).max(2),
    gaps: z.array(z.string().trim().min(1).max(160)).max(2),
    tip: z.string().trim().max(300).refine(
        value => value.split(/\s+/).filter(Boolean).length <= 25,
        'Tip must contain at most 25 words.'
    ),
    followUp: z.string().trim().min(1).max(600).nullable()
}).strict();
