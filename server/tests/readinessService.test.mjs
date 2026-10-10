import { describe, expect, it } from 'vitest';
import {
    calculateReadiness,
    computeStreak,
    getIndiaDayKey,
    shiftDayKey
} from '../src/services/readinessService.js';

describe('Readiness score', () => {
    it('reweights the available components only', () => {
        const result = calculateReadiness([
            { key: 'technical', score: 80, weight: 0.30 },
            { key: 'consistency', score: 50, weight: 0.10 },
            { key: 'interview', score: null, weight: 0.25 },
            { key: 'roleFit', score: null, weight: 0.20 },
            { key: 'delivery', score: null, weight: 0.15 }
        ]);

        expect(result.score).toBe(73);
        expect(result.signalsCount).toBe(2);
        expect(result.confidence).toBe('low');
    });

    it('returns no readiness number when no signals exist', () => {
        const result = calculateReadiness([
            { key: 'technical', score: null, weight: 0.30 },
            { key: 'roleFit', score: null, weight: 0.20 }
        ]);

        expect(result.score).toBeNull();
        expect(result.signalsCount).toBe(0);
    });

    it('computes a high-confidence score when four signals are available', () => {
        const result = calculateReadiness([
            { key: 'technical', score: 80, weight: 0.30 },
            { key: 'interview', score: 70, weight: 0.25 },
            { key: 'roleFit', score: 60, weight: 0.20 },
            { key: 'delivery', score: 90, weight: 0.15 },
            { key: 'consistency', score: null, weight: 0.10 }
        ]);

        expect(result.signalsCount).toBe(4);
        expect(result.confidence).toBe('high');
        expect(result.score).toBe(74);
    });
});

describe('India-local activity dates', () => {
    it('moves day keys across month boundaries', () => {
        expect(shiftDayKey('2026-10-01', -1)).toBe('2026-09-30');
        expect(shiftDayKey('2026-12-31', 1)).toBe('2027-01-01');
    });

    it('computes a current streak ending today', () => {
        expect(computeStreak(
            ['2026-10-08', '2026-10-09', '2026-10-10'],
            '2026-10-10'
        )).toBe(3);
    });

    it('continues yesterday’s streak if today is not active yet', () => {
        expect(computeStreak(
            ['2026-10-08', '2026-10-09'],
            '2026-10-10'
        )).toBe(2);
    });

    it('returns zero when recent activity is broken', () => {
        expect(computeStreak(
            ['2026-10-07'],
            '2026-10-10'
        )).toBe(0);
    });

    it('formats a date in India local time', () => {
        expect(getIndiaDayKey(new Date('2026-10-09T20:00:00Z')))
            .toBe('2026-10-10');
    });
});
