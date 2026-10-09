import { z } from 'zod';

export const skillItemSchema = z.object({
    name: z.string().trim().min(1).max(80),
    category: z.enum([
        'Programming',
        'AI/ML',
        'Data',
        'Web Development',
        'Tools',
        'Soft Skills',
        'Other'
    ]).default('Other'),
    proficiency: z.enum([
        'Beginner',
        'Basic',
        'Intermediate',
        'Advanced',
        'Expert'
    ]).default('Beginner'),
    yearsExperience: z.coerce.number().min(0).max(50).default(0)
});

export const skillProfileSchema = z.object({
    targetRoles: z.array(
        z.string().trim().min(2).max(100)
    ).max(5).default([]),
    skills: z.array(skillItemSchema).max(50).default([])
});
