const FILLERS = new Set([
    'um', 'uh', 'umm', 'uhh', 'er', 'erm', 'hmm'
]);

const clamp = (value, minimum = 0, maximum = 100) =>
    Math.max(minimum, Math.min(maximum, value));

function validWords(words) {
    if (!Array.isArray(words)) return [];

    return words.filter(word =>
        word &&
        typeof word.word === 'string' &&
        word.word.trim().length > 0 &&
        Number.isFinite(word.start) &&
        Number.isFinite(word.end) &&
        word.start >= 0 &&
        word.end > word.start
    );
}

/**
 * Computes speaking metrics from word-level timestamps returned by Whisper.
 * Returns null when the recording is too short or timestamps are unusable.
 */
export function voiceMetrics(words) {
    const usableWords = validWords(words);

    if (usableWords.length < 20) return null;

    const firstWord = usableWords[0];
    const lastWord = usableWords[usableWords.length - 1];
    const span = lastWord.end - firstWord.start;

    if (!Number.isFinite(span) || span <= 0) return null;

    let longPauses = 0;
    let pauseTime = 0;

    for (let index = 1; index < usableWords.length; index += 1) {
        const gap = usableWords[index].start -
            usableWords[index - 1].end;

        if (gap > 1.0) {
            longPauses += 1;
            pauseTime += gap;
        }
    }

    const fillerCount = usableWords.filter(word => {
        const normalized = word.word
            .toLowerCase()
            .replace(/[^a-z]/g, '');

        return FILLERS.has(normalized);
    }).length;

    return {
        wpm: Math.round(usableWords.length / (span / 60)),
        longPauses,
        pauseRatio: pauseTime / span,
        fillerRatio: fillerCount / usableWords.length,
        fillerCount,
        wordCount: usableWords.length,
        durationSec: Math.round(span)
    };
}

/**
 * Delivery scores are heuristic signals, not measurements of emotion
 * or confidence. volumeCv is optional coefficient of variation.
 */
export function voiceScores(metrics, volumeCv = null) {
    if (
        !metrics ||
        !Number.isFinite(metrics.wpm) ||
        !Number.isFinite(metrics.fillerRatio) ||
        !Number.isFinite(metrics.pauseRatio) ||
        metrics.wpm < 0 ||
        metrics.fillerRatio < 0 ||
        metrics.pauseRatio < 0
    ) {
        throw new TypeError('Valid voice metrics are required.');
    }

    const pace = metrics.wpm >= 110 && metrics.wpm <= 160
        ? 100
        : metrics.wpm < 110
            ? clamp(100 - (110 - metrics.wpm) * 2)
            : clamp(100 - (metrics.wpm - 160) * 2);

    const filler = clamp(100 - metrics.fillerRatio * 1000);
    const pause = clamp(100 - metrics.pauseRatio * 400);

    const validVolumeCv = Number.isFinite(volumeCv) && volumeCv >= 0
        ? volumeCv
        : null;

    const volume = validVolumeCv === null
        ? null
        : clamp(100 - validVolumeCv * 100);

    const parts = [
        [pace, 0.35],
        [filler, 0.30],
        [pause, 0.20],
        [volume, 0.15]
    ].filter(([score]) => score !== null);

    const totalWeight = parts.reduce(
        (sum, [, weight]) => sum + weight,
        0
    );

    const delivery = Math.round(
        parts.reduce(
            (sum, [score, weight]) => sum + score * weight,
            0
        ) / totalWeight
    );

    return {
        pace: Math.round(pace),
        filler: Math.round(filler),
        pause: Math.round(pause),
        volume: volume === null ? null : Math.round(volume),
        delivery
    };
}

export const VOICE_FILLERS = Object.freeze([...FILLERS]);
