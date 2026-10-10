import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Interview API access control', () => {
    it('requires authentication to list interview sessions', async () => {
        const response = await request(app).get('/api/interviews');

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });

    it('requires authentication to create an interview', async () => {
        const response = await request(app)
            .post('/api/interviews')
            .send({
                jdId: '507f1f77bcf86cd799439012',
                role: 'Software Engineer Intern',
                type: 'technical',
                difficulty: 'medium',
                numQuestions: 8
            });

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });

    it('requires authentication to resume an interview', async () => {
        const response = await request(app)
            .get('/api/interviews/507f1f77bcf86cd799439099');

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });

    it('requires authentication to submit an answer', async () => {
        const response = await request(app)
            .post('/api/interviews/507f1f77bcf86cd799439099/answer')
            .send({
                answer: 'An API enables communication between components.',
                mode: 'text'
            });

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });
});

describe('Interview hint and finish access control', () => {
    it('requires authentication to request an interview hint', async () => {
        const response = await request(app)
            .post('/api/interviews/507f1f77bcf86cd799439099/hint');

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });

    it('requires authentication to finish an interview', async () => {
        const response = await request(app)
            .post('/api/interviews/507f1f77bcf86cd799439099/finish');

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });
});
