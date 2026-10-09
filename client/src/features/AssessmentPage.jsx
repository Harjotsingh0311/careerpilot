import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronLeft,
    ChevronRight, Clock3, Flag, History, LoaderCircle, Play,
    RefreshCw, Save, Target, Trophy
} from 'lucide-react';
import api from '../lib/api';

const TOPICS = [
    { id: 'dsa', label: 'Data Structures & Algorithms' },
    { id: 'dbms', label: 'Database Management Systems' },
    { id: 'os', label: 'Operating Systems' },
    { id: 'cn', label: 'Computer Networks' },
    { id: 'oop', label: 'Object-Oriented Programming' },
    { id: 'sql', label: 'SQL' },
    { id: 'aptitude', label: 'Aptitude' },
    { id: 'web', label: 'Web Basics' },
    { id: 'ml', label: 'Machine Learning' },
];

const PANEL = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';
const BUTTON = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50';

function formatTime(totalSeconds) {
    const safe = Math.max(0, totalSeconds);
    const mins = Math.floor(safe / 60).toString().padStart(2, '0');
    const secs = (safe % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

function readableTopic(topic) {
    return TOPICS.find(item => item.id === topic)?.label || topic;
}

function ErrorBanner({ children }) {
    if (!children) return null;

    return (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
            {children}
        </div>
    );
}

function ResultView({ result, onRetake, history, mastery, onViewResult }) {
    const questions = result?.questions || [];
    const total = result?.totalQuestions ?? questions.length;
    const correct = result?.correctCount ?? questions.filter(question => question.isCorrect).length;
    const score = result?.score ?? 0;

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-9">
                <div className="absolute -right-16 -top-20 h-60 w-60 rounded-full bg-indigo-500/30 blur-3xl" />
                <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-indigo-300/30 bg-white/5">
                        <div className="text-center">
                            <div className="text-3xl font-extrabold">{score}%</div>
                            <div className="text-[10px] text-slate-300">SCORE</div>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-indigo-200">
                            <Trophy size={17} /> Assessment complete
                        </div>
                        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Your results</h1>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                            You answered {correct} out of {total} questions correctly.
                            Your answers and explanations are available below.
                        </p>
                        <div className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold">
                            +{result?.xpEarned ?? 0} XP earned
                        </div>
                    </div>
                </div>
            </section>

            <section className={PANEL}>
                <h2 className="text-lg font-bold text-slate-900">Topic performance</h2>
                <p className="mt-1 text-sm text-slate-500">Your score for each topic in this attempt.</p>

                <div className="mt-5 space-y-5">
                    {(result?.topicBreakdown || []).map(item => (
                        <div key={item.topic}>
                            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                                <span className="font-semibold text-slate-700">{readableTopic(item.topic)}</span>
                                <span className="tabular-nums text-slate-500">
                                    {item.correct}/{item.total} · {item.score}%
                                </span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-indigo-600 transition-all"
                                    style={{ width: `${item.score}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className={PANEL}>
                <h2 className="text-lg font-bold text-slate-900">Review your answers</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Learn from both correct and incorrect answers.
                </p>

                <div className="mt-5 space-y-5">
                    {questions.map((question, index) => (
                        <article
                            key={question.questionId}
                            className={`rounded-2xl border p-4 sm:p-5 ${
                                question.isCorrect
                                    ? 'border-emerald-200 bg-emerald-50/40'
                                    : 'border-rose-200 bg-rose-50/30'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Question {index + 1} · {readableTopic(question.topic)}
                                </div>
                                {question.isCorrect
                                    ? <CheckCircle2 size={19} className="shrink-0 text-emerald-600" />
                                    : <Target size={19} className="shrink-0 text-rose-500" />
                                }
                            </div>

                            <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">
                                {question.text}
                            </p>

                            <div className="mt-4 space-y-2">
                                {question.options.map((option, optionIndex) => {
                                    const isAnswer = optionIndex === question.correctIndex;
                                    const wasChosen = optionIndex === question.chosenIndex;

                                    return (
                                        <div
                                            key={`${question.questionId}-${optionIndex}`}
                                            className={`rounded-xl border px-3 py-3 text-sm ${
                                                isAnswer
                                                    ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                                                    : wasChosen
                                                        ? 'border-rose-300 bg-rose-100 text-rose-900'
                                                        : 'border-slate-200 bg-white text-slate-600'
                                            }`}
                                        >
                                            <span className="mr-2 font-bold">
                                                {String.fromCharCode(65 + optionIndex)}.
                                            </span>
                                            {option}
                                            {isAnswer && <span className="ml-2 text-xs font-bold">Correct answer</span>}
                                            {wasChosen && !isAnswer && <span className="ml-2 text-xs font-bold">Your answer</span>}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Explanation
                                </div>
                                <p className="mt-2 text-sm leading-6 text-slate-700">
                                    {question.explanation}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className={PANEL}>
                <h2 className="text-lg font-bold text-slate-900">Your topic mastery</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Mastery is a moving estimate; one test does not define your ability.
                </p>
                {mastery.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">Mastery data is not available yet.</p>
                ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        {mastery.map(item => (
                            <div key={item.topic}>
                                <div className="mb-2 flex justify-between gap-2 text-xs">
                                    <span className="font-semibold text-slate-700">{readableTopic(item.topic)}</span>
                                    <span className="text-slate-500">
                                        {Math.round(item.score * 100)}% · {item.attempts} answers
                                    </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full bg-violet-500"
                                        style={{ width: `${Math.round(item.score * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className={PANEL}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-bold text-slate-900">Keep improving</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Revisit topics where you missed questions before trying again.
                        </p>
                    </div>
                    <button onClick={onRetake} className={`${BUTTON} bg-indigo-600 text-white hover:bg-indigo-700`}>
                        <RefreshCw size={16} /> New assessment
                    </button>
                </div>
            </section>

            {history.length > 0 && (
                <section className={PANEL}>
                    <h2 className="text-lg font-bold text-slate-900">Recent attempts</h2>
                    <div className="mt-4 divide-y divide-slate-100">
                        {history.map(item => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onViewResult(item.id)}
                                className="flex w-full items-center justify-between gap-4 py-4 text-left transition hover:bg-slate-50"
                            >
                                <div>
                                    <div className="text-sm font-semibold text-slate-800">
                                        {item.topics.map(readableTopic).join(', ')}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">
                                        {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : 'Completed'}
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="font-bold text-indigo-700">{item.score}%</div>
                                    <div className="text-xs text-slate-400">{item.questionCount} questions</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

export default function AssessmentPage() {
    const [phase, setPhase] = useState('setup');
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [attempt, setAttempt] = useState(null);
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [mastery, setMastery] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState(TOPICS.map(item => item.id));
    const [questionCount, setQuestionCount] = useState(10);
    const [durationMinutes, setDurationMinutes] = useState(10);
    const [answers, setAnswers] = useState({});
    const [flags, setFlags] = useState({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [saveState, setSaveState] = useState('All changes saved');

    const saveQueue = useRef(Promise.resolve());
    const saveVersion = useRef(0);
    const submitLock = useRef(false);
    const autoSubmitTriggered = useRef(false);
    const questionStartedAt = useRef(Date.now());

    const loadHistoryAndMastery = useCallback(async () => {
        const [historyResponse, masteryResponse] = await Promise.all([
            api.get('/assessment/history'),
            api.get('/assessment/mastery')
        ]);

        setHistory(historyResponse.data.data.attempts || []);
        setMastery(masteryResponse.data.data.topics || []);
    }, []);

    useEffect(() => {
        let active = true;

        async function initialise() {
            setLoading(true);
            setError('');

            try {
                const [activeResponse, historyResponse, masteryResponse] = await Promise.all([
                    api.get('/assessment/tests/active'),
                    api.get('/assessment/history'),
                    api.get('/assessment/mastery')
                ]);

                if (!active) return;

                setHistory(historyResponse.data.data.attempts || []);
                setMastery(masteryResponse.data.data.topics || []);

                const savedAttempt = activeResponse.data.data.attempt;

                if (savedAttempt) {
                    setAttempt(savedAttempt);
                    setSelectedTopics(savedAttempt.topics);
                    setDurationMinutes(Math.max(1, Math.round(savedAttempt.durationSeconds / 60)));
                    setQuestionCount(savedAttempt.questions.length);

                    const restoredAnswers = {};
                    const restoredFlags = {};

                    savedAttempt.questions.forEach(question => {
                        if (question.chosenIndex !== null && question.chosenIndex !== undefined) {
                            restoredAnswers[question.questionId] = question.chosenIndex;
                        }

                        if (question.flagged) {
                            restoredFlags[question.questionId] = true;
                        }
                    });

                    setAnswers(restoredAnswers);
                    setFlags(restoredFlags);
                    setTabSwitchCount(savedAttempt.tabSwitchCount || 0);

                    const firstUnanswered = savedAttempt.questions.findIndex(
                        question => question.chosenIndex === null || question.chosenIndex === undefined
                    );

                    setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
                    setPhase('quiz');
                }
            } catch (requestError) {
                if (active) {
                    setError(
                        requestError.response?.data?.error?.message ||
                        'Could not load assessments. Confirm that the backend is running and the question bank is seeded.'
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        initialise();

        return () => { active = false; };
    }, []);

    const queueSave = useCallback((payload) => {
        if (!attempt) return Promise.resolve();

        const version = ++saveVersion.current;
        setSaveState('Saving answers...');

        const task = saveQueue.current
            .catch(() => {})
            .then(() => api.put(`/assessment/tests/${attempt.id}/answers`, payload));

        saveQueue.current = task;

        task.then(() => {
            if (version === saveVersion.current) setSaveState('All changes saved');
        }).catch(requestError => {
            if (version === saveVersion.current) {
                setSaveState('Save failed');
                setError(
                    requestError.response?.data?.error?.message ||
                    'An answer could not be saved. Check your connection and try again.'
                );
            }
        });

        return task;
    }, [attempt]);

    const submitAttempt = useCallback(async (automatic = false) => {
        if (!attempt || submitLock.current || phase !== 'quiz') return;

        submitLock.current = true;
        setSubmitting(true);
        setError('');

        try {
            await saveQueue.current;

            const response = await api.post(`/assessment/tests/${attempt.id}/submit`);
            const finalResult = response.data.data.result;

            setResult(finalResult);
            setPhase('result');
            setMessage(automatic ? 'Time ended. Your assessment was submitted.' : '');
            await loadHistoryAndMastery();
        } catch (requestError) {
            setError(
                requestError.response?.data?.error?.message ||
                'Could not submit the assessment. Check your connection and retry.'
            );
        } finally {
            setSubmitting(false);
            submitLock.current = false;
        }
    }, [attempt, phase, loadHistoryAndMastery]);

    useEffect(() => {
        if (phase !== 'quiz' || !attempt) return undefined;

        const updateTime = () => {
            const deadline = new Date(attempt.startedAt).getTime() +
                attempt.durationSeconds * 1000;
            const remaining = Math.ceil((deadline - Date.now()) / 1000);

            setSecondsLeft(Math.max(0, remaining));

            if (remaining <= 0 && !autoSubmitTriggered.current) {
                autoSubmitTriggered.current = true;
                void submitAttempt(true);
            }
        };

        updateTime();
        const timer = window.setInterval(updateTime, 1000);

        return () => window.clearInterval(timer);
    }, [phase, attempt, submitAttempt]);

    useEffect(() => {
        if (phase !== 'quiz' || !attempt) return undefined;

        const trackVisibility = () => {
            if (!document.hidden) return;

            setTabSwitchCount(previous => {
                const next = previous + 1;
                void queueSave({ answers: [], tabSwitchCount: next });
                return next;
            });
        };

        document.addEventListener('visibilitychange', trackVisibility);

        return () => {
            document.removeEventListener('visibilitychange', trackVisibility);
        };
    }, [phase, attempt, queueSave]);

    useEffect(() => {
        if (phase !== 'quiz' || !attempt) return undefined;

        function onKeyDown(event) {
            const target = event.target;
            if (
                target instanceof HTMLElement &&
                ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)
            ) {
                return;
            }

            if (['1', '2', '3', '4'].includes(event.key)) {
                chooseAnswer(Number(event.key) - 1);
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                moveTo(currentIndex + 1);
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                moveTo(currentIndex - 1);
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    });

    const questions = attempt?.questions || [];
    const currentQuestion = questions[currentIndex];

    function chooseAnswer(optionIndex) {
        if (!currentQuestion || submitting) return;

        const questionId = currentQuestion.questionId;
        setAnswers(previous => ({ ...previous, [questionId]: optionIndex }));
        setError('');

        void queueSave({
            answers: [{
                questionId,
                chosenIndex: optionIndex,
                flagged: Boolean(flags[questionId]),
                timeMs: Math.max(0, Date.now() - questionStartedAt.current)
            }],
            tabSwitchCount
        });
    }

    function toggleFlag() {
        if (!currentQuestion) return;

        const questionId = currentQuestion.questionId;
        const next = !flags[questionId];

        setFlags(previous => ({ ...previous, [questionId]: next }));

        void queueSave({
            answers: [{
                questionId,
                chosenIndex: answers[questionId] ?? null,
                flagged: next,
                timeMs: Math.max(0, Date.now() - questionStartedAt.current)
            }],
            tabSwitchCount
        });
    }

    function moveTo(nextIndex) {
        if (!currentQuestion || nextIndex < 0 || nextIndex >= questions.length) return;

        void queueSave({
            answers: [{
                questionId: currentQuestion.questionId,
                chosenIndex: answers[currentQuestion.questionId] ?? null,
                flagged: Boolean(flags[currentQuestion.questionId]),
                timeMs: Math.max(0, Date.now() - questionStartedAt.current)
            }],
            tabSwitchCount
        });

        questionStartedAt.current = Date.now();
        setCurrentIndex(nextIndex);
    }

    async function startNewAssessment() {
        if (selectedTopics.length === 0) {
            setError('Choose at least one topic.');
            return;
        }

        setStarting(true);
        setError('');
        setMessage('');

        try {
            const response = await api.post('/assessment/tests', {
                topics: selectedTopics,
                questionCount,
                durationMinutes
            });

            const started = response.data.data.attempt;
            setAttempt(started);
            setAnswers({});
            setFlags({});
            setCurrentIndex(0);
            setTabSwitchCount(0);
            setResult(null);
            setSaveState('All changes saved');
            autoSubmitTriggered.current = false;
            submitLock.current = false;
            questionStartedAt.current = Date.now();
            setPhase('quiz');
        } catch (requestError) {
            setError(
                requestError.response?.data?.error?.message ||
                'Could not start an assessment. Try another configuration.'
            );
        } finally {
            setStarting(false);
        }
    }

    function startFreshAfterResult() {
        setAttempt(null);
        setResult(null);
        setAnswers({});
        setFlags({});
        setCurrentIndex(0);
        setError('');
        setMessage('');
        setPhase('setup');
        autoSubmitTriggered.current = false;
    }

    async function viewPastResult(id) {
        setError('');

        try {
            const response = await api.get(`/assessment/tests/${id}/result`);
            setResult(response.data.data.result);
            setPhase('result');
        } catch (requestError) {
            setError(
                requestError.response?.data?.error?.message ||
                'Could not load this result.'
            );
        }
    }

    if (loading) {
        return (
            <div className={`${PANEL} flex items-center gap-3 text-sm text-slate-500`}>
                <LoaderCircle size={19} className="animate-spin text-indigo-600" />
                Loading assessments and checking for an unfinished test...
            </div>
        );
    }

    if (phase === 'result' && result) {
        return (
            <div className="space-y-5">
                {message && (
                    <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {message}
                    </div>
                )}
                <ResultView
                    result={result}
                    onRetake={startFreshAfterResult}
                    history={history}
                    mastery={mastery}
                    onViewResult={viewPastResult}
                />
            </div>
        );
    }

    if (phase === 'quiz' && attempt && currentQuestion) {
        const answeredCount = questions.filter(
            question => answers[question.questionId] !== undefined
        ).length;

        const flaggedCount = questions.filter(
            question => flags[question.questionId]
        ).length;

        const progress = (answeredCount / questions.length) * 100;
        const isUrgent = secondsLeft <= 60;

        return (
            <div className="mx-auto max-w-4xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700">
                        <ArrowLeft size={16} /> Exit to dashboard
                    </Link>
                    <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold tabular-nums ${
                        isUrgent
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-slate-200 bg-white text-slate-700'
                    }`}>
                        <Clock3 size={17} />
                        {formatTime(secondsLeft)}
                    </div>
                </div>

                <section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                                Timed assessment
                            </div>
                            <h1 className="mt-2 text-2xl font-bold">Focus on one question at a time</h1>
                            <p className="mt-2 text-sm text-slate-300">
                                Your answers save automatically and are restored if you refresh.
                            </p>
                        </div>
                        <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-right">
                            <div className="text-xl font-extrabold tabular-nums">{currentIndex + 1}/{questions.length}</div>
                            <div className="text-[10px] text-slate-300">QUESTION</div>
                        </div>
                    </div>

                    <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-slate-400">
                        <span>{answeredCount} answered</span>
                        <span>{flaggedCount} flagged for review</span>
                    </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-[1fr_200px]">
                    <section className={PANEL}>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                                {readableTopic(currentQuestion.topic)}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
                                {currentQuestion.difficulty}
                            </span>
                            {currentQuestion.subtopic && (
                                <span className="text-xs text-slate-400">{currentQuestion.subtopic}</span>
                            )}
                        </div>

                        <h2 className="mt-6 text-lg font-bold leading-8 text-slate-900 sm:text-xl">
                            {currentQuestion.text}
                        </h2>
                        <p className="mt-2 text-xs text-slate-400">Select one answer.</p>

                        <div className="mt-6 space-y-3">
                            {currentQuestion.options.map((option, index) => {
                                const selected = answers[currentQuestion.questionId] === index;

                                return (
                                    <button
                                        key={`${currentQuestion.questionId}-${index}`}
                                        type="button"
                                        onClick={() => chooseAnswer(index)}
                                        aria-pressed={selected}
                                        className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm transition ${
                                            selected
                                                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100'
                                                : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                            selected
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {String.fromCharCode(65 + index)}
                                        </span>
                                        <span className="pt-1 leading-6 text-slate-800">{option}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                            <button
                                type="button"
                                onClick={toggleFlag}
                                className={`${BUTTON} border ${flags[currentQuestion.questionId] ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Flag size={16} />
                                {flags[currentQuestion.questionId] ? 'Flagged' : 'Flag for review'}
                            </button>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={currentIndex === 0}
                                    onClick={() => moveTo(currentIndex - 1)}
                                    className={`${BUTTON} border border-slate-200 text-slate-700 hover:bg-slate-50`}
                                >
                                    <ChevronLeft size={16} /> Previous
                                </button>
                                {currentIndex < questions.length - 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => moveTo(currentIndex + 1)}
                                        className={`${BUTTON} bg-indigo-600 text-white hover:bg-indigo-700`}
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => void submitAttempt(false)}
                                        className={`${BUTTON} bg-emerald-600 text-white hover:bg-emerald-700`}
                                    >
                                        {submitting ? 'Submitting...' : 'Submit test'}
                                        {!submitting && <CheckCircle2 size={16} />}
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>

                    <aside className={`${PANEL} h-fit`}>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <Target size={17} className="text-indigo-600" />
                            Question map
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                            Select a number to navigate. Green indicates answered; amber indicates flagged.
                        </p>

                        <div className="mt-4 grid grid-cols-5 gap-2 lg:grid-cols-4">
                            {questions.map((question, index) => {
                                const isAnswered = answers[question.questionId] !== undefined;
                                const isFlagged = flags[question.questionId];
                                const active = currentIndex === index;

                                return (
                                    <button
                                        key={question.questionId}
                                        type="button"
                                        onClick={() => moveTo(index)}
                                        aria-label={`Go to question ${index + 1}`}
                                        className={`flex aspect-square items-center justify-center rounded-lg border text-xs font-bold transition ${
                                            active
                                                ? 'border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-200'
                                                : isFlagged
                                                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                                                    : isAnswered
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
                                        }`}
                                    >
                                        {index + 1}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Save size={14} /> {saveState}
                            </div>
                            <div className="mt-2 text-slate-400">
                                Tab switches recorded: {tabSwitchCount}. This is shown for transparency, not used to penalise your score.
                            </div>
                        </div>
                    </aside>
                </div>

                {error && <ErrorBanner>{error}</ErrorBanner>}
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-indigo-600">
                <Target size={17} /> Skills assessment
            </div>

            <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-9">
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
                <div className="relative max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-indigo-100">
                        <BookOpen size={14} /> Baseline assessment
                    </div>
                    <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Find your starting point.</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                        Take a timed multiple-choice test. Your submitted answers are scored, explained, and used to update your topic mastery.
                    </p>
                </div>
            </section>

            {error && <ErrorBanner>{error}</ErrorBanner>}

            <section className={PANEL}>
                <h2 className="text-lg font-bold text-slate-900">Choose your topics</h2>
                <p className="mt-1 text-sm text-slate-500">Choose at least one topic for your test.</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {TOPICS.map(topic => {
                        const checked = selectedTopics.includes(topic.id);

                        return (
                            <label
                                key={topic.id}
                                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                                    checked
                                        ? 'border-indigo-300 bg-indigo-50/70'
                                        : 'border-slate-200 hover:border-indigo-200'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={event => {
                                        setSelectedTopics(previous =>
                                            event.target.checked
                                                ? [...previous, topic.id]
                                                : previous.filter(item => item !== topic.id)
                                        );
                                    }}
                                    className="mt-1 h-4 w-4 accent-indigo-600"
                                />
                                <span className="text-sm font-semibold leading-5 text-slate-700">{topic.label}</span>
                            </label>
                        );
                    })}
                </div>

                <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
                    <div>
                        <label htmlFor="questionCount" className="mb-2 block text-sm font-semibold text-slate-700">
                            Number of questions
                        </label>
                        <select
                            id="questionCount"
                            value={questionCount}
                            onChange={event => setQuestionCount(Number(event.target.value))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        >
                            {[3, 5, 10, 15, 20, 25, 27].map(count => (
                                <option key={count} value={count}>{count} questions</option>
                            ))}
                        </select>
                        <p className="mt-2 text-xs text-slate-400">The current starter bank contains 27 questions in total.</p>
                    </div>

                    <div>
                        <label htmlFor="duration" className="mb-2 block text-sm font-semibold text-slate-700">
                            Time limit
                        </label>
                        <select
                            id="duration"
                            value={durationMinutes}
                            onChange={event => setDurationMinutes(Number(event.target.value))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        >
                            {[3, 5, 10, 15, 20, 30].map(minutes => (
                                <option key={minutes} value={minutes}>{minutes} minutes</option>
                            ))}
                        </select>
                        <p className="mt-2 text-xs text-slate-400">The clock continues if you refresh the page.</p>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                    <div className="text-xs leading-5 text-slate-500">
                        <p>Selected topics: {selectedTopics.length}</p>
                        <p>Answers and explanations appear after submission.</p>
                    </div>
                    <button
                        type="button"
                        disabled={starting || selectedTopics.length === 0}
                        onClick={() => void startNewAssessment()}
                        className={`${BUTTON} bg-indigo-600 text-white hover:bg-indigo-700`}
                    >
                        {starting ? <LoaderCircle size={17} className="animate-spin" /> : <Play size={17} />}
                        {starting ? 'Preparing test...' : 'Start assessment'}
                        {!starting && <ArrowRight size={16} />}
                    </button>
                </div>
            </section>

            {(history.length > 0 || mastery.length > 0) && (
                <div className="grid gap-5 lg:grid-cols-2">
                    <section className={PANEL}>
                        <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <History size={19} className="text-indigo-600" />
                            Previous attempts
                        </div>
                        {history.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-500">Your completed tests will appear here.</p>
                        ) : (
                            <div className="mt-4 divide-y divide-slate-100">
                                {history.slice(0, 5).map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => void viewPastResult(item.id)}
                                        className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-slate-50"
                                    >
                                        <div>
                                            <div className="text-sm font-semibold text-slate-800">
                                                {item.topics.map(readableTopic).join(', ')}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-400">
                                                {item.questionCount} questions
                                            </div>
                                        </div>
                                        <div className="text-sm font-bold text-indigo-700">{item.score}%</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className={PANEL}>
                        <h2 className="text-lg font-bold text-slate-900">Topic mastery</h2>
                        <p className="mt-1 text-sm text-slate-500">Updated when you submit a test.</p>
                        <div className="mt-4 space-y-4">
                            {mastery.length === 0 ? (
                                <p className="text-sm text-slate-500">Complete your first test to begin tracking mastery.</p>
                            ) : mastery.map(item => (
                                <div key={item.topic}>
                                    <div className="mb-2 flex justify-between gap-2 text-xs">
                                        <span className="font-semibold text-slate-700">{readableTopic(item.topic)}</span>
                                        <span className="text-slate-500">{Math.round(item.score * 100)}%</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round(item.score * 100)}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
