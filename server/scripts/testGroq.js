import Groq from 'groq-sdk';
import env from '../src/config/env.js';

async function main() {
    const apiKey = env.GROQ_API_KEY?.trim();

    console.log('=== GROQ CONFIGURATION ===');
    console.log('API key loaded:', apiKey ? 'YES' : 'NO');
    console.log('Primary model:', env.GROQ_MODEL_MAIN);
    console.log('Fallback model:', env.GROQ_MODEL_FALLBACK);

    if (!apiKey) {
        console.log('RESULT: GROQ_API_KEY is empty or was not loaded.');
        process.exitCode = 1;
        return;
    }

    const client = new Groq({ apiKey });

    const models = [...new Set([
        env.GROQ_MODEL_MAIN,
        env.GROQ_MODEL_FALLBACK
    ].filter(Boolean))];

    for (const model of models) {
        console.log(`\nTesting model: ${model}`);

        try {
            const response = await client.chat.completions.create({
                model,
                temperature: 0.2,
                max_completion_tokens: 100,
                ...(model.startsWith('openai/gpt-oss') && {
                    reasoning_effort: 'low'
                }),
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'Return a JSON object containing only the boolean field ok.'
                    },
                    {
                        role: 'user',
                        content: 'Return {"ok":true}.'
                    }
                ]
            });

            const content = response.choices?.[0]?.message?.content || '';
            const parsed = JSON.parse(content);

            if (parsed.ok !== true) {
                throw new Error('Model returned unexpected JSON.');
            }

            console.log('RESULT: PASS - valid JSON response received.');
        } catch (error) {
            console.log('RESULT: FAIL');
            console.log('HTTP status:', error.status ?? 'unavailable');
            console.log('Provider error code:', error.code ?? 'unavailable');

            // Print only a short error message, never the key or request content.
            const safeMessage = String(error.message || 'Unknown provider error')
                .replace(/\s+/g, ' ')
                .slice(0, 180);

            console.log('Provider message:', safeMessage);
        }
    }
}

main().catch(error => {
    console.log('Diagnostic failed:', error.name || 'UnknownError');
    process.exitCode = 1;
});
