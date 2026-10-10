import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Document API access control', () => {
    it('requires authentication to list documents', async () => {
        const response = await request(app).get('/api/documents');
        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });

    it('requires authentication for pasted resume/JD text', async () => {
        const response = await request(app)
            .post('/api/documents/text')
            .send({
                kind: 'resume',
                text: 'x'.repeat(300)
            });

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });

    it('requires authentication for upload processing', async () => {
        const response = await request(app)
            .post('/api/documents')
            .attach('file', Buffer.from('%PDF fake content'), 'resume.pdf')
            .field('kind', 'resume');

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });

    it('requires authentication for resume/JD analysis', async () => {
        const response = await request(app)
            .post('/api/documents/analyze')
            .send({
                resumeId: '507f1f77bcf86cd799439011',
                jdId: '507f1f77bcf86cd799439012'
            });

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });

    it('requires authentication to delete all document data', async () => {
        const response = await request(app).delete('/api/documents');
        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
    });
});
