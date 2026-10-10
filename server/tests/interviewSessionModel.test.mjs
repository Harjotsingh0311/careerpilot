
import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import InterviewSession from '../src/models/InterviewSession.js';

const validUserId = new mongoose.Types.ObjectId();
const validJobDocId = new mongoose.Types.ObjectId();

function makeSession(overrides = {}) {
    return new InterviewSession({
        user: validUserId,
        jobDoc: validJobDocId,
        config: {
            role: 'Software Engineer Intern',
            type: 'technical',
            difficulty: 'medium',
            numQuestions: 8
        },
        context: {
            roleSummary: 'A role involving software development.',
            mustHave: ['javascript', 'sql'],
            resumeHighlights: ['Project development']
        },
        turns: [{
            idx: 0,
            kind: 'jd',
            question: 'Explain how an API works.',
            expectedPoints: [
                'Request and response',
                'HTTP methods',
                'Status codes'
            ]
        }],
        ...overrides
    });
}

describe('InterviewSession model', () => {
    it('accepts a valid interview session', () => {
        const session = makeSession();

        expect(session.validateSync()).toBeUndefined();
        expect(session.status).toBe('in_progress');
        expect(session.turns[0].hintUsed).toBe(false);
        expect(session.turns[0].answer).toBeNull();
    });

    it('rejects unsupported interview types', () => {
        const session = makeSession({
            config: {
                role: 'Software Engineer Intern',
                type: 'invalid',
                difficulty: 'medium',
                numQuestions: 8
            }
        });

        expect(session.validateSync()?.errors['config.type']).toBeDefined();
    });

    it('requires between 5 and 10 whole-number questions', () => {
        for (const count of [4, 11, 5.5]) {
            const session = makeSession({
                config: {
                    role: 'Software Engineer Intern',
                    type: 'technical',
                    difficulty: 'medium',
                    numQuestions: count
                }
            });

            expect(
                session.validateSync()?.errors['config.numQuestions']
            ).toBeDefined();
        }
    });

    it('rejects unsupported question categories', () => {
        const session = makeSession({
            turns: [{
                idx: 0,
                kind: 'unsupported',
                question: 'Test question',
                expectedPoints: []
            }]
        });

        expect(
            session.validateSync()?.errors['turns.0.kind']
        ).toBeDefined();
    });

    it('rejects evaluation scores outside the 0–10 range', () => {
        const session = makeSession({
            turns: [{
                idx: 0,
                kind: 'jd',
                question: 'Explain an API.',
                expectedPoints: ['Request and response'],
                answer: 'An API allows software to communicate.',
                evaluation: {
                    score: 11,
                    correctness: 8,
                    clarity: 8,
                    strengths: ['Clear explanation'],
                    gaps: [],
                    tip: 'Add an example.'
                }
            }]
        });

        expect(
            session.validateSync()?.errors['turns.0.evaluation.score']
        ).toBeDefined();
    });

    it('supports the defined session statuses', () => {
        for (const status of ['in_progress', 'completed', 'abandoned']) {
            const session = makeSession({ status });
            expect(session.validateSync()).toBeUndefined();
        }
    });

    it('defines an index for a user’s interview history', () => {
        const indexes = InterviewSession.schema.indexes();

        expect(indexes).toContainEqual([
            { user: 1, createdAt: -1 },
            expect.any(Object)
        ]);
    });
});
