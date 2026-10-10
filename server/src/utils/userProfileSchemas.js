import { z } from 'zod';

export const userProfilePatchSchema = z.object({
    displayName: z.string().trim().min(2).max(80).optional(),
    college: z.string().trim().max(120).nullable().optional(),
    gradYear: z.union([
        z.number().int().min(2020).max(2100),
        z.null()
    ]).optional()
}).refine(
    value => Object.keys(value).length > 0,
    'Provide at least one profile field.'
);
