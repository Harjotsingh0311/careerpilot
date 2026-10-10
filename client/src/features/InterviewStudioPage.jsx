import { useCallback, useEffect, useState } from 'react';
import {
    Activity, ArrowLeft, ArrowRight, BrainCircuit, CheckCircle2,
    CircleHelp, Clock3, FileText, Lightbulb, LoaderCircle,
    MessageSquareText, Play, RefreshCw, Send, Sparkles, Target,
    Trophy
} from 'lucide-react';
import {
    PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
    ResponsiveContainer, Tooltip
} from 'recharts';
import api from '../lib/api';
import { AudioLines, Mic, MicOff } from 'lucide-react';
import { useRecorder } from '../hooks/useRecorder';
import VoiceWaveform from '../components/VoiceWaveform';

const panel = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';
const btn = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50';
const primary = `${btn} bg-indigo-600 text-white hover:bg-indigo-700`;
const secondary = `${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;

function payload(response) {
    return response?.data?.data ?? response?.data ?? {};
}

function errorMessage(error, fallback) {
    return error?.response?.data?.error?.message || fallback;
}

function documentId(document) {
    return String(document?.id ?? document?._id ?? '');
}

function normaliseDocuments(value) {
    const list = Array.isArray(value)
        ? value
        : Array.isArray(value?.documents)
            ? value.documents
            : Array.isArray(value?.items)
                ? value.items
                : [];

    return list.filter(item =>
        ['jd', 'resume'].includes(item?.kind) && documentId(item)
    );
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function SectionTitle({ eyebrow, title, description }) {
    return (
        <div className="mb-5">
            {eyebrow && (
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                    {eyebrow}
                </p>
            )}
            <h2 className="mt-2 text-xl font-extrabold tracking-tight text-slate-900">
                {title}
            </h2>
            {description && (
                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            )}
        </div>
    );
}

function StatusNotice({ error, notice }) {
    if (!error && !notice) return null;

    return (
        <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
            error
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        }`}>
            {error || notice}
        </div>
    );
}

function MetricCard({ label, value, note }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                {value}
            </p>
            {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
        </div>
    );
}

