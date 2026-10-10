import { useEffect, useState } from 'react';
import {
    Activity, ArrowRight, BrainCircuit, CalendarDays,
    CheckCircle2, Flame, Target, TrendingUp, Trophy
} from 'lucide-react';
import {
    CartesianGrid, Line, LineChart, ResponsiveContainer,
    Tooltip, XAxis, YAxis
} from 'recharts';
import { Link } from 'react-router-dom';
import api from '../lib/api';

const card = 'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-100';

const componentIcons = {
    technical: BrainCircuit,
    interview: Activity,
    roleFit: Target,
    delivery: TrendingUp,
    consistency: CalendarDays
};

function ReadinessRing({ score }) {
    const conic = score === null
        ? 'conic-gradient(#e2e8f0 0%, #e2e8f0 100%)'
        : `conic-gradient(#4f46e5 ${score}%, #e2e8f0 ${score}%)`;

    return (
        <div
            className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full p-2"
            style={{ background: conic }}
            aria-label={score === null ? 'Readiness score not available' : `Readiness score ${score} out of 100`}
        >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                    {score === null ? '—' : score}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {score === null ? 'Not ready' : 'Out of 100'}
                </span>
            </div>
        </div>
    );
}

function PanelError({ children }) {
    return (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            {children}
        </div>
    );
}

