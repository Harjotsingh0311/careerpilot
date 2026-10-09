import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('CareerPilot API', () => {
    it('reports API and database status', async () => {
        const response = await request(app).get('/api/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            ok: true,
            data: {
                api: 'online',
                db: expect.any(String)
            }
        });

        expect(['connected', 'down']).toContain(response.body.data.db);
    });

    it('returns 404 for an unknown route', async () => {
        const response = await request(app).get('/api/does-not-exist');

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('rejects invalid registration data before accessing the database', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                displayName: 'A',
                email: 'not-an-email',
                password: 'short'
            });

        expect(response.status).toBe(400);
        expect(response.body.ok).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects login requests with invalid fields', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'invalid',
                password: ''
            });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
});
