import { describe, expect, it } from 'vitest';
import {
    cleanText,
    hashText,
    makeSkillLookup,
    normalizeSkills,
    scanSkillsInText
} from '../src/services/documentUtils.js';
import {
    buildAtsChecks,
    calculateResumeMatch,
    normalizeAiFeedback
} from '../src/services/resumeMetrics.js';

describe('Document text utilities', () => {
    it('collapses excessive whitespace and caps stored text at 20,000 characters', () => {
        expect(cleanText(' line   one \n\n\n line two ')).toBe('line one\n\nline two');
        expect(cleanText('x'.repeat(21000))).toHaveLength(20000);
    });

    it('hashes the same cleaned text consistently', () => {
        expect(hashText('same text')).toBe(hashText('same text'));
        expect(hashText('same text')).not.toBe(hashText('different text'));
    });

    it('normalises known names and aliases to canonical skill names', () => {
        const lookup = makeSkillLookup([
            { name: 'JavaScript', aliases: ['js', 'ecmascript'] },
            { name: 'Python', aliases: ['py'] }
        ]);

        expect(normalizeSkills(['JS', 'javascript', 'py', 'unknown'], lookup))
            .toEqual(['JavaScript', 'Python']);
    });

    it('scans aliases with word boundaries so Java does not match JavaScript', () => {
        const catalog = [
            { name: 'Java', aliases: [], category: 'Programming' },
            { name: 'JavaScript', aliases: ['js'], category: 'Programming' },
            { name: 'Python', aliases: ['py'], category: 'Programming' }
        ];

        expect(scanSkillsInText('Built a JavaScript and Python app.', catalog))
            .toEqual(['JavaScript', 'Python']);
    });

    it('does not scan partial words for Python aliases', () => {
        const catalog = [
            { name: 'Python', aliases: ['py'], category: 'Programming' }
        ];

        expect(scanSkillsInText('The word pythonic is not the Python language.', catalog))
            .toEqual(['Python']);
    });
});

describe('Resume versus job description metrics', () => {
    it('uses the blueprint 75% required and 25% nice-to-have formula', () => {
        const result = calculateResumeMatch(
            ['Python', 'SQL'],
            ['Python', 'SQL'],
            ['Docker', 'AWS']
        );

        expect(result.requiredCoverage).toBe(100);
        expect(result.niceCoverage).toBe(0);
        expect(result.matchPercentage).toBe(75);
        expect(result.missingRequired).toEqual([]);
        expect(result.missingNice).toEqual(['Docker', 'AWS']);
    });

    it('returns zero for a resume that covers none of the extracted JD skills', () => {
        const result = calculateResumeMatch(
            [],
            ['Python', 'SQL'],
            ['Docker']
        );

        expect(result.matchPercentage).toBe(0);
    });

    it('returns a full match when all required and nice-to-have skills are present', () => {
        const result = calculateResumeMatch(
            ['Python', 'SQL', 'Docker'],
            ['Python', 'SQL'],
            ['Docker']
        );

        expect(result.matchPercentage).toBe(100);
    });

    it('produces deterministic ATS checks and a score between zero and 100', () => {
        const match = calculateResumeMatch([], ['Python'], []);
        const result = buildAtsChecks('Short resume text', match);

        expect(result.total).toBe(7);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(result.checks).toHaveLength(7);
    });
});


describe('AI feedback normalization', () => {
    it('normalizes string rewrites returned by an AI model', () => {
        const sourceLines = [
            '- Built a Python project',
            '- Helped with database queries'
        ];

        const result = normalizeAiFeedback({
            explanation: 'Review missing skills.',
            rewrites: [
                'Developed a Python project to solve the stated problem.',
                {
                    improved: 'Assisted with database queries and validated results.',
                    reason: 'Uses a clearer action.'
                }
            ]
        }, sourceLines, 75);

        expect(result.explanation).toBe('Review missing skills.');
        expect(result.rewrites).toHaveLength(2);
        expect(result.rewrites[0].original).toBe(sourceLines[0]);
        expect(result.rewrites[0].improved).toContain('Developed');
        expect(result.rewrites[0].reason).toBeTruthy();
        expect(result.rewrites[1].original).toBe(sourceLines[1]);
    });

    it('caps oversized explanations and rewrite fields to schema limits', () => {
        const result = normalizeAiFeedback({
            explanation: 'x'.repeat(1000),
            rewrites: [{
                improved: 'y'.repeat(500),
                reason: 'z'.repeat(200)
            }]
        }, ['- Original resume bullet'], 60);

        expect(result.explanation).toHaveLength(600);
        expect(result.rewrites).toHaveLength(1);
        expect(result.rewrites[0].improved).toHaveLength(350);
        expect(result.rewrites[0].reason).toHaveLength(150);
        expect(result.rewrites[0].original).toBe('- Original resume bullet');
    });

    it('uses a deterministic explanation and ignores rewrites without source lines', () => {
        const result = normalizeAiFeedback({
            rewrites: ['A rewrite with no original line']
        }, [], 47);

        expect(result.explanation).toContain('47%');
        expect(result.rewrites).toEqual([]);
    });

    it('accepts an empty rewrite list', () => {
        const result = normalizeAiFeedback({
            explanation: 'No truthful rewrite was needed.',
            rewrites: []
        }, ['- Original bullet'], 100);

        expect(result.rewrites).toEqual([]);
    });
});
