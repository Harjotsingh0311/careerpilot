import { z } from 'zod';
import { TOPICS } from './assessmentConstants.js';

export const startAssessmentSchema = z.object({
    topics: z.array(z.enum(TOPICS)).min(1).max(9).default(TOPICS),
    questionCount: z.coerce.number().int().min(3).max(30).default(10),
    durationMinutes: z.coerce.number().int().min(1).max(60).default(10)
});

export const saveAnswersSchema = z.object({
    answers: z.array(z.object({
        questionId: z.string().regex(/^[a-f\d]{24}$/i),
        chosenIndex: z.number().int().min(0).max(3).nullable().optional(),
        timeMs: z.number().int().min(0).max(3600000).optional(),
        flagged: z.boolean().optional()
    })).max(30).default([]),
    tabSwitchCount: z.number().int().min(0).max(500).optional()
});
