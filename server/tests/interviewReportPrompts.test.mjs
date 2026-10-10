import { describe, expect, it } from 'vitest';
import {
    buildInterviewReportSystemPrompt,
    buildInterviewReportUserPrompt
} from '../src/prompts/interviewReportPrompts.js';

describe('Interview report prompt score scale', () => {
    it('defines report scores as percentages out of 100', () => {
        const prompt = buildInterviewReportSystemPrompt();

        expect(prompt).toContain('A score of 10 means 10/100, NOT 10/10.');
        expect(prompt).toContain('Never call a score perfect unless');
        expect(prompt).toContain('communicationScore and correctnessScore');
    });

    it('passes explicit score-scale definitions to the report model', () => {
        const prompt = buildInterviewReportUserPrompt({
            metrics: {
                overallScore: 10,
                categoryScores: { technical: 10 },
                communicationScore: 10,
                correctnessScore: 10,
                completionRate: 100
            },
            strengths: ['A grounded observation'],
            gaps: ['A specific skill gap']
        });

        expect(prompt).toContain('"overallScore":"percentage, 0-100"');
        expect(prompt).toContain('"overallScore":10');
        expect(prompt).toContain('10 means 10%, which is a low score');
        expect(prompt).toContain('"completionRate":100');
    });
});
