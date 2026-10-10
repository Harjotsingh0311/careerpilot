
import {
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

const mocks = vi.hoisted(() => ({
    documentFindOne: vi.fn(),
    sessionCreate: vi.fn(),
    askJSON: vi.fn()
}));

vi.mock('../src/models/Document.js', () => ({
    default: { findOne: mocks.documentFindOne }
}));

vi.mock('../src/models/InterviewSession.js', () => ({
    default: { create: mocks.sessionCreate }
}));

vi.mock('../src/services/groqService.js', () => ({
    askJSON: mocks.askJSON
}));

import {
    createInterviewSession,
    InterviewServiceError
} from '../src/services/interviewService.js';

const userId = '507f1f77bcf86cd799439011';
const jdId = '507f1f77bcf86cd799439012';
const resumeId = '507f1f77bcf86cd799439013';

const input = {
    userId,
    jdId,
    resumeId: null,
    role: 'Software Engineer Intern',
    type: 'technical',
    difficulty: 'medium',
    numQuestions: 5
};

function queryReturning(document) {
    return {
        select: vi.fn().mockResolvedValue(document)
    };
}

function makeQuestions(count = 5) {
    return Array.from({ length: count }, (_, index) => ({
        kind: 'jd',
        question: `Explain job-related concept ${index + 1} with an example?`,
        expectedPoints: [
            'Explain the main concept',
            'Describe how it works',
            'Give a relevant example'
        ]
    }));
}

function makeSession() {
    const turns = makeQuestions().map((question, idx) => ({
        idx,
        ...question
    }));

    return {
        _id: { toString: () => '507f1f77bcf86cd799439099' },
        status: 'in_progress',
        config: { ...input, userId: undefined, jdId: undefined, resumeId: undefined },
        turns,
        createdAt: new Date('2026-10-10T12:00:00.000Z')
    };
}

const jobDocument = {
    _id: jdId,
    kind: 'jd',
    name: 'Software Engineer JD',
    text: 'PRIVATE RAW JOB DESCRIPTION THAT MUST NOT BE SENT',
    extractedSkills: ['JavaScript', 'SQL'],
    parsed: {
        roleTitle: 'Software Engineer Intern',
        mustHave: ['JavaScript', 'SQL'],
        responsibilities: [
            'Build software features',
            'Write automated tests'
        ]
    }
};

describe('Interview service: session creation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects invalid input before querying documents or calling AI', async () => {
        await expect(createInterviewSession({
            ...input,
            numQuestions: 11
        })).rejects.toMatchObject({
            name: 'InterviewServiceError',
            code: 'INVALID_INTERVIEW_CONFIG'
        });

        expect(mocks.documentFindOne).not.toHaveBeenCalled();
        expect(mocks.askJSON).not.toHaveBeenCalled();
    });

    it('returns JD_NOT_FOUND when the selected JD is unavailable', async () => {
        mocks.documentFindOne.mockReturnValueOnce(queryReturning(null));

        await expect(createInterviewSession(input)).rejects.toMatchObject({
            name: 'InterviewServiceError',
            status: 404,
            code: 'JD_NOT_FOUND'
        });

        expect(mocks.askJSON).not.toHaveBeenCalled();
        expect(mocks.sessionCreate).not.toHaveBeenCalled();
    });

    it('creates a session using one mocked AI planning call', async () => {
        mocks.documentFindOne.mockReturnValueOnce(
            queryReturning(jobDocument)
        );
        mocks.askJSON.mockResolvedValueOnce({
            data: { questions: makeQuestions() },
            usage: null,
            model: 'mock-model'
        });
        mocks.sessionCreate.mockResolvedValueOnce(makeSession());

        const result = await createInterviewSession(input);

        expect(mocks.askJSON).toHaveBeenCalledTimes(1);
        expect(mocks.askJSON).toHaveBeenCalledWith(
            expect.objectContaining({
                userId,
                maxTokens: 2400,
                schema: expect.any(Object)
            })
        );

        expect(mocks.sessionCreate).toHaveBeenCalledTimes(1);
        expect(result.status).toBe('in_progress');
        expect(result.progress).toEqual({
            answered: 0,
            total: 5
        });
        expect(result.question).toEqual({
            idx: 0,
            kind: 'jd',
            question: makeQuestions()[0].question
        });
        expect(result.question).not.toHaveProperty('expectedPoints');
    });

    it('does not include raw document text in the AI prompt', async () => {
        mocks.documentFindOne.mockReturnValueOnce(
            queryReturning(jobDocument)
        );
        mocks.askJSON.mockResolvedValueOnce({
            data: { questions: makeQuestions() },
            usage: null,
            model: 'mock-model'
        });
        mocks.sessionCreate.mockResolvedValueOnce(makeSession());

        await createInterviewSession(input);

        const aiCall = mocks.askJSON.mock.calls[0][0];

        expect(aiCall.user).not.toContain(jobDocument.text);
        expect(aiCall.user).toContain('JavaScript');
        expect(aiCall.user).toContain('SQL');
    });

    it('rejects a resume that is not found for the authenticated user', async () => {
        mocks.documentFindOne
            .mockReturnValueOnce(queryReturning(jobDocument))
            .mockReturnValueOnce(queryReturning(null));

        await expect(createInterviewSession({
            ...input,
            resumeId
        })).rejects.toMatchObject({
            name: 'InterviewServiceError',
            status: 404,
            code: 'RESUME_NOT_FOUND'
        });

        expect(mocks.askJSON).not.toHaveBeenCalled();
        expect(mocks.sessionCreate).not.toHaveBeenCalled();
    });
});