function FeedbackList({ title, items, tone }) {
    const style = tone === 'good'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-amber-200 bg-amber-50 text-amber-900';

    return (
        <div className={`rounded-xl border p-4 ${style}`}>
            <h4 className="text-sm font-bold">{title}</h4>
            {items?.length ? (
                <ul className="mt-2 space-y-2 text-sm">
                    {items.map((item, index) => (
                        <li key={`${item}-${index}`} className="flex gap-2">
                            <span aria-hidden="true">•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-2 text-sm">Nothing recorded for this category.</p>
            )}
        </div>
    );
}

export default function InterviewStudioPage() {
    const [documents, setDocuments] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [jdId, setJdId] = useState('');
    const [resumeId, setResumeId] = useState('');
    const [role, setRole] = useState('');
    const [type, setType] = useState('mixed');
    const [difficulty, setDifficulty] = useState('medium');
    const [numQuestions, setNumQuestions] = useState(8);

    const [view, setView] = useState('setup');
    const [active, setActive] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [answer, setAnswer] = useState('');
    const [answerMode, setAnswerMode] = useState('text');
    const [voiceAnalysis, setVoiceAnalysis] = useState(null);
    const [voiceError, setVoiceError] = useState('');
    const [voicePreviewUrl, setVoicePreviewUrl] = useState('');
    const voiceRecorder = useRecorder(90);
    const [elapsed, setElapsed] = useState(0);
    const [hint, setHint] = useState('');
    const [lastFeedback, setLastFeedback] = useState(null);
    const [pendingNext, setPendingNext] = useState(null);

    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const jobDescriptions = documents.filter(doc => doc.kind === 'jd');
    const resumes = documents.filter(doc => doc.kind === 'resume');

    const loadDocuments = useCallback(async () => {
        const response = await api.get('/documents');
        const list = normaliseDocuments(payload(response));
        setDocuments(list);

        setJdId(current => {
            if (current && list.some(doc => documentId(doc) === current && doc.kind === 'jd')) {
                return current;
            }
            return documentId(list.find(doc => doc.kind === 'jd')) || '';
        });

        setResumeId(current => {
            if (current && list.some(doc => documentId(doc) === current && doc.kind === 'resume')) {
                return current;
            }
            return documentId(list.find(doc => doc.kind === 'resume')) || '';
        });

        return list;
    }, []);

    const loadSessions = useCallback(async () => {
        const response = await api.get('/interviews');
        const result = payload(response);
        const list = Array.isArray(result)
            ? result
            : Array.isArray(result?.sessions)
                ? result.sessions
                : [];

        setSessions(list);
        return list;
    }, []);

    useEffect(() => {
        let mounted = true;

        async function initialise() {
            try {
                const response = await api.get('/documents');
                if (!mounted) return;

                const list = normaliseDocuments(payload(response));
                setDocuments(list);
                setJdId(documentId(list.find(doc => doc.kind === 'jd')));
                setResumeId(documentId(list.find(doc => doc.kind === 'resume')));
            } catch (loadError) {
                if (mounted) {
                    setError(errorMessage(loadError, 'Could not load your saved documents.'));
                }
            }

            try {
                const response = await api.get('/interviews');
                if (!mounted) return;

                const result = payload(response);
                setSessions(Array.isArray(result)
                    ? result
                    : Array.isArray(result?.sessions)
                        ? result.sessions
                        : []);
            } catch {
                // Keep the setup screen usable when history is empty/unavailable.
            }
        }

        initialise();

        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (view !== 'room' || !currentQuestion) return undefined;

        setElapsed(0);
        const timer = window.setInterval(() => {
            setElapsed(value => value + 1);
        }, 1000);

        return () => window.clearInterval(timer);
    }, [view, active?.id, currentQuestion?.idx]);

    useEffect(() => {
        if (!voiceRecorder.blob) {
            setVoicePreviewUrl('');
            return undefined;
        }

        const url = URL.createObjectURL(voiceRecorder.blob);
        setVoicePreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [voiceRecorder.blob]);
    const openSession = useCallback(async (sessionId) => {
        setBusy('open');
        setError('');
        setNotice('');

        try {
            const response = await api.get(`/interviews/${sessionId}`);
            const session = payload(response);
            const turns = Array.isArray(session.turns) ? session.turns : [];
            const next = turns.find(turn =>
                typeof turn.answer !== 'string' || !turn.answer.trim()
            );

            setActive(session);
            setCurrentQuestion(next
                ? { idx: next.idx, kind: next.kind, question: next.question }
                : null);
            setAnswer('');
            setHint('');
            setLastFeedback(null);
            setPendingNext(null);
            setView(session.status === 'completed' ? 'report' : 'room');
        } catch (openError) {
            setError(errorMessage(openError, 'Could not open this interview.'));
        } finally {
            setBusy('');
        }
    }, []);

    async function createSession(event) {
        event.preventDefault();
        setError('');
        setNotice('');

        if (!jdId) {
            setError('Upload or paste a job description in Resume Lab before starting.');
            return;
        }

        setBusy('create');

        try {
            const chosenJD = jobDescriptions.find(doc => documentId(doc) === jdId);
            const selectedRole = role.trim() ||
                chosenJD?.parsed?.roleTitle ||
                chosenJD?.name ||
                'Target role';

            const response = await api.post('/interviews', {
                jdId,
                resumeId: resumeId || null,
                role: selectedRole,
                type,
                difficulty,
                numQuestions: Number(numQuestions)
            });

            const created = payload(response);
            setRole(selectedRole);

            await loadSessions();
            await openSession(created.id);

            setNotice('Interview created. Your questions and answer keys are saved securely.');
        } catch (createError) {
            setError(errorMessage(createError, 'Could not create the interview.'));
        } finally {
            setBusy('');
        }
    }

    async function analyseVoiceAnswer() {
        if (!voiceRecorder.blob) {
            setVoiceError('Record an answer before transcribing it.');
            return;
        }

        setBusy('voice');
        setError('');
        setVoiceError('');

        try {
            const form = new FormData();
            const isMp4 = voiceRecorder.blob.type.includes('mp4');

            form.append(
                'audio',
                voiceRecorder.blob,
                isMp4 ? 'answer.mp4' : 'answer.webm'
            );

            if (currentQuestion?.question) {
                form.append('promptText', currentQuestion.question.slice(0, 1200));
            }

            if (Number.isFinite(voiceRecorder.volumeCv)) {
                form.append('volumeCv', String(voiceRecorder.volumeCv));
            }

            const response = await api.post('/voice/analyze', form);
            const result = payload(response);

            if (typeof result.transcript !== 'string' || !result.transcript.trim()) {
                throw new Error('The recording did not produce a readable transcript.');
            }

            setVoiceAnalysis(result);
            setAnswer(result.transcript);
            setNotice('Voice transcript ready. Review or edit it before submitting your interview answer.');
        } catch (voiceFailure) {
            setVoiceError(errorMessage(
                voiceFailure,
                'Could not transcribe this recording. You can keep using a typed answer.'
            ));
        } finally {
            setBusy('');
        }
    }
    async function submitAnswer(event) {
        event.preventDefault();

        if (!active?.id || !currentQuestion || !answer.trim()) return;

        setBusy('answer');
        setError('');
        setNotice('');

        const submittedQuestion = currentQuestion;

        try {
            const response = await api.post(
                `/interviews/${active.id}/answer`,
                { answer: answer.trim(), mode: answerMode }
            );

            const result = payload(response);

            setLastFeedback({
                question: submittedQuestion,
                answer: answer.trim(),
                evaluation: result.evaluation
            });
            setPendingNext(result.nextQuestion || null);
            setActive(previous => ({
                ...previous,
                progress: result.progress || previous.progress
            }));
            setAnswer('');
            setHint('');
            setAnswerMode('text');
            setVoiceAnalysis(null);
            setVoiceError('');
            voiceRecorder.reset();
            await loadSessions();
        } catch (submitError) {
            setError(errorMessage(submitError, 'Could not evaluate that answer.'));
        } finally {
            setBusy('');
        }
    }

    async function requestHint() {
        if (!active?.id || !currentQuestion) return;

        setBusy('hint');
        setError('');
        setNotice('');

        try {
            const response = await api.post(`/interviews/${active.id}/hint`);
            const result = payload(response);

            setHint(result.hint || 'Explain the core concept and give a relevant example.');
            setNotice(result.xpCharged
                ? `Hint used. ${result.xpCharged} XP deducted.`
                : 'A hint was already used for this question, so there is no additional XP charge.');
        } catch (hintError) {
            setError(errorMessage(hintError, 'Could not retrieve a hint.'));
        } finally {
            setBusy('');
        }
    }

    function continueInterview() {
        if (!pendingNext) {
            setCurrentQuestion(null);
            setLastFeedback(null);
            setView('room');
            return;
        }

        setCurrentQuestion(pendingNext);
        setPendingNext(null);
        setLastFeedback(null);
        setAnswer('');
        setHint('');
        setElapsed(0);
    }

    async function finishInterview() {
        if (!active?.id) return;

        setBusy('finish');
        setError('');
        setNotice('');

        try {
            const response = await api.post(`/interviews/${active.id}/finish`);
            const result = payload(response);

            setActive(previous => ({
                ...previous,
                status: result.status,
                report: result.report
            }));
            setCurrentQuestion(null);
            setView('report');
            setNotice('Interview report saved successfully.');
            await loadSessions();
        } catch (finishError) {
            setError(errorMessage(
                finishError,
                'Could not generate the report. Make sure every question has been answered.'
            ));
        } finally {
            setBusy('');
        }
    }

    function returnToSetup() {
        setActive(null);
        setCurrentQuestion(null);
        setLastFeedback(null);
        setPendingNext(null);
        setHint('');
        setAnswer('');
        setView('setup');
        setError('');
        setNotice('');
    }

    function returnToHistory() {
        setActive(null);
        setCurrentQuestion(null);
        setLastFeedback(null);
        setPendingNext(null);
        setView('history');
        setError('');
        loadSessions().catch(() => {});
    }

    const progress = active?.progress || {
        answered: 0,
        total: active?.config?.numQuestions || numQuestions
    };

    const report = active?.report;
    const radarData = report ? [
        { category: 'Technical', score: report.categoryScores?.technical ?? 0 },
        { category: 'Resume depth', score: report.categoryScores?.resumeDepth ?? 0 },
        { category: 'Behavioral', score: report.categoryScores?.behavioral ?? 0 },
        { category: 'Communication', score: report.communicationScore ?? 0 },
        { category: 'Correctness', score: report.correctnessScore ?? 0 }
    ] : [];

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white sm:px-8 sm:py-9">
                <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 right-40 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

                <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
                            <Sparkles size={14} /> Phase 7 · Interview practice
                        </div>
                        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                            Interview Studio
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                            Practise against a real job description, get structured feedback, and leave with measurable next steps.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button type="button" className={`${btn} border border-white/20 text-white hover:bg-white/10`}
                            onClick={returnToSetup}>
                            <Play size={16} /> New interview
                        </button>
                        <button type="button" className={`${btn} bg-white text-slate-900 hover:bg-indigo-50`}
                            onClick={returnToHistory}>
                            <RefreshCw size={16} /> Session history
                        </button>
                    </div>
                </div>
            </section>

            <StatusNotice error={error} notice={notice} />

            {(view === 'setup' || view === 'history') && (
                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    {view === 'setup' && (
                        <section className={panel}>
                            <SectionTitle
                                eyebrow="Personalised practice"
                                title="Configure your interview"
                                description="Select a saved job description, optionally add your resume, and choose the interview format."
                            />

                            {!jobDescriptions.length ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <p className="font-bold text-amber-900">No saved job descriptions found</p>
                                    <p className="mt-1 text-sm leading-6 text-amber-800">
                                        Add a job description in Resume Lab first. The interview will be based on that saved document.
                                    </p>
                                    <a href="/resume" className="mt-3 inline-flex font-bold text-indigo-700 hover:underline">
                                        Open Resume Lab <ArrowRight size={15} className="ml-1" />
                                    </a>
                                </div>
                            ) : (
                                <form className="space-y-5" onSubmit={createSession}>
                                    <div>
                                        <label htmlFor="interview-jd" className="mb-2 block text-sm font-bold text-slate-700">
                                            Job description <span className="text-rose-600">*</span>
                                        </label>
                                        <select id="interview-jd" value={jdId}
                                            onChange={event => {
                                                const value = event.target.value;
                                                setJdId(value);
                                                const chosen = jobDescriptions.find(doc => documentId(doc) === value);
                                                if (chosen?.parsed?.roleTitle) setRole(chosen.parsed.roleTitle);
                                            }}
                                            required
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                                            {jobDescriptions.map(doc => (
                                                <option key={documentId(doc)} value={documentId(doc)}>
                                                    {doc.name || 'Saved job description'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="interview-resume" className="mb-2 block text-sm font-bold text-slate-700">
                                            Resume <span className="font-normal text-slate-400">(optional)</span>
                                        </label>
                                        <select id="interview-resume" value={resumeId}
                                            onChange={event => setResumeId(event.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                                            <option value="">Continue without a resume</option>
                                            {resumes.map(doc => (
                                                <option key={documentId(doc)} value={documentId(doc)}>
                                                    {doc.name || 'Saved resume'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="interview-role" className="mb-2 block text-sm font-bold text-slate-700">
                                            Target role
                                        </label>
                                        <input id="interview-role" value={role}
                                            onChange={event => setRole(event.target.value)}
                                            maxLength={120} minLength={2} required
                                            placeholder="e.g. Software Engineer Intern"
                                            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="interview-type" className="mb-2 block text-sm font-bold text-slate-700">
                                                Interview type
                                            </label>
                                            <select id="interview-type" value={type}
                                                onChange={event => setType(event.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
                                                <option value="technical">Technical</option>
                                                <option value="hr">HR</option>
                                                <option value="behavioral">Behavioral</option>
                                                <option value="mixed">Mixed</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="interview-difficulty" className="mb-2 block text-sm font-bold text-slate-700">
                                                Difficulty
                                            </label>
                                            <select id="interview-difficulty" value={difficulty}
                                                onChange={event => setDifficulty(event.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
                                                <option value="easy">Easy</option>
                                                <option value="medium">Medium</option>
                                                <option value="hard">Hard</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="interview-count" className="mb-2 block text-sm font-bold text-slate-700">
                                            Number of questions
                                        </label>
                                        <select id="interview-count" value={numQuestions}
                                            onChange={event => setNumQuestions(Number(event.target.value))}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
                                            {[5, 6, 7, 8, 9, 10].map(count => (
                                                <option key={count} value={count}>{count} questions</option>
                                            ))}
                                        </select>
                                        <p className="mt-2 text-xs text-slate-500">
                                            An 8-question session is the recommended acceptance-test flow.
                                        </p>
                                    </div>

                                    <button type="submit" disabled={busy !== '' || !jdId}
                                        className={`${primary} w-full`}>
                                        {busy === 'create'
                                            ? <LoaderCircle size={17} className="animate-spin" />
                                            : <Sparkles size={17} />}
                                        {busy === 'create' ? 'Creating question plan…' : 'Create interview'}
                                    </button>
                                </form>
                            )}
                        </section>
                    )}

                    <section className={panel}>
                        <SectionTitle
                            eyebrow="Pick up where you left off"
                            title="Your interview sessions"
                            description="Sessions are saved by the backend. Resume an unfinished session after a page refresh."
                        />

                        {sessions.length ? (
                            <div className="space-y-3">
                                {sessions.map(session => (
                                    <div key={session.id}
                                        className="rounded-xl border border-slate-200 p-4 transition hover:border-indigo-200">
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-700">
                                                <MessageSquareText size={19} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="truncate font-bold text-slate-900">
                                                    {session.role || 'Interview session'}
                                                </h3>
                                                <p className="mt-1 text-xs capitalize text-slate-500">
                                                    {session.type} · {session.difficulty} · {session.progress?.answered || 0}/{session.progress?.total || 0} answered
                                                </p>
                                                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                    <div className="h-full rounded-full bg-indigo-600"
                                                        style={{
                                                            width: `${session.progress?.total
                                                                ? Math.min(100, (session.progress.answered / session.progress.total) * 100)
                                                                : 0}%`
                                                        }} />
                                                </div>
                                            </div>
                                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                                session.status === 'completed'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-amber-50 text-amber-800'
                                            }`}>
                                                {session.status === 'completed' ? 'Completed' : 'In progress'}
                                            </span>
                                        </div>
                                        <button type="button" disabled={busy !== ''}
                                            onClick={() => openSession(session.id)}
                                            className={`${secondary} mt-4 w-full`}>
                                            {session.status === 'completed' ? 'View report' : 'Resume interview'}
                                            <ArrowRight size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                                <FileText size={25} className="mx-auto text-slate-400" />
                                <p className="mt-3 font-bold text-slate-800">No sessions yet</p>
                                <p className="mt-1 text-sm text-slate-500">
                                    Set up your first interview to see your saved progress here.
                                </p>
                            </div>
                        )}

                        <button type="button" onClick={() => {
                            setBusy('refresh');
                            Promise.all([loadDocuments(), loadSessions()])
                                .then(() => setNotice('Documents and session history refreshed.'))
                                .catch(loadError => setError(errorMessage(loadError, 'Refresh failed.')))
                                .finally(() => setBusy(''));
                        }} disabled={busy !== ''} className={`${secondary} mt-4 w-full`}>
                            <RefreshCw size={16} className={busy === 'refresh' ? 'animate-spin' : ''} />
                            Refresh saved data
                        </button>
                    </section>
                </div>
            )}

            {view === 'room' && active && (
                <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
                    <section className="space-y-5">
                        <div className={`${panel} text-center`}>
                            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 via-violet-500 to-cyan-400 shadow-xl shadow-indigo-200">
                                <BrainCircuit size={42} className="text-white" />
                            </div>
                            <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                                Your interviewer
                            </p>
                            <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                                Stay structured. Be specific.
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Explain your reasoning, use examples, and be accurate about what you have done.
                            </p>
                        </div>

                        <div className={panel}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                    <Activity size={17} className="text-indigo-600" /> Interview progress
                                </div>
                                <span className="text-xs font-bold text-slate-500">
                                    {progress.answered}/{progress.total}
                                </span>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2" aria-label="Question progress">
                                {Array.from({ length: progress.total || 0 }, (_, index) => (
                                    <span key={index}
                                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                                            index < progress.answered
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : currentQuestion?.idx === index
                                                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                                                    : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        {index < progress.answered ? <CheckCircle2 size={16} /> : index + 1}
                                    </span>
                                ))}
                            </div>

                            <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Clock3 size={16} /> Time on this question
                                </div>
                                <span className="font-mono text-base font-bold text-slate-900">
                                    {formatTime(elapsed)}
                                </span>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-white p-2 text-indigo-700">
                                    <Target size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">A useful answer structure</h3>
                                    <p className="mt-1 text-sm leading-6 text-slate-600">
                                        For experience-based questions, describe the situation, your task, the actions you took, and the result.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className={panel}>
                        {lastFeedback ? (
                            <div>
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                                    <CheckCircle2 size={16} /> Answer evaluated
                                </div>
                                <h2 className="mt-3 text-xl font-extrabold text-slate-900">
                                    Your feedback
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    {lastFeedback.question?.question}
                                </p>

                                <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-slate-950 p-5 text-white sm:flex-row sm:items-center">
                                    <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-4 border-indigo-400">
                                        <span className="text-2xl font-extrabold">
                                            {lastFeedback.evaluation?.score ?? '—'}
                                        </span>
                                        <span className="text-[10px] text-slate-300">/ 10</span>
                                    </div>
                                    <div>
                                        <p className="font-bold">Answer score</p>
                                        <p className="mt-1 text-sm leading-6 text-slate-300">
                                            Use the feedback to improve the next answer. Scores are stored with your session.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <FeedbackList title="Strengths"
                                        items={lastFeedback.evaluation?.strengths} tone="good" />
                                    <FeedbackList title="Areas to improve"
                                        items={lastFeedback.evaluation?.gaps} tone="needs-work" />
                                </div>

                                <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                                    <div className="flex items-center gap-2 font-bold text-indigo-900">
                                        <Lightbulb size={17} /> Coaching tip
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-indigo-900">
                                        {lastFeedback.evaluation?.tip || 'Add a concrete example and explain your reasoning.'}
                                    </p>
                                </div>

                                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                    {pendingNext ? (
                                        <button type="button" onClick={continueInterview}
                                            className={`${primary} flex-1`}>
                                            Next question <ArrowRight size={17} />
                                        </button>
                                    ) : (
                                        <button type="button" onClick={finishInterview}
                                            disabled={busy !== ''}
                                            className={`${primary} flex-1`}>
                                            {busy === 'finish'
                                                ? <LoaderCircle size={17} className="animate-spin" />
                                                : <Trophy size={17} />}
                                            {busy === 'finish' ? 'Generating report…' : 'Finish and view report'}
                                        </button>
                                    )}
                                    <button type="button" onClick={returnToHistory}
                                        className={secondary}>
                                        Exit to history
                                    </button>
                                </div>
                            </div>
                        ) : currentQuestion ? (
                            <div>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold capitalize text-indigo-700">
                                        {currentQuestion.kind || 'interview'} question
                                    </span>
                                    <span className="text-xs font-semibold text-slate-500">
                                        Question {(currentQuestion.idx ?? 0) + 1}
                                    </span>
                                </div>

                                <h2 className="mt-5 text-2xl font-extrabold leading-tight tracking-tight text-slate-900">
                                    {currentQuestion.question}
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-slate-500">
                                    Take a moment to structure your answer. Your response is saved when you submit it.
                                </p>

                                <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAnswerMode('text');
                                            setVoiceError('');
                                            voiceRecorder.reset();
                                            setVoiceAnalysis(null);
                                        }}
                                        className={`rounded-lg px-3 py-2.5 text-xs font-bold ${
                                            answerMode === 'text'
                                                ? 'bg-white text-indigo-700 shadow-sm'
                                                : 'text-slate-500'
                                        }`}
                                    >
                                        Type answer
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAnswerMode('voice');
                                            setAnswer('');
                                            setVoiceError('');
                                            setVoiceAnalysis(null);
                                            voiceRecorder.reset();
                                        }}
                                        className={`rounded-lg px-3 py-2.5 text-xs font-bold ${
                                            answerMode === 'voice'
                                                ? 'bg-white text-indigo-700 shadow-sm'
                                                : 'text-slate-500'
                                        }`}
                                    >
                                        <Mic size={14} className="mr-1 inline" />
                                        Voice answer
                                    </button>
                                </div>
                                <form onSubmit={submitAnswer} className="mt-6 space-y-4">
                                    {answerMode === 'voice' && (
                                        <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">
                                                    Record your answer
                                                </p>
                                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                                    Maximum 90 seconds. After transcription, review the text before submitting it for interview evaluation.
                                                </p>
                                            </div>

                                            <VoiceWaveform active={voiceRecorder.state === 'recording'} />

                                            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                                <span>{voiceRecorder.state === 'recording' ? 'Recording…' : 'Voice recorder'}</span>
                                                <span className="font-mono">
                                                    {String(Math.floor(voiceRecorder.seconds / 60)).padStart(2, '0')}:{String(voiceRecorder.seconds % 60).padStart(2, '0')} / 01:30
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {voiceRecorder.state === 'recording' ? (
                                                    <button
                                                        type="button"
                                                        onClick={voiceRecorder.stop}
                                                        className={`${btn} bg-rose-600 text-white hover:bg-rose-700`}
                                                    >
                                                        <MicOff size={16} /> Stop recording
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setVoiceError('');
                                                            voiceRecorder.start();
                                                        }}
                                                        disabled={busy !== ''}
                                                        className={secondary}
                                                    >
                                                        <Mic size={16} />
                                                        {voiceRecorder.state === 'done' ? 'Record again' : 'Start recording'}
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={analyseVoiceAnswer}
                                                    disabled={!voiceRecorder.blob || busy !== '' || voiceRecorder.state === 'recording'}
                                                    className={primary}
                                                >
                                                    {busy === 'voice'
                                                        ? <LoaderCircle size={16} className="animate-spin" />
                                                        : <AudioLines size={16} />}
                                                    {busy === 'voice' ? 'Transcribing…' : 'Transcribe recording'}
                                                </button>
                                            </div>

                                            {voicePreviewUrl && voiceRecorder.state === 'done' && (
                                                <audio
                                                    controls
                                                    src={voicePreviewUrl}
                                                    className="w-full"
                                                >
                                                    Your browser cannot play this recording.
                                                </audio>
                                            )}

                                            {(voiceError || voiceRecorder.error) && (
                                                <p role="alert" className="text-xs leading-5 text-rose-700">
                                                    {voiceError || voiceRecorder.error}
                                                </p>
                                            )}

                                            {voiceAnalysis && (
                                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                                    <p className="text-sm font-bold text-emerald-900">
                                                        <CheckCircle2 size={15} className="mr-1 inline" />
                                                        Transcription ready
                                                    </p>
                                                    <p className="mt-1 text-xs leading-5 text-emerald-800">
                                                        {voiceAnalysis.metrics?.wpm ?? '—'} WPM · {voiceAnalysis.metrics?.longPauses ?? '—'} long pauses · Delivery score {voiceAnalysis.scores?.delivery ?? '—'}/100
                                                    </p>
                                                    <p className="mt-1 text-xs leading-5 text-emerald-800">
                                                        The transcript is in the answer field below. Review it before submitting.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div>
                                        <label htmlFor="interview-answer"
                                            className="mb-2 block text-sm font-bold text-slate-700">
                                            Your answer
                                        </label>
                                        <textarea id="interview-answer"
                                            value={answer}
                                            onChange={event => setAnswer(event.target.value.slice(0, 10000))}
                                            rows={9} maxLength={10000} required
                                            placeholder="Explain your approach. Include a concrete example where relevant…"
                                            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                                        <div className="mt-1 flex justify-between text-xs text-slate-400">
                                            <span>{answer.trim() ? answer.trim().split(/\s+/).length : 0} words</span>
                                            <span>{answer.length}/10,000 characters</span>
                                        </div>
                                    </div>

                                    {hint && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                            <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
                                                <Lightbulb size={17} /> Hint
                                            </p>
                                            <p className="mt-2 text-sm leading-6 text-amber-900">{hint}</p>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <button type="submit"
                                            disabled={!answer.trim() || busy !== '' || (answerMode === 'voice' && !voiceAnalysis?.transcript)}
                                            className={`${primary} flex-1`}>
                                            {busy === 'answer'
                                                ? <LoaderCircle size={17} className="animate-spin" />
                                                : <Send size={16} />}
                                            {busy === 'answer' ? 'Evaluating answer…' : 'Submit answer'}
                                        </button>
                                        <button type="button" onClick={requestHint}
                                            disabled={busy !== ''}
                                            className={secondary}>
                                            {busy === 'hint'
                                                ? <LoaderCircle size={17} className="animate-spin" />
                                                : <CircleHelp size={17} />}
                                            Use hint (5 XP)
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="py-10 text-center">
                                <CheckCircle2 size={36} className="mx-auto text-emerald-600" />
                                <h2 className="mt-4 text-xl font-extrabold text-slate-900">
                                    All questions answered
                                </h2>
                                <p className="mt-2 text-sm text-slate-500">
                                    Generate your final report to see your measured performance.
                                </p>
                                <button type="button" onClick={finishInterview}
                                    disabled={busy !== ''}
                                    className={`${primary} mt-5`}>
                                    <Trophy size={17} /> Finish interview
                                </button>
                            </div>
                        )}
                    </section>
                </div>
            )}

            {view === 'report' && report && (
                <div className="space-y-6">
                    <section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-200">
                            <Trophy size={16} /> Interview completed
                        </div>
                        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                            Your performance report
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                            {report.summary}
                        </p>
                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-xs text-slate-300">Overall score</p>
                                <p className="mt-1 text-3xl font-extrabold">{report.overallScore ?? 0}<span className="text-base text-slate-400">/100</span></p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-xs text-slate-300">Completion rate</p>
                                <p className="mt-1 text-3xl font-extrabold">{report.completionRate ?? 0}%</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-xs text-slate-300">XP earned</p>
                                <p className="mt-1 text-3xl font-extrabold">+{report.xpAwarded ?? 0}</p>
                            </div>
                        </div>
                    </section>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricCard label="Technical" value={report.categoryScores?.technical == null ? 'N/A' : `${report.categoryScores.technical}/100`} />
                        <MetricCard label="Resume depth" value={report.categoryScores?.resumeDepth == null ? 'N/A' : `${report.categoryScores.resumeDepth}/100`} />
                        <MetricCard label="Behavioral" value={report.categoryScores?.behavioral == null ? 'N/A' : `${report.categoryScores.behavioral}/100`} />
                        <MetricCard label="Communication" value={`${report.communicationScore ?? 0}/100`} />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <section className={panel}>
                            <SectionTitle title="Performance radar"
                                description="Scores are computed from your evaluated answers, not invented by the report narrative." />
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={radarData} outerRadius="70%">
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="category" tick={{ fill: '#475569', fontSize: 11 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <Radar dataKey="score" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.25} />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <MetricCard label="Correctness" value={`${report.correctnessScore ?? 0}/100`} />
                                <MetricCard label="Answered" value={`${report.questionsAnswered ?? 0}/${report.questionsTotal ?? 0}`} />
                            </div>
                        </section>

                        <section className={`${panel} space-y-4`}>
                            <SectionTitle title="Your next steps"
                                description="Use these recommendations as a practical follow-up plan." />
                            <FeedbackList title="Strengths" items={report.strengths} tone="good" />
                            <FeedbackList title="Improvements" items={report.improvements} tone="needs-work" />
                            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                                <h3 className="font-bold text-indigo-950">Action list</h3>
                                <ol className="mt-3 space-y-3 text-sm text-indigo-950">
                                    {(report.nextSteps || []).map((item, index) => (
                                        <li key={`${item}-${index}`} className="flex gap-3">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-extrabold">
                                                {index + 1}
                                            </span>
                                            <span className="leading-6">{item}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </section>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button type="button" className={primary} onClick={returnToSetup}>
                            <Play size={17} /> Start another interview
                        </button>
                        <button type="button" className={secondary} onClick={returnToHistory}>
                            Session history <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {view === 'report' && !report && (
                <section className={`${panel} text-center`}>
                    <LoaderCircle size={25} className="mx-auto animate-spin text-indigo-600" />
                    <p className="mt-3 text-sm text-slate-500">Loading saved interview report…</p>
                    <button type="button" onClick={returnToHistory} className={`${secondary} mt-4`}>
                        <ArrowLeft size={16} /> Back to history
                    </button>
                </section>
            )}
        </div>
    );
}
