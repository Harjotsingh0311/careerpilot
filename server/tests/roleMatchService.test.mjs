import { describe, expect, it } from 'vitest';
import {
    calculateRoleMatch,
    normalizeName,
    toSlug
} from '../src/services/roleMatchService.js';

const role = {
    slug: 'machine-learning-engineer',
    title: 'Machine Learning Engineer',
    description: 'Build ML systems.',
    topics: ['ml', 'dsa'],
    skills: [
        { name: 'Python', weight: 5, tier: 'core' },
        { name: 'Machine Learning', weight: 5, tier: 'core' },
        { name: 'Docker', weight: 2, tier: 'plus' }
    ]
};

const catalog = [
    { name: 'Python', aliases: ['py'], topic: null },
    { name: 'Machine Learning', aliases: ['ml'], topic: 'ml' },
    { name: 'Docker', aliases: ['containerization'], topic: null }
];

describe('Role matching', () => {
    it('normalises aliases and role titles consistently', () => {
        expect(normalizeName(' JavaScript ')).toBe('javascript');
        expect(toSlug('Machine learning Engineer')).toBe('machine-learning-engineer');
    });

    it('caps self-rating-only evidence at 70%', () => {
        const result = calculateRoleMatch(role, [
            { name: 'py', proficiency: 'Expert' },
            { name: 'ML', proficiency: 'Expert' },
            { name: 'Docker', proficiency: 'Expert' }
        ], [], catalog);

        expect(result.matchPercentage).toBe(70);
    });

    it('uses assessment proof when a mapped topic is available', () => {
        const result = calculateRoleMatch(role, [
            { name: 'Python', proficiency: 'Expert' },
            { name: 'Machine Learning', proficiency: 'Expert' },
            { name: 'Docker', proficiency: 'Expert' }
        ], [{ topic: 'ml', score: 1 }], catalog);

        // Python and Docker have no mapped proof in this fixture.
        expect(result.matchPercentage).toBeGreaterThan(70);
        expect(result.skillDetails.find(item => item.name === 'Machine Learning').strength).toBe(1);
    });

    it('gives no skills a zero score when no assessment evidence exists', () => {
        const result = calculateRoleMatch(role, [], [], catalog);

        expect(result.matchPercentage).toBe(0);
        expect(result.gaps).toHaveLength(3);
    });

    it('sorts highest-weight skill gaps first', () => {
        const result = calculateRoleMatch(role, [
            { name: 'Python', proficiency: 'Expert' }
        ], [], catalog);

        expect(result.topGaps[0].weight).toBe(5);
        expect(result.topGaps[0].name).toBe('Machine Learning');
    });
});
