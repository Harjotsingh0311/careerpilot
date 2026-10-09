import { describe, expect, it } from 'vitest';
import { startAssessmentSchema, saveAnswersSchema } from '../src/utils/assessmentSchemas.js';

describe('Assessment request validation', () => {
    it('accepts a valid assessment configuration', () => {
        const parsed = startAssessmentSchema.safeParse({
            topics: ['dsa', 'ml'],
            questionCount: 10,
            durationMinutes: 10
        });

        expect(parsed.success).toBe(true);
    });

    it('rejects unsupported topics', () => {
        const parsed = startAssessmentSchema.safeParse({
            topics: ['cyber_magic'],
            questionCount: 10,
            durationMinutes: 10
        });

        expect(parsed.success).toBe(false);
    });

    it('rejects an answer choice outside the four options', () => {
        const parsed = saveAnswersSchema.safeParse({
            answers: [{
                questionId: '507f1f77bcf86cd799439011',
                chosenIndex: 5
            }]
        });

        expect(parsed.success).toBe(false);
    });

    it('strips an injected userId from answer requests', () => {
        const parsed = saveAnswersSchema.safeParse({
            userId: 'another-user',
            answers: []
        });

        expect(parsed.success).toBe(true);
        expect(parsed.data).not.toHaveProperty('userId');
    });
});
