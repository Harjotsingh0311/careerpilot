import { useEffect, useState } from 'react';
import {
    AudioLines, CheckCircle2, Clock3, FileAudio, Info,
    LoaderCircle, Mic, MicOff, RotateCcw, ShieldCheck,
    Sparkles, Upload
} from 'lucide-react';
import api from '../lib/api';
import { useRecorder } from '../hooks/useRecorder';
import VoiceWaveform from '../components/VoiceWaveform';

const panel = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50';
const primary = `${button} bg-indigo-600 text-white hover:bg-indigo-700`;
const secondary = `${button} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;

const fillerPattern = /^(?:um|uh|umm|uhh|er|erm|hmm)$/i;

function responsePayload(response) {
    return response?.data?.data ?? response?.data ?? {};
}

function messageFromError(error) {
    return error?.response?.data?.error?.message ||
        'Voice analysis failed. Please try again with a clear recording.';
}

function timeLabel(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function highlightTranscript(transcript) {
    const parts = String(transcript || '').split(
        /(\b(?:um|uh|umm|uhh|er|erm|hmm)\b)/gi
    );

    return parts.map((part, index) => {
        const normalized = part.toLowerCase().replace(/[^a-z]/g, '');

        return fillerPattern.test(normalized) ? (
            <mark
                key={`${index}-${part}`}
                className="rounded bg-amber-200 px-0.5 text-amber-950"
                title="Possible filler word"
            >
                {part}
            </mark>
        ) : (
            <span key={`${index}-${part}`}>{part}</span>
        );
    });
}

function MetricCard({ label, value, detail }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                {value}
            </p>
            {detail && <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>}
        </div>
    );
}

function ScoreBar({ label, score }) {
    const value = Number.isFinite(score)
        ? Math.max(0, Math.min(100, score))
        : 0;

    return (
        <div>
            <div className="mb-2 flex justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-700">{label}</span>
                <span className="font-bold tabular-nums text-slate-900">
                    {score == null ? 'N/A' : `${value}/100`}
                </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                    className="h-full rounded-full bg-indigo-600 transition-all"
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}

export default function VoiceLabPage() {
    const recorder = useRecorder(90);

    const [promptText, setPromptText] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [audioUrl, setAudioUrl] = useState('');

    useEffect(() => {
        if (!recorder.blob) {
            setAudioUrl('');
            return undefined;
        }

        const url = URL.createObjectURL(recorder.blob);
        setAudioUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [recorder.blob]);

    async function analyseRecording() {
        if (!recorder.blob) {
            setError('Record an answer before starting analysis.');
            return;
        }

        setBusy(true);
        setError('');
        setResult(null);

        try {
            const form = new FormData();
            const isMp4 = recorder.blob.type.includes('mp4');

            form.append(
                'audio',
                recorder.blob,
                isMp4 ? 'answer.mp4' : 'answer.webm'
            );

            if (promptText.trim()) {
                form.append('promptText', promptText.trim().slice(0, 1200));
            }

            if (Number.isFinite(recorder.volumeCv)) {
                form.append('volumeCv', String(recorder.volumeCv));
            }

            const response = await api.post('/voice/analyze', form);
            setResult(responsePayload(response));
        } catch (analysisError) {
            setError(messageFromError(analysisError));
        } finally {
            setBusy(false);
        }
    }

    function resetRecording() {
        recorder.reset();
        setResult(null);
        setError('');
    }

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white sm:px-8 sm:py-9">
                <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 right-40 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

                <div className="relative max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
                        <AudioLines size={14} /> Phase 8 · Voice practice
                    </div>
                    <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                        Voice Lab
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                        Record a spoken answer and inspect measurable delivery signals: speaking pace, filler words, pauses, and delivery score.
                    </p>
                </div>
            </section>

            {(error || recorder.error) && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {error || recorder.error}
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <section className={panel}>
                    <div className="mb-5">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                            Record an answer
                        </p>
                        <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                            Speak naturally
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Answer a question aloud. The recording limit is 90 seconds; analysis requires at least 15 seconds and enough timestamped words.
                        </p>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="voice-prompt" className="mb-2 block text-sm font-bold text-slate-700">
                            Practice question <span className="font-normal text-slate-400">(optional)</span>
                        </label>
                        <textarea
                            id="voice-prompt"
                            value={promptText}
                            onChange={event => setPromptText(event.target.value.slice(0, 1200))}
                            rows={3}
                            maxLength={1200}
                            placeholder="e.g. Tell me about a project you are proud of."
                            className="w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <VoiceWaveform active={recorder.state === 'recording'} />

                    <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock3 size={17} />
                            {recorder.state === 'recording' ? 'Recording' : 'Recording duration'}
                        </div>
                        <span
                            className={`font-mono text-lg font-extrabold tabular-nums ${
                                recorder.state === 'recording' ? 'text-rose-600' : 'text-slate-900'
                            }`}
                        >
                            {timeLabel(recorder.seconds)} / 01:30
                        </span>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        {recorder.state === 'recording' ? (
                            <button
                                type="button"
                                onClick={recorder.stop}
                                className={`${button} flex-1 bg-rose-600 text-white hover:bg-rose-700`}
                            >
                                <MicOff size={17} /> Stop recording
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setError('');
                                    recorder.start();
                                }}
                                disabled={busy}
                                className={`${primary} flex-1`}
                            >
                                <Mic size={17} />
                                {recorder.state === 'done' ? 'Record again' : 'Start recording'}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={resetRecording}
                            disabled={busy || recorder.state === 'recording'}
                            className={secondary}
                        >
                            <RotateCcw size={16} /> Reset
                        </button>
                    </div>

                    {audioUrl && recorder.state === 'done' && (
                        <div className="mt-5 rounded-xl border border-slate-200 p-4">
                            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                                <FileAudio size={17} /> Recording preview
                            </p>
                            <audio controls src={audioUrl} className="w-full">
                                Your browser cannot play this recording.
                            </audio>

                            <button
                                type="button"
                                onClick={analyseRecording}
                                disabled={busy}
                                className={`${primary} mt-4 w-full`}
                            >
                                {busy
                                    ? <LoaderCircle size={17} className="animate-spin" />
                                    : <Upload size={17} />}
                                {busy ? 'Transcribing and analysing…' : 'Analyse voice recording'}
                            </button>
                        </div>
                    )}

                    <div className="mt-5 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                        <ShieldCheck size={19} className="mt-0.5 shrink-0 text-indigo-700" />
                        <div>
                            <p className="text-sm font-bold text-indigo-950">Audio privacy</p>
                            <p className="mt-1 text-xs leading-5 text-indigo-900">
                                The server processes audio in memory and saves the transcript and measurements—not the audio recording.
                            </p>
                        </div>
                    </div>
                </section>

                <section className={panel}>
                    <div className="mb-5">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                            Your results
                        </p>
                        <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                            Delivery analysis
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Results are based on timestamped speech and explicit heuristic thresholds, not emotion or personality.
                        </p>
                    </div>

                    {!result ? (
                        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                                <AudioLines size={26} />
                            </div>
                            <h3 className="mt-4 font-bold text-slate-800">
                                Your results will appear here
                            </h3>
                            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                Record at least 15 seconds, then analyse it to see your transcript, delivery signals, and coaching tips.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <MetricCard
                                    label="Delivery Score"
                                    value={`${result.scores?.delivery ?? '—'}/100`}
                                    detail="Heuristic composite score"
                                />
                                <MetricCard
                                    label="Speaking pace"
                                    value={`${result.metrics?.wpm ?? '—'} WPM`}
                                    detail="Words per minute"
                                />
                                <MetricCard
                                    label="Long pauses"
                                    value={result.metrics?.longPauses ?? '—'}
                                    detail="Pauses longer than one second"
                                />
                                <MetricCard
                                    label="Filler words"
                                    value={`${result.metrics?.fillerCount ?? 0} (${Math.round((result.metrics?.fillerRatio || 0) * 100)}%)`}
                                    detail="Possible filler words in the transcript"
                                />
                            </div>

                            <div className="space-y-4">
                                <ScoreBar label="Pace" score={result.scores?.pace} />
                                <ScoreBar label="Filler management" score={result.scores?.filler} />
                                <ScoreBar label="Pause management" score={result.scores?.pause} />
                                <ScoreBar label="Volume steadiness" score={result.scores?.volume} />
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-900">Transcript</h3>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Highlighted words are potential fillers. Transcription can omit or misidentify some fillers.
                                </p>
                                <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-800">
                                    {highlightTranscript(result.transcript)}
                                </div>
                            </div>

                            <div>
                                <h3 className="flex items-center gap-2 font-bold text-slate-900">
                                    <Sparkles size={18} className="text-indigo-600" />
                                    Coaching tips
                                </h3>
                                <ol className="mt-3 space-y-3">
                                    {(result.tips || []).map((tip, index) => (
                                        <li key={`${tip}-${index}`} className="flex gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-extrabold text-indigo-700">
                                                {index + 1}
                                            </span>
                                            <p className="text-sm leading-6 text-slate-700">{tip}</p>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <Info size={19} className="mt-0.5 shrink-0 text-amber-800" />
                                <p className="text-xs leading-5 text-amber-900">
                                    Delivery scores are estimates. Accent, background noise, microphone quality, and transcription errors can affect the result. They measure pace, fillers, pauses, and steadiness—not confidence.
                                </p>
                            </div>

                            {result.tipsSource === 'fallback' && (
                                <p className="text-xs text-slate-500">
                                    Coaching tips were generated from the measured signals because AI feedback was unavailable.
                                </p>
                            )}
                        </div>
                    )}
                </section>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                <p>
                    Use results as practice feedback, not as a definitive judgement of speaking ability. Calibrate thresholds with your own recordings before relying on comparisons.
                </p>
            </div>
        </div>
    );
}
