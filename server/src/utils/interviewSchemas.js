
import { z } from 'zod';

const interviewQuestionSchema = z.object({
    kind: z.enum(['jd', 'resume', 'fundamental', 'behavioral']),
    question: z.string().trim().min(10).max(1200),
    expectedPoints: z.array(
        z.string().trim().min(2).max(200)
    ).min(3).max(5)
}).strict();

export function createQuestionPlanSchema(numQuestions) {
    if (!Number.isInteger(numQuestions) ||
        numQuestions < 5 ||
        numQuestions > 10) {
        throw new Error('numQuestions must be an integer from 5 to 10.');
    }

    return z.object({
        questions: z.array(interviewQuestionSchema).length(numQuestions)
    }).strict();
}
