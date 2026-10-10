import { z } from 'zod';

const reportText = z.string().trim().min(1).max(240);

const threeItems = z.array(reportText).length(3);

export const interviewReportNarrativeSchema = z.object({
    summary: z.string().trim().min(1).max(500).refine(
        value => value.split(/\s+/).filter(Boolean).length <= 60,
        'Summary must contain at most 60 words.'
    ),
    strengths: threeItems,
    improvements: threeItems,
    nextSteps: threeItems
}).strict();
