import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Skill profile API access control', () => {
    it('requires authentication to read a skill profile', async () => {
        const response = await request(app).get('/api/skills/profile');

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });

    it('requires authentication to save a skill profile', async () => {
        const response = await request(app)
            .put('/api/skills/profile')
            .send({ targetRoles: [], skills: [] });

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });
});
