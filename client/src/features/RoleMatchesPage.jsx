import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, CircleHelp, LoaderCircle, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

const panel = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';

function RoleCard({ role, targetRoles, onToggleTarget, saving }) {
    const isTarget = role.isTargetRole || targetRoles.some(
        title => title.toLowerCase() === role.title.toLowerCase()
    );

    return (
        <article className={`${panel} flex flex-col`}>
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                    <BriefcaseBusiness size={22} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-slate-900">{role.title}</h2>
                        {isTarget && (
                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                                TARGET ROLE
                            </span>
                        )}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{role.description}</p>
                </div>
            </div>

            <div className="mt-5 flex items-end justify-between gap-4 rounded-xl bg-slate-50 p-4">
                <div>
                    <div className="text-xs font-semibold text-slate-500">Role match</div>
                    <div className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                        {role.matchPercentage}%
                    </div>
                </div>
                <div className="w-32">
                    <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{ width: `${role.matchPercentage}%` }}
                        />
                    </div>
                    <div className="text-right text-[10px] text-slate-400">
                        {role.matchedSkills.length} skills matched
                    </div>
                </div>
            </div>

            <div className="mt-5 grid flex-1 gap-4 sm:grid-cols-2">
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                        <Check size={14} /> Matched skills
                    </div>
                    {role.matchedSkills.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {role.matchedSkills.map(skill => (
                                <span key={skill.name} className="rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
                                    {skill.name}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-3 text-xs leading-5 text-slate-400">
                            No skills meet the matching threshold yet.
                        </p>
                    )}
                </div>

                <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                        <Target size={14} /> Highest-priority gaps
                    </div>
                    {role.topGaps.length ? (
                        <div className="mt-3 space-y-2">
                            {role.topGaps.map(skill => (
                                <div key={skill.name} className="flex items-center justify-between gap-2 text-xs">
                                    <span className="text-slate-700">{skill.name}</span>
                                    <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-amber-800">
                                        {skill.tier} · weight {skill.weight}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-3 text-xs leading-5 text-slate-400">
                            No gaps below the 0.5 evidence threshold.
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs leading-5 text-slate-500">
                    Self-rating contributes up to 70% of a skill's strength until matching assessment evidence exists. Scores are explainable estimates, not hiring probabilities.
                </p>
                <button
                    type="button"
                    disabled={saving}
                    onClick={() => onToggleTarget(role)}
                    className={`mt-4 inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition disabled:opacity-50 ${
                        isTarget
                            ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                >
                    {saving && <LoaderCircle size={14} className="animate-spin" />}
                    {isTarget ? 'Remove target role' : 'Set as target'}
                </button>
            </div>
        </article>
    );
}

export default function RoleMatchesPage() {
    const [matches, setMatches] = useState([]);
    const [targetRoles, setTargetRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingSlug, setSavingSlug] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const loadMatches = useCallback(async () => {
        const response = await api.get('/roles/matches');
        setMatches(response.data.data.matches || []);
        setTargetRoles(response.data.data.targetRoles || []);
    }, []);

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const response = await api.get('/roles/matches');

                if (active) {
                    setMatches(response.data.data.matches || []);
                    setTargetRoles(response.data.data.targetRoles || []);
                }
            } catch (requestError) {
                if (active) {
                    setError(
                        requestError.response?.data?.error?.message ||
                        'Could not load role matches. Make sure the role catalog has been seeded.'
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        load();

        return () => { active = false; };
    }, []);

    async function toggleTarget(role) {
        setError('');
        setMessage('');
        setSavingSlug(role.slug);

        try {
            const response = await api.get('/skills/profile');
            const profile = response.data.data.profile;
            const currentTargets = profile?.targetRoles || [];

            const isTarget = currentTargets.some(
                title => title.toLowerCase() === role.title.toLowerCase()
            );

            let nextTargets;

            if (isTarget) {
                nextTargets = currentTargets.filter(
                    title => title.toLowerCase() !== role.title.toLowerCase()
                );
            } else {
                if (currentTargets.length >= 3) {
                    setError('The blueprint allows up to three target roles. Remove a target from your skill profile before adding another.');
                    return;
                }

                nextTargets = [...currentTargets, role.title];
            }

            const skills = (profile?.skills || []).map(skill => ({
                name: skill.name,
                category: skill.category,
                proficiency: skill.proficiency,
                yearsExperience: skill.yearsExperience
            }));

            await api.put('/skills/profile', {
                targetRoles: nextTargets,
                skills
            });

            await loadMatches();
            setMessage(isTarget
                ? `${role.title} removed from target roles.`
                : `${role.title} added to target roles.`);
        } catch (requestError) {
            setError(
                requestError.response?.data?.error?.message ||
                'Could not update your target roles. Try again.'
            );
        } finally {
            setSavingSlug('');
        }
    }

    if (loading) {
        return (
            <div className={`${panel} flex items-center gap-3 text-sm text-slate-500`}>
                <LoaderCircle size={18} className="animate-spin text-indigo-600" />
                Calculating your matches from your saved skills and available assessment evidence...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700">
                <ArrowLeft size={16} /> Back to overview
            </Link>

            <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-9">
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
                <div className="relative">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-200">
                        <BriefcaseBusiness size={15} /> Career direction
                    </div>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                        Find roles that fit your skills.
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                        Compare your saved skill profile with weighted role requirements. See where you already have evidence and which gaps matter most.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3 text-xs">
                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">
                            {matches.length} role profiles
                        </span>
                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">
                            {targetRoles.length}/3 target roles selected
                        </span>
                        <Link to="/skills" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 font-bold text-slate-900">
                            Update skills <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </section>

            {error && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                    {error}
                </div>
            )}
            {message && (
                <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                    {message}
                </div>
            )}

            <section className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                <CircleHelp size={18} className="mt-0.5 shrink-0 text-indigo-700" />
                <div className="text-xs leading-5 text-slate-600">
                    <strong className="text-slate-800">How the score works:</strong> role skills have weights from 1 to 5. Your saved proficiency supplies a self-rating; when a skill maps to a topic with assessment mastery, the score combines self-rating and assessment evidence. Without evidence, self-rating strength is capped at 70%. The score is not a prediction of whether an employer will hire you.
                </div>
            </section>

            {matches.length === 0 ? (
                <section className={panel}>
                    <h2 className="font-bold text-slate-900">No role profiles found</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Seed the role catalog in the backend, then refresh this page.
                    </p>
                </section>
            ) : (
                <section className="grid gap-5 xl:grid-cols-2">
                    {matches.map(role => (
                        <RoleCard
                            key={role.slug}
                            role={role}
                            targetRoles={targetRoles}
                            onToggleTarget={toggleTarget}
                            saving={savingSlug === role.slug}
                        />
                    ))}
                </section>
            )}
        </div>
    );
}
