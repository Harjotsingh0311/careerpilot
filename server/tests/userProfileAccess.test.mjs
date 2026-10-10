import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('User profile API access control', () => {
    it('requires authentication to read /api/users/me', async () => {
        const response = await request(app).get('/api/users/me');
        expect(response.status).toBe(401);
    });

    it('requires authentication to update /api/users/me', async () => {
        const response = await request(app)
            .patch('/api/users/me')
            .send({ college: 'Example Institute' });

        expect(response.status).toBe(401);
    });

    it('requires authentication to read the skill catalog', async () => {
        const response = await request(app).get('/api/skills/catalog');
        expect(response.status).toBe(401);
    });
});
