import Groq from 'groq-sdk';
import { z } from 'zod';
import env from '../src/config/env.js';

const feedbackSchema = z.object({
    explanation: z.string().max(600),
    rewrites: z.array(z.object({
        original: z.string().max(250),
        improved: z.string().max(350),
        reason: z.string().max(150)
    })).max(3).default([])
});

async function main() {
    const client = new Groq({
        apiKey: env.GROQ_API_KEY.trim()
    });

    const models = [
        env.GROQ_MODEL_MAIN,
        env.GROQ_MODEL_FALLBACK
    ].filter(Boolean);

    for (const model of [...new Set(models)]) {
        console.log(`\n=== Testing Resume Lab output schema: ${model} ===`);

        try {
            const response = await client.chat.completions.create({
                model,
                temperature: 0.2,
                max_completion_tokens: 900,
                ...(model.startsWith('openai/gpt-oss') && {
                    reasoning_effort: 'low'
                }),
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: [
                            'You are a resume coach.',
                            'Do not invent experience, tools, metrics, degrees or outcomes.',
                            'Explain a provided skill-match result and suggest up to three truthful bullet rewrites.',
                            'Return JSON containing an explanation string and rewrites array.',
                            'Each rewrite must contain original, improved, and reason strings.',
                            'If no rewrite is suitable, return an empty rewrites array.'
                        ].join(' ')
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            roleTitle: 'Software Engineer',
                            matchPercentage: 75,
                            requiredMatched: ['Python', 'SQL'],
                            missingRequired: ['Docker'],
                            atsChecks: [],
                            weakBulletLines: [
                                '- Worked on a Python project',
                                '- Helped with database queries'
                            ]
                        })
                    }
                ]
            });

            const choice = response.choices?.[0];
            console.log('Finish reason:', choice?.finish_reason ?? 'unknown');

            if (!choice?.message?.content) {
                console.log('FAIL: Model returned no content.');
                continue;
            }

            let json;

            try {
                json = JSON.parse(choice.message.content);
            } catch {
                console.log('FAIL: Response was not valid JSON.');
                continue;
            }

            const result = feedbackSchema.safeParse(json);

            if (result.success) {
                console.log('PASS: Output matches the Resume Lab schema.');
                console.log('Explanation provided:', Boolean(result.data.explanation));
                console.log('Rewrite suggestions:', result.data.rewrites.length);
            } else {
                console.log('FAIL: JSON did not match the expected schema.');
                console.log(
                    'Invalid fields:',
                    result.error.issues.map(issue => ({
                        field: issue.path.join('.'),
                        problem: issue.code
                    }))
                );
            }
        } catch (error) {
            console.log('FAIL: Groq request failed.');
            console.log('HTTP status:', error.status ?? 'unavailable');
            console.log('Error code:', error.code ?? 'unavailable');
            console.log(
                'Message:',
                String(error.message || 'Unknown error').replace(/\s+/g, ' ').slice(0, 180)
            );
        }
    }
}

main().catch(error => {
    console.log('Diagnostic failed:', error.name || 'UnknownError');
    process.exitCode = 1;
});
