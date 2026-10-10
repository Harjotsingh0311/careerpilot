import { File } from 'node:buffer';
import Groq from 'groq-sdk';
import { z } from 'zod';
import env from '../config/env.js';
import VoiceSession from '../models/VoiceSession.js';
import { askJSON, consumeAiQuota } from './groqService.js';
import { voiceMetrics, voiceScores } from './voiceMetrics.js';
import {
    buildVoiceTipsSystemPrompt,
    buildVoiceTipsUserPrompt
} from '../prompts/voicePrompts.js';

const tipsSchema = z.object({
    tips: z.array(z.string().trim().min(5).max(220)).length(2)
}).strict();

const supportedTypes = new Set([
    'audio/webm',
    'video/webm',
    'audio/mp4',
    'video/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/ogg'
]);

export class VoiceServiceError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = 'VoiceServiceError';
        this.status = status;
        this.code = code;
    }
}

function fallbackTips(metrics, scores) {
    const tips = [];

    if (metrics.wpm < 110) {
        tips.push('Try speaking at a slightly quicker, steady pace while keeping each word clear.');
    } else if (metrics.wpm > 160) {
        tips.push('Slow down slightly and pause briefly between key points.');
    } else {
        tips.push('Your measured pace is within the target range; maintain it consistently.');
    }

    if (metrics.fillerRatio >= 0.03) {
        tips.push('Replace filler phrases with a short silent pause before your next point.');
    } else if (metrics.pauseRatio > 0.1) {
        tips.push('Organise your answer into clear points to make longer pauses feel more deliberate.');
    } else if (scores.volume !== null && scores.volume < 70) {
        tips.push('Aim for a steadier microphone level and record away from background noise.');
    } else {
        tips.push('Structure your answer as a main point followed by a relevant example.');
    }

    return tips.slice(0, 2);
}

export async function analyzeVoiceRecording({
    userId,
    file,
    volumeCv,
    promptText = ''
}) {
    if (!userId) {
        throw new VoiceServiceError(
            401,
            'AUTH_REQUIRED',
            'Sign in before analysing a recording.'
        );
    }

    if (
        !file?.buffer ||
        !Buffer.isBuffer(file.buffer) ||
        file.buffer.length === 0
    ) {
        throw new VoiceServiceError(
            400,
            'NO_AUDIO',
            'Audio recording is missing. Record an answer and try again.'
        );
    }

    const normalizedMime = String(file.mimetype || '')
        .split(';')[0]
        .trim()
        .toLowerCase();

    if (!supportedTypes.has(normalizedMime)) {
        throw new VoiceServiceError(
            400,
            'UNSUPPORTED_AUDIO_TYPE',
            'Use a WebM or MP4 audio recording supported by your browser.'
        );
    }

    if (file.buffer.length > 8 * 1024 * 1024) {
        throw new VoiceServiceError(
            413,
            'AUDIO_TOO_LARGE',
            'Audio must be 8 MB or smaller.'
        );
    }

    let parsedVolumeCv = null;

    if (volumeCv !== undefined && volumeCv !== null && String(volumeCv).trim() !== '') {
        parsedVolumeCv = Number(volumeCv);

        if (
            !Number.isFinite(parsedVolumeCv) ||
            parsedVolumeCv < 0 ||
            parsedVolumeCv > 10
        ) {
            throw new VoiceServiceError(
                400,
                'INVALID_VOLUME_METRIC',
                'The optional microphone-level measurement is invalid.'
            );
        }
    }

    if (!env.GROQ_API_KEY) {
        throw new VoiceServiceError(
            503,
            'AI_NOT_CONFIGURED',
            'Voice transcription is not configured yet. Please try again later.'
        );
    }

    // Quota is checked before sending audio to the transcription provider.
    await consumeAiQuota(userId);

    const groq = new Groq({ apiKey: env.GROQ_API_KEY });
    const isMp4 = normalizedMime.includes('mp4') ||
        normalizedMime.includes('m4a');

    const audioFile = new File(
        [file.buffer],
        isMp4 ? 'answer.mp4' : 'answer.webm',
        { type: normalizedMime }
    );

    let transcription;

    try {
        transcription = await groq.audio.transcriptions.create({
            file: audioFile,
            model: process.env.GROQ_MODEL_STT || 'whisper-large-v3-turbo',
            response_format: 'verbose_json',
            timestamp_granularities: ['word'],
            language: 'en',
            temperature: 0,
            prompt: 'Umm, let me think, like, hmm... okay. So, uh, here is what I would say.'
        });
    } catch (error) {
        // Never log the recording, transcript, provider payload, or credentials.
        console.error('Voice transcription failed:', error?.name || 'UnknownError');

        throw new VoiceServiceError(
            502,
            'TRANSCRIPTION_FAILED',
            'We could not transcribe this recording. Please try again with a clear recording.'
        );
    }

    const transcript = typeof transcription?.text === 'string'
        ? transcription.text.trim()
        : '';

    const words = Array.isArray(transcription?.words)
        ? transcription.words
        : [];

    if (!transcript || !words.length) {
        throw new VoiceServiceError(
            422,
            'NO_WORD_TIMESTAMPS',
            'The transcription did not contain usable word timestamps. Please record again.'
        );
    }

    const firstStart = words[0]?.start;
    const lastEnd = words[words.length - 1]?.end;

    if (
        Number.isFinite(firstStart) &&
        Number.isFinite(lastEnd) &&
        lastEnd - firstStart > 90
    ) {
        throw new VoiceServiceError(
            422,
            'AUDIO_TOO_LONG',
            'Recordings must be 90 seconds or shorter.'
        );
    }

    const metrics = voiceMetrics(words);

    if (!metrics || metrics.durationSec < 15) {
        throw new VoiceServiceError(
            422,
            'TOO_SHORT',
            'Please speak for at least 15 seconds so we can measure delivery.'
        );
    }

    if (metrics.durationSec > 90) {
        throw new VoiceServiceError(
            422,
            'AUDIO_TOO_LONG',
            'Recordings must be 90 seconds or shorter.'
        );
    }

    const scores = voiceScores(metrics, parsedVolumeCv);

    let tips;
    let tipsSource = 'ai';

    try {
        const result = await askJSON({
            userId,
            system: buildVoiceTipsSystemPrompt(),
            user: buildVoiceTipsUserPrompt({
                transcript,
                metrics,
                scores
            }),
            schema: tipsSchema,
            maxTokens: 350
        });

        tips = result.data.tips;
    } catch {
        // Preserve useful transcription/metrics when the tips model is unavailable.
        tips = fallbackTips(metrics, scores);
        tipsSource = 'fallback';
    }

    // Persist transcript and derived values only: never the audio buffer or File.
    const session = await VoiceSession.create({
        user: userId,
        promptText: String(promptText || '').trim().slice(0, 1200),
        transcript: transcript.slice(0, 20000),
        metrics,
        scores,
        tips,
        tipsSource
    });

    return {
        id: session._id.toString(),
        transcript: session.transcript,
        metrics: session.metrics,
        scores: session.scores,
        tips: session.tips,
        tipsSource: session.tipsSource,
        createdAt: session.createdAt
    };
}
