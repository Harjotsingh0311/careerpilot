import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Dashboard API access control', () => {
    it('requires authentication for summary', async () => {
        const response = await request(app).get('/api/dashboard/summary');

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });

    it('requires authentication for trends', async () => {
        const response = await request(app).get('/api/dashboard/trends?days=14');

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });
});
