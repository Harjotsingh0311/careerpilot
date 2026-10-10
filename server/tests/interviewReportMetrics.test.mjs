import { describe, expect, it } from 'vitest';
import { calculateInterviewMetrics } from '../src/services/interviewReportMetrics.js';

function makeTurn(kind, score, clarity = score, correctness = score) {
    return {
        kind,
        answer: 'A submitted answer.',
        evaluation: { score, clarity, correctness }
    };
}

describe('Interview report metric calculations', () => {
    it('computes overall score as mean turn score multiplied by 10', () => {
        const metrics = calculateInterviewMetrics({
            turns: [
                makeTurn('jd', 8),
                makeTurn('fundamental', 6)
            ]
        });

        expect(metrics.overallScore).toBe(70);
    });

    it('computes category scores separately', () => {
        const metrics = calculateInterviewMetrics({
            turns: [
                makeTurn('jd', 8),
                makeTurn('fundamental', 6),
                makeTurn('resume', 5),
                makeTurn('behavioral', 7)
            ]
        });

        expect(metrics.categoryScores).toEqual({
            technical: 70,
            resumeDepth: 50,
            behavioral: 70
        });
    });

    it('computes communication and correctness independently', () => {
        const metrics = calculateInterviewMetrics({
            turns: [
                makeTurn('jd', 8, 6, 9),
                makeTurn('jd', 6, 8, 5)
            ]
        });

        expect(metrics.communicationScore).toBe(70);
        expect(metrics.correctnessScore).toBe(70);
    });

    it('computes completion rate from evaluated answers', () => {
        const metrics = calculateInterviewMetrics({
            turns: [
                makeTurn('jd', 8),
                {
                    kind: 'jd',
                    answer: null,
                    evaluation: undefined
                }
            ]
        });

        expect(metrics.completionRate).toBe(50);
        expect(metrics.questionsAnswered).toBe(1);
        expect(metrics.questionsTotal).toBe(2);
    });

    it('returns null for categories with no scored turns', () => {
        const metrics = calculateInterviewMetrics({
            turns: [makeTurn('jd', 8)]
        });

        expect(metrics.categoryScores.resumeDepth).toBeNull();
        expect(metrics.categoryScores.behavioral).toBeNull();
    });
});
