import { describe, expect, it } from 'vitest';
import {
    voiceMetrics,
    voiceScores,
    VOICE_FILLERS
} from '../src/services/voiceMetrics.js';

function makeWords(count = 20, step = 0.5, duration = 0.5) {
    return Array.from({ length: count }, (_, index) => ({
        word: `word${index + 1}`,
        start: index * step,
        end: index * step + duration
    }));
}

describe('Voice metrics', () => {
    it('returns null when fewer than 20 words have usable timestamps', () => {
        expect(voiceMetrics(makeWords(19))).toBeNull();
    });

    it('computes a 120 WPM pace for 20 words over 10 seconds', () => {
        const metrics = voiceMetrics(makeWords());

        expect(metrics.wpm).toBe(120);
        expect(metrics.wordCount).toBe(20);
        expect(metrics.durationSec).toBe(10);
        expect(metrics.longPauses).toBe(0);
        expect(metrics.fillerRatio).toBe(0);
    });

    it('counts fillers and long pauses', () => {
        const words = makeWords(20);
        words[2].word = 'um,';
        words[5].word = 'uh';
        words[10] = {
            ...words[10],
            start: words[9].end + 1.5,
            end: words[9].end + 2
        };

        const metrics = voiceMetrics(words);

        expect(metrics.fillerCount).toBe(2);
        expect(metrics.fillerRatio).toBe(2 / 20);
        expect(metrics.longPauses).toBe(1);
    });

    it('returns null for malformed or unusable word input', () => {
        expect(voiceMetrics(null)).toBeNull();
        expect(voiceMetrics([{ word: 'hello', start: 0, end: 0 }])).toBeNull();
    });

    it('recognizes the filler vocabulary from the blueprint', () => {
        expect(VOICE_FILLERS).toEqual([
            'um', 'uh', 'umm', 'uhh', 'er', 'erm', 'hmm'
        ]);
    });
});

describe('Voice delivery scores', () => {
    const baseline = {
        wpm: 120,
        fillerRatio: 0,
        pauseRatio: 0
    };

    it('gives maximum pace, filler, and pause scores for ideal values', () => {
        const scores = voiceScores(baseline);

        expect(scores).toEqual({
            pace: 100,
            filler: 100,
            pause: 100,
            volume: null,
            delivery: 100
        });
    });

    it('reduces the pace score outside the target WPM range', () => {
        expect(voiceScores({ ...baseline, wpm: 90 }).pace).toBe(60);
        expect(voiceScores({ ...baseline, wpm: 180 }).pace).toBe(60);
    });

    it('reduces filler score using the specified ratio', () => {
        expect(voiceScores({
            ...baseline,
            fillerRatio: 0.05
        }).filler).toBe(50);
    });

    it('reduces pause score using the pause ratio', () => {
        expect(voiceScores({
            ...baseline,
            pauseRatio: 0.25
        }).pause).toBe(0);
    });

    it('calculates a volume score when volume variation is supplied', () => {
        const scores = voiceScores(baseline, 0.2);

        expect(scores.volume).toBe(80);
        expect(scores.delivery).toBe(97);
    });

    it('rejects missing or invalid metrics', () => {
        expect(() => voiceScores(null)).toThrow();
        expect(() => voiceScores({
            wpm: -1,
            fillerRatio: 0,
            pauseRatio: 0
        })).toThrow();
    });
});
