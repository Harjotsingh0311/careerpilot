import { describe, expect, it } from 'vitest';
import {
    calculateTestScore,
    updateMastery
} from '../src/services/assessmentService.js';

describe('Assessment scoring', () => {
    it('calculates percentage score out of all questions', () => {
        expect(calculateTestScore([true, false, true])).toEqual({
            correctCount: 2,
            totalQuestions: 3,
            score: 67
        });
    });

    it('gives zero for an empty list', () => {
        expect(calculateTestScore([])).toEqual({
            correctCount: 0,
            totalQuestions: 0,
            score: 0
        });
    });

    it('moves mastery upward after a correct answer', () => {
        expect(updateMastery(0.5, true, 'easy')).toBeCloseTo(0.55);
    });

    it('moves mastery downward after an incorrect answer', () => {
        expect(updateMastery(0.5, false, 'medium')).toBeCloseTo(0.425);
    });

    it('moves mastery faster for a harder question', () => {
        expect(updateMastery(0.5, true, 'hard')).toBeGreaterThan(
            updateMastery(0.5, true, 'easy')
        );
    });
});
