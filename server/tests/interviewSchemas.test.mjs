
import { describe, expect, it } from 'vitest';
import { createQuestionPlanSchema } from '../src/utils/interviewSchemas.js';

function makeQuestion(index = 1) {
    return {
        kind: 'jd',
        question: `Explain job-related concept number ${index}?`,
        expectedPoints: [
            'Explain the core concept',
            'Describe how it works',
            'Give a relevant example'
        ]
    };
}

describe('Interview question-plan schema', () => {
    it('accepts the requested number of valid questions', () => {
        const schema = createQuestionPlanSchema(5);
        const result = schema.safeParse({
            questions: Array.from(
                { length: 5 },
                (_, index) => makeQuestion(index + 1)
            )
        });

        expect(result.success).toBe(true);
    });

    it('rejects the wrong number of questions', () => {
        const schema = createQuestionPlanSchema(5);

        expect(schema.safeParse({
            questions: [makeQuestion(1)]
        }).success).toBe(false);
    });

    it('rejects unsupported question categories', () => {
        const schema = createQuestionPlanSchema(5);
        const questions = Array.from(
            { length: 5 },
            (_, index) => makeQuestion(index + 1)
        );

        questions[0].kind = 'unsupported';

        expect(schema.safeParse({ questions }).success).toBe(false);
    });

    it('requires between three and five expected answer points', () => {
        const schema = createQuestionPlanSchema(5);
        const questions = Array.from(
            { length: 5 },
            (_, index) => makeQuestion(index + 1)
        );

        questions[0].expectedPoints = ['Only one point'];

        expect(schema.safeParse({ questions }).success).toBe(false);
    });

    it('rejects unexpected fields', () => {
        const schema = createQuestionPlanSchema(5);
        const questions = Array.from(
            { length: 5 },
            (_, index) => makeQuestion(index + 1)
        );

        questions[0].answerKey = 'This must not be accepted';

        expect(schema.safeParse({ questions }).success).toBe(false);
    });

    it('rejects question counts outside 5–10', () => {
        expect(() => createQuestionPlanSchema(4)).toThrow();
        expect(() => createQuestionPlanSchema(11)).toThrow();
        expect(() => createQuestionPlanSchema(5.5)).toThrow();
    });
});
