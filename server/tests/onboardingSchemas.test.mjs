import { describe, expect, it } from 'vitest';
import { userProfilePatchSchema } from '../src/utils/userProfileSchemas.js';
import { skillProfileSchema } from '../src/utils/skillProfileSchemas.js';

describe('Onboarding basics validation', () => {
    it('accepts a valid profile update', () => {
        const parsed = userProfilePatchSchema.safeParse({
            displayName: 'Student Name',
            college: 'Example Institute',
            gradYear: 2027
        });

        expect(parsed.success).toBe(true);
    });

    it('allows clearing optional college and graduation year', () => {
        const parsed = userProfilePatchSchema.safeParse({
            college: null,
            gradYear: null
        });

        expect(parsed.success).toBe(true);
    });

    it('rejects empty profile updates', () => {
        expect(userProfilePatchSchema.safeParse({}).success).toBe(false);
    });

    it('does not accept more than three target roles', () => {
        const parsed = skillProfileSchema.safeParse({
            targetRoles: [
                'Machine Learning Engineer',
                'Data Scientist',
                'Software Engineer',
                'Frontend Developer'
            ],
            skills: []
        });

        expect(parsed.success).toBe(false);
    });

    it('accepts a numeric 1-5 self-rating', () => {
        const parsed = skillProfileSchema.safeParse({
            targetRoles: ['Machine Learning Engineer'],
            skills: [{
                name: 'Python',
                category: 'Programming',
                proficiency: 'Advanced',
                level: 4,
                yearsExperience: 2
            }]
        });

        expect(parsed.success).toBe(true);
    });
});
