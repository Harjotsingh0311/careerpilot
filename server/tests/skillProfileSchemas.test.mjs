import { describe, expect, it } from 'vitest';
import { skillProfileSchema } from '../src/utils/skillProfileSchemas.js';

describe('Skill profile validation', () => {
    it('accepts a valid profile', () => {
        const result = skillProfileSchema.safeParse({
            targetRoles: ['Machine Learning Engineer'],
            skills: [{
                name: 'Python',
                category: 'Programming',
                proficiency: 'Intermediate',
                yearsExperience: 1
            }]
        });

        expect(result.success).toBe(true);
    });

    it('rejects more than five target roles', () => {
        const result = skillProfileSchema.safeParse({
            targetRoles: [
                'Role One', 'Role Two', 'Role Three',
                'Role Four', 'Role Five', 'Role Six'
            ],
            skills: []
        });

        expect(result.success).toBe(false);
    });

    it('rejects unknown proficiency values', () => {
        const result = skillProfileSchema.safeParse({
            targetRoles: [],
            skills: [{
                name: 'Python',
                category: 'Programming',
                proficiency: 'Guru',
                yearsExperience: 1
            }]
        });

        expect(result.success).toBe(false);
    });

    it('strips unrecognised fields rather than accepting ownership from the body', () => {
        const result = skillProfileSchema.safeParse({
            targetRoles: [],
            skills: [],
            userId: 'someone-else'
        });

        expect(result.success).toBe(true);
        expect(result.data).not.toHaveProperty('userId');
    });
});
