import { describe, expect, it } from 'vitest';
import {
    answerEvaluationSchema,
    submitAnswerSchema
} from '../src/utils/interviewAnswerSchemas.js';

const validEvaluation = {
    score: 8,
    correctness: 8,
    clarity: 7,
    strengths: ['Explains the concept clearly'],
    gaps: ['Needs a concrete example'],
    tip: 'Include a practical example.',
    followUp: null
};

describe('Interview answer schemas', () => {
    it('accepts a valid evaluation', () => {
        expect(answerEvaluationSchema.safeParse(validEvaluation).success)
            .toBe(true);
    });

    it('rejects scores outside the 0-10 range', () => {
        expect(answerEvaluationSchema.safeParse({
            ...validEvaluation,
            score: 11
        }).success).toBe(false);
    });

    it('rejects more than two strengths', () => {
        expect(answerEvaluationSchema.safeParse({
            ...validEvaluation,
            strengths: ['One', 'Two', 'Three']
        }).success).toBe(false);
    });

    it('rejects a tip longer than 25 words', () => {
        expect(answerEvaluationSchema.safeParse({
            ...validEvaluation,
            tip: Array(26).fill('improve').join(' ')
        }).success).toBe(false);
    });

    it('accepts a null follow-up', () => {
        expect(answerEvaluationSchema.safeParse({
            ...validEvaluation,
            followUp: null
        }).success).toBe(true);
    });

    it('accepts a text answer and defaults its mode', () => {
        expect(submitAnswerSchema.parse({
            answer: 'An API allows software components to communicate.'
        })).toEqual({
            answer: 'An API allows software components to communicate.',
            mode: 'text'
        });
    });

    it('accepts voice transcripts as answer input', () => {
        expect(submitAnswerSchema.safeParse({
            answer: 'The transcript of my answer.',
            mode: 'voice'
        }).success).toBe(true);
    });

    it('rejects empty answers and unexpected fields', () => {
        expect(submitAnswerSchema.safeParse({
            answer: '   '
        }).success).toBe(false);

        expect(submitAnswerSchema.safeParse({
            answer: 'An answer',
            unexpected: true
        }).success).toBe(false);
    });
});
