import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Assessment API access control', () => {
    it('requires authentication to start an assessment', async () => {
        const response = await request(app)
            .post('/api/assessment/tests')
            .send({
                topics: ['dsa'],
                questionCount: 3,
                durationMinutes: 3
            });

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });

    it('requires authentication to view assessment history', async () => {
        const response = await request(app).get('/api/assessment/history');

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });
});