export default function DashboardInsights() {
    const [summary, setSummary] = useState(null);
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        async function loadDashboard() {
            try {
                const [summaryResponse, trendsResponse] = await Promise.all([
                    api.get('/dashboard/summary'),
                    api.get('/dashboard/trends?days=14')
                ]);

                if (!active) return;

                setSummary(summaryResponse.data.data);
                setTrends(trendsResponse.data.data.trends || []);
            } catch (requestError) {
                if (active) {
                    setError(
                        requestError.response?.data?.error?.message ||
                        'Dashboard insights could not be loaded. Try refreshing the page.'
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadDashboard();

        return () => { active = false; };
    }, []);

    if (loading) {
        return (
            <section className={card}>
                <div className="animate-pulse text-sm text-slate-500">Loading your progress...</div>
            </section>
        );
    }

    if (error || !summary) {
        return (
            <PanelError>
                {error || 'Dashboard data is not available.'}
                <span className="mt-1 block text-xs">
                    The other dashboard sections remain available.
                </span>
            </PanelError>
        );
    }

    const { readiness, mastery, activeDays, streak, xp, nextAction, recentAttempts, targetRoles } = summary;
    const hasTrend = trends.some(item => item.averageScore !== null);
    const masteredCount = mastery.length;
    const recentAverage = recentAttempts.length
        ? Math.round(recentAttempts.reduce((sum, item) => sum + item.score, 0) / recentAttempts.length)
        : null;

    return (
        <div className="space-y-6">
            <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className={`${card} flex flex-col justify-between gap-5 sm:flex-row sm:items-center`}>
                    <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-indigo-700">
                            <Target size={17} /> Career readiness
                        </div>
                        <h2 className="mt-3 text-xl font-bold text-slate-900">
                            {readiness.score === null
                                ? 'Your baseline is waiting'
                                : 'Your readiness snapshot'}
                        </h2>
                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                            {readiness.score === null
                                ? 'Complete an assessment to start measuring your progress.'
                                : `Calculated from ${readiness.signalsCount} of ${readiness.totalSignals} available signals. Missing signals are excluded and the remaining weights are rebalanced.`}
                        </p>

                        {readiness.score !== null && (
                            <span className="mt-4 inline-flex rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold capitalize text-indigo-700">
                                {readiness.confidence} confidence
                            </span>
                        )}

                        <Link
                            to="/assessments"
                            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-900"
                        >
                            {masteredCount ? 'Continue improving' : 'Take your first assessment'}
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                    <ReadinessRing score={readiness.score} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className={card}>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <Trophy size={16} className="text-amber-600" /> Total XP
                        </div>
                        <div className="mt-4 text-3xl font-extrabold text-slate-900">{xp}</div>
                        <div className="mt-2 text-xs text-slate-400">Earned from completed tests</div>
                    </div>
                    <div className={card}>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <Flame size={16} className="text-orange-500" /> Current streak
                        </div>
                        <div className="mt-4 text-3xl font-extrabold text-slate-900">{streak}</div>
                        <div className="mt-2 text-xs text-slate-400">Consecutive active days</div>
                    </div>
                    <div className={card}>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <CalendarDays size={16} className="text-emerald-600" /> Active days
                        </div>
                        <div className="mt-4 text-3xl font-extrabold text-slate-900">{activeDays}/14</div>
                        <div className="mt-2 text-xs text-slate-400">During the last 14 days</div>
                    </div>
                    <div className={card}>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <TrendingUp size={16} className="text-indigo-600" /> Recent average
                        </div>
                        <div className="mt-4 text-3xl font-extrabold text-slate-900">
                            {recentAverage === null ? '—' : `${recentAverage}%`}
                        </div>
                        <div className="mt-2 text-xs text-slate-400">Up to five latest tests</div>
                    </div>
                </div>
            </section>

            <section className={card}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Readiness signals</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Each score is based on a different kind of evidence.
                        </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                        {readiness.signalsCount}/{readiness.totalSignals} measured
                    </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {readiness.components.map(component => {
                        const Icon = componentIcons[component.key] || Activity;

                        return (
                            <div key={component.key} className="rounded-xl border border-slate-200 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                        <Icon size={17} className="text-indigo-600" />
                                        {component.label}
                                    </div>
                                    <span className="text-xs font-semibold text-slate-400">
                                        {Math.round(component.weight * 100)}%
                                    </span>
                                </div>
                                <div className="mt-3 text-2xl font-extrabold text-slate-900">
                                    {component.available ? `${component.score}%` : 'Not measured'}
                                </div>
                                {component.available && (
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${component.score}%` }} />
                                    </div>
                                )}
                                <p className="mt-3 text-xs leading-5 text-slate-500">
                                    {component.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <div className={card}>
                    <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                        <TrendingUp size={19} className="text-indigo-600" />
                        Assessment trend
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        Average score by day over the last 14 days.
                    </p>

                    {hasTrend ? (
                        <div className="mt-5 h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trends} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        formatter={(value, name) => [
                                            value === null ? 'No test' : `${value}%`,
                                            name === 'averageScore' ? 'Average score' : name
                                        ]}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="averageScore"
                                        name="Average score"
                                        stroke="#4f46e5"
                                        strokeWidth={2.5}
                                        dot={{ r: 3 }}
                                        connectNulls={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-5 text-center">
                            <TrendingUp size={26} className="text-slate-300" />
                            <p className="mt-3 text-sm font-semibold text-slate-700">Your trend will appear here</p>
                            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                                Complete an assessment to create the first real score point.
                            </p>
                        </div>
                    )}
                </div>

                <div className={card}>
                    <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                        <BrainCircuit size={19} className="text-violet-600" />
                        Topic mastery
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        Moving estimates from your submitted questions.
                    </p>

                    {mastery.length ? (
                        <div className="mt-5 space-y-4">
                            {mastery.slice(0, 6).map(item => (
                                <div key={item.topic}>
                                    <div className="mb-2 flex justify-between gap-3 text-xs">
                                        <span className="font-semibold uppercase text-slate-700">{item.topic}</span>
                                        <span className="tabular-nums text-slate-500">{Math.round(item.score * 100)}%</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round(item.score * 100)}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                            <p className="text-sm font-semibold text-slate-700">No mastery scores yet</p>
                            <p className="mt-2 text-xs leading-5 text-slate-500">Submit an assessment to start tracking topic mastery.</p>
                        </div>
                    )}
                    <Link to="/assessments" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-900">
                        Open assessments <ArrowRight size={16} />
                    </Link>
                </div>
            </section>

            <section className={`${card} border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white`}>
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-sm">
                        <CheckCircle2 size={21} />
                    </div>
                    <div className="flex-1">
                        <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">Recommended next action</div>
                        <h2 className="mt-2 text-lg font-bold text-slate-900">{nextAction.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{nextAction.description}</p>
                        {targetRoles.length > 0 && (
                            <p className="mt-2 text-xs text-slate-500">
                                Target roles: {targetRoles.join(', ')}
                            </p>
                        )}
                        <Link
                            to={nextAction.path}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                        >
                            Take the next step <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
