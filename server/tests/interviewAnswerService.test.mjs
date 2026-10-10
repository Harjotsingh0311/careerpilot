import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = {
    documentFindOne: vi.fn(),
    sessionCreate: vi.fn(),
    sessionFindOne: vi.fn(),
    sessionFind: vi.fn(),
    askJSON: vi.fn()
};

let interviewService;

function makeSession({ hintUsed = false } = {}) {
    return {
        _id: { toString: () => '507f1f77bcf86cd799439099' },
        status: 'in_progress',
        config: { numQuestions: 5 },
        context: { roleSummary: 'Software engineering role.' },
        turns: Array.from({ length: 5 }, (_, idx) => ({
            idx,
            kind: 'jd',
            question: `Question number ${idx + 1}?`,
            expectedPoints: [
                'Explain the concept',
                'Describe the approach',
                'Give an example'
            ],
            answer: null,
            answerMode: 'text',
            hintUsed: idx === 0 && hintUsed,
            evaluation: undefined
        })),
        save: vi.fn().mockResolvedValue(true)
    };
}

function evaluation(overrides = {}) {
    return {
        score: 8,
        correctness: 8,
        clarity: 8,
        strengths: ['Explains the concept'],
        gaps: ['Needs a stronger example'],
        tip: 'Give a concrete example.',
        followUp: null,
        ...overrides
    };
}

describe('Interview answer service', () => {
    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();

        vi.doMock('../src/models/Document.js', () => ({
            default: { findOne: mocks.documentFindOne }
        }));

        vi.doMock('../src/models/InterviewSession.js', () => ({
            default: {
                create: mocks.sessionCreate,
                findOne: mocks.sessionFindOne,
                find: mocks.sessionFind
            }
        }));

        vi.doMock('../src/services/groqService.js', () => ({
            askJSON: mocks.askJSON
        }));

        // Import after registering mocks; no hoisted vi.mock calls.
        interviewService = await import('../src/services/interviewService.js');
    });

    it('rejects an invalid interview ID', async () => {
        await expect(interviewService.submitInterviewAnswer({
            userId: '507f1f77bcf86cd799439011',
            interviewId: 'bad-id',
            answer: 'An answer',
            mode: 'text'
        })).rejects.toMatchObject({
            code: 'INVALID_INTERVIEW_ID'
        });

        expect(mocks.sessionFindOne).not.toHaveBeenCalled();
        expect(mocks.askJSON).not.toHaveBeenCalled();
    });

    it('returns not found for a session unavailable to this user', async () => {
        mocks.sessionFindOne.mockResolvedValueOnce(null);

        await expect(interviewService.submitInterviewAnswer({
            userId: '507f1f77bcf86cd799439011',
            interviewId: '507f1f77bcf86cd799439099',
            answer: 'An answer',
            mode: 'text'
        })).rejects.toMatchObject({
            status: 404,
            code: 'INTERVIEW_NOT_FOUND'
        });

        expect(mocks.askJSON).not.toHaveBeenCalled();
    });

    it('saves evaluation and returns the next public question', async () => {
        const session = makeSession();
        mocks.sessionFindOne.mockResolvedValueOnce(session);
        mocks.askJSON.mockResolvedValueOnce({ data: evaluation() });

        const result = await interviewService.submitInterviewAnswer({
            userId: '507f1f77bcf86cd799439011',
            interviewId: '507f1f77bcf86cd799439099',
            answer: 'An API allows software components to communicate.',
            mode: 'text'
        });

        expect(mocks.askJSON).toHaveBeenCalledTimes(1);
        expect(session.save).toHaveBeenCalledTimes(1);
        expect(session.turns[0].answer).toContain('API');
        expect(result.evaluation.score).toBe(8);
        expect(result.nextQuestion.question).toBe('Question number 2?');
        expect(result.nextQuestion).not.toHaveProperty('expectedPoints');
    });

    it('caps the score at 8 when a hint was used', async () => {
        const session = makeSession({ hintUsed: true });
        mocks.sessionFindOne.mockResolvedValueOnce(session);
        mocks.askJSON.mockResolvedValueOnce({
            data: evaluation({ score: 10 })
        });

        const result = await interviewService.submitInterviewAnswer({
            userId: '507f1f77bcf86cd799439011',
            interviewId: '507f1f77bcf86cd799439099',
            answer: 'A detailed answer.',
            mode: 'text'
        });

        expect(result.evaluation.score).toBe(8);
        expect(session.save).toHaveBeenCalledTimes(1);
    });

    it('inserts a follow-up after a low-scoring answer', async () => {
        const session = makeSession();
        mocks.sessionFindOne.mockResolvedValueOnce(session);
        mocks.askJSON.mockResolvedValueOnce({
            data: evaluation({
                score: 4,
                followUp: 'Can you give a practical example?'
            })
        });

        const result = await interviewService.submitInterviewAnswer({
            userId: '507f1f77bcf86cd799439011',
            interviewId: '507f1f77bcf86cd799439099',
            answer: 'A partial answer.',
            mode: 'text'
        });

        expect(session.turns).toHaveLength(6);
        expect(result.nextQuestion.kind).toBe('followup');
        expect(result.nextQuestion.question)
            .toBe('Can you give a practical example?');
        expect(result.nextQuestion).not.toHaveProperty('expectedPoints');
    });
});
