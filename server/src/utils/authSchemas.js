import { z } from 'zod';

export const registerSchema = z.object({
    displayName: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(254)
        .transform(value => value.toLowerCase()),
    password: z.string().min(8).max(72)
});

export const loginSchema = z.object({
    email: z.string().trim().email().max(254)
        .transform(value => value.toLowerCase()),
    password: z.string().min(1).max(72)
});
