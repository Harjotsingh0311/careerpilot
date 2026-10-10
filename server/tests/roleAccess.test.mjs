import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Role API access control', () => {
    it('requires authentication for personalised role matches', async () => {
        const response = await request(app).get('/api/roles/matches');

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });
});
