import { useEffect, useState } from 'react';
import {
    ArrowLeft,
    BrainCircuit,
    Plus,
    Save,
    Sparkles,
    Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

const categories = [
    'Programming',
    'AI/ML',
    'Data',
    'Web Development',
    'Tools',
    'Soft Skills',
    'Other'
];

const levels = [
    'Beginner',
    'Basic',
    'Intermediate',
    'Advanced',
    'Expert'
];

let rowCounter = 0;

function newSkill() {
    rowCounter += 1;

    return {
        rowKey: `new-${Date.now()}-${rowCounter}`,
        name: '',
        category: 'Programming',
        proficiency: 'Beginner',
        yearsExperience: '0'
    };
}

function normaliseSkill(skill, index) {
    return {
        rowKey: skill.id || skill._id || `saved-${index}`,
        name: skill.name || '',
        category: skill.category || 'Other',
        proficiency: skill.proficiency || 'Beginner',
        level: skill.level ?? ({ Beginner: 1, Basic: 2, Intermediate: 3, Advanced: 4, Expert: 5 }[skill.proficiency] || 3),
        yearsExperience: String(skill.yearsExperience ?? 0)
    };
}

function FieldLabel({ children, htmlFor }) {
    return (
        <label htmlFor={htmlFor} className="mb-2 block text-xs font-bold text-slate-600">
            {children}
        </label>
    );
}

const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100';

export default function SkillProfilePage() {
    const [targetRoles, setTargetRoles] = useState('');
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        let active = true;

        async function loadProfile() {
            try {
                const response = await api.get('/skills/profile');
                const profile = response.data.data.profile;

                if (active && profile) {
                    setTargetRoles((profile.targetRoles || []).join(', '));
                    setSkills((profile.skills || []).map(normaliseSkill));
                }
            } catch (requestError) {
                if (active) {
                    setError(
                        requestError.response?.data?.error?.message ||
                        'We could not load your skill profile. Please try again.'
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadProfile();

        return () => {
            active = false;
        };
    }, []);

    function updateSkill(rowKey, field, value) {
        setSkills(current => current.map(skill =>
            skill.rowKey === rowKey
                ? { ...skill, [field]: value }
                : skill
        ));
    }

    function removeSkill(rowKey) {
        setSkills(current => current.filter(skill => skill.rowKey !== rowKey));
    }

    async function handleSave(event) {
        event.preventDefault();
        setError('');
        setMessage('');

        const roles = targetRoles
            .split(',')
            .map(role => role.trim())
            .filter(Boolean);

        if (roles.length > 3) {
            setError('Add no more than five target roles.');
            return;
        }

        if (roles.some(role => role.length < 2 || role.length > 100)) {
            setError('Each target role must contain between 2 and 100 characters.');
            return;
        }

        const populatedSkills = skills.filter(skill => skill.name.trim());

        if (populatedSkills.some(skill =>
            skill.name.trim().length > 80 ||
            !Number.isFinite(Number(skill.yearsExperience)) ||
            Number(skill.yearsExperience) < 0 ||
            Number(skill.yearsExperience) > 50
        )) {
            setError('Check skill names and experience values. Experience must be between 0 and 50 years.');
            return;
        }

        if (populatedSkills.length > 50) {
            setError('You can save at most 50 skills.');
            return;
        }

        setSaving(true);

        try {
            const payload = {
                targetRoles: roles,
                skills: populatedSkills.map(skill => ({
                    name: skill.name.trim(),
                    category: skill.category,
                    proficiency: skill.proficiency,
                    yearsExperience: Number(skill.yearsExperience)
                }))
            };

            const response = await api.put('/skills/profile', payload);
            const profile = response.data.data.profile;

            setTargetRoles((profile.targetRoles || []).join(', '));
            setSkills((profile.skills || []).map(normaliseSkill));
            setMessage('Your skill profile has been saved.');
        } catch (requestError) {
            setError(
                requestError.response?.data?.error?.message ||
                'Your profile could not be saved. Please try again.'
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
                Loading your skill profile...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-7">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700">
                <ArrowLeft size={16} /> Back to overview
            </Link>

            <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200">
                        <BrainCircuit size={25} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-200">
                            <Sparkles size={14} /> Your career foundation
                        </div>
                        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Skill profile</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                            Capture what you know today and the roles you want to work towards. Your profile will help personalise upcoming assessments and role matching.
                        </p>
                    </div>
                </div>
            </section>

            <form onSubmit={handleSave} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                    <h2 className="text-lg font-bold text-slate-900">Career direction</h2>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                        Add up to three roles, separated by commas.
                    </p>

                    <div className="mt-5">
                        <FieldLabel htmlFor="targetRoles">Target roles</FieldLabel>
                        <input
                            id="targetRoles"
                            value={targetRoles}
                            onChange={event => setTargetRoles(event.target.value)}
                            className={inputClass}
                            placeholder="e.g. Machine Learning Engineer, Data Scientist"
                            maxLength={520}
                        />
                        <p className="mt-2 text-xs text-slate-400">
                            You can change your goals at any time.
                        </p>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Your skills</h2>
                            <p className="mt-1 text-sm leading-5 text-slate-500">
                                Record your proficiency and practical experience honestly.
                            </p>
                        </div>
                        <button
                            type="button"
                            disabled={skills.length >= 50}
                            onClick={() => setSkills(current => [...current, newSkill()])}
                            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 px-3 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50"
                        >
                            <Plus size={15} /> Add skill
                        </button>
                    </div>

                    {skills.length === 0 && (
                        <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
                            <BrainCircuit size={24} className="mx-auto text-slate-400" />
                            <p className="mt-3 text-sm font-semibold text-slate-700">Start with one skill</p>
                            <p className="mt-1 text-xs text-slate-500">For example, Python, SQL, communication, or machine learning.</p>
                            <button
                                type="button"
                                onClick={() => setSkills([newSkill()])}
                                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
                            >
                                Add your first skill
                            </button>
                        </div>
                    )}

                    <div className="mt-5 space-y-4">
                        {skills.map((skill, index) => (
                            <div key={skill.rowKey} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                                <div className="mb-4 flex items-center justify-between gap-2">
                                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Skill {index + 1}
                                    </div>
                                    <button
                                        type="button"
                                        aria-label={`Remove skill ${index + 1}`}
                                        onClick={() => removeSkill(skill.rowKey)}
                                        className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <FieldLabel htmlFor={`skill-name-${skill.rowKey}`}>Skill name</FieldLabel>
                                        <input
                                            id={`skill-name-${skill.rowKey}`}
                                            required
                                            maxLength={80}
                                            value={skill.name}
                                            onChange={event => updateSkill(skill.rowKey, 'name', event.target.value)}
                                            className={inputClass}
                                            placeholder="e.g. Python"
                                        />
                                    </div>

                                    <div>
                                        <FieldLabel htmlFor={`skill-category-${skill.rowKey}`}>Category</FieldLabel>
                                        <select
                                            id={`skill-category-${skill.rowKey}`}
                                            value={skill.category}
                                            onChange={event => updateSkill(skill.rowKey, 'category', event.target.value)}
                                            className={inputClass}
                                        >
                                            {categories.map(category => (
                                                <option key={category} value={category}>{category}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <FieldLabel htmlFor={`skill-level-${skill.rowKey}`}>Proficiency</FieldLabel>
                                        <select
                                            id={`skill-level-${skill.rowKey}`}
                                            value={skill.proficiency}
                                            onChange={event => updateSkill(skill.rowKey, 'proficiency', event.target.value)}
                                            className={inputClass}
                                        >
                                            {levels.map(level => (
                                                <option key={level} value={level}>{level}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <FieldLabel htmlFor={`skill-years-${skill.rowKey}`}>Years of experience</FieldLabel>
                                        <input
                                            id={`skill-years-${skill.rowKey}`}
                                            type="number"
                                            min="0"
                                            max="50"
                                            step="0.5"
                                            value={skill.yearsExperience}
                                            onChange={event => updateSkill(skill.rowKey, 'yearsExperience', event.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {error && (
                    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700">
                        {error}
                    </div>
                )}

                {message && (
                    <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-700">
                        {message}
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs leading-5 text-slate-400">
                        Your saved profile is associated with your signed-in account.
                    </p>
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Save size={17} />
                        {saving ? 'Saving profile...' : 'Save skill profile'}
                    </button>
                </div>
            </form>
        </div>
    );
}
