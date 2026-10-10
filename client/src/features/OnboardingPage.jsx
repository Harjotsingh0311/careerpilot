import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ArrowRight, Check, GraduationCap, LoaderCircle,
    Search, Sparkles, Target
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import api from '../lib/api';

const steps = [
    { title: 'Basics', caption: 'Tell us about yourself' },
    { title: 'Skills', caption: 'Rate your current level' },
    { title: 'Target roles', caption: 'Choose up to three roles' }
];

const ratingNames = ['Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'];

const proficiencyLevel = {
    Beginner: 1,
    Basic: 2,
    Intermediate: 3,
    Advanced: 4,
    Expert: 5
};

function canonicalName(value) {
    return String(value || '').trim().toLowerCase();
}

function existingLevel(skill) {
    if (Number.isInteger(skill.level) && skill.level >= 1 && skill.level <= 5) {
        return skill.level;
    }

    return proficiencyLevel[skill.proficiency] || 3;
}

function FieldLabel({ children, htmlFor }) {
    return (
        <label htmlFor={htmlFor} className="mb-2 block text-xs font-bold text-slate-600">
            {children}
        </label>
    );
}

const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100';

export default function OnboardingPage() {
    const { updateUser } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(0);
    const [displayName, setDisplayName] = useState('');
    const [college, setCollege] = useState('');
    const [gradYear, setGradYear] = useState('');
    const [catalog, setCatalog] = useState([]);
    const [selectedSkills, setSelectedSkills] = useState({});
    const [roles, setRoles] = useState([]);
    const [targetRoles, setTargetRoles] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        let active = true;

        async function loadOnboardingData() {
            try {
                const [userResponse, catalogResponse, profileResponse, rolesResponse] =
                    await Promise.all([
                        api.get('/users/me'),
                        api.get('/skills/catalog'),
                        api.get('/skills/profile'),
                        api.get('/roles')
                    ]);

                if (!active) return;

                const user = userResponse.data.data.user;
                const skillCatalog = catalogResponse.data.data.skills || [];
                const profile = profileResponse.data.data.profile;
                const roleCatalog = rolesResponse.data.data.roles || [];

                setDisplayName(user.displayName || '');
                setCollege(user.college || '');
                setGradYear(user.gradYear ? String(user.gradYear) : '');
                setCatalog(skillCatalog);
                setRoles(roleCatalog);
                setTargetRoles(profile?.targetRoles || []);

                const selected = {};

                for (const saved of profile?.skills || []) {
                    const savedName = canonicalName(saved.name);
                    const match = skillCatalog.find(skill =>
                        canonicalName(skill.name) === savedName ||
                        (skill.aliases || []).some(alias =>
                            canonicalName(alias) === savedName
                        )
                    );

                    const name = match?.name || saved.name;

                    selected[name] = {
                        name,
                        category: match?.category || saved.category || 'Other',
                        level: existingLevel(saved),
                        proficiency: ratingNames[existingLevel(saved) - 1],
                        yearsExperience: saved.yearsExperience ?? 0
                    };
                }

                setSelectedSkills(selected);
            } catch (requestError) {
                if (active) {
                    setError(
                        requestError.response?.data?.error?.message ||
                        'Could not load onboarding data. Check the backend and role seeder.'
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadOnboardingData();

        return () => { active = false; };
    }, []);

    async function saveBasics() {
        if (displayName.trim().length < 2) {
            setError('Your name must contain at least two characters.');
            return false;
        }

        let parsedGradYear = null;
        if (gradYear.trim()) {
            parsedGradYear = Number(gradYear);

            if (!Number.isInteger(parsedGradYear) || parsedGradYear < 2020 || parsedGradYear > 2100) {
                setError('Enter a valid graduation year.');
                return false;
            }
        }

        try {
            const response = await api.patch('/users/me', {
                displayName: displayName.trim(),
                college: college.trim() || null,
                gradYear: parsedGradYear
            });

            updateUser(response.data.data.user);
            return true;
        } catch (requestError) {
            setError(
                requestError.response?.data?.error?.message ||
                'Could not save your profile details.'
            );
            return false;
        }
    }

    function toggleSkill(skill, checked) {
        setSelectedSkills(current => {
            const next = { ...current };

            if (!checked) {
                delete next[skill.name];
                return next;
            }

            next[skill.name] = {
                name: skill.name,
                category: skill.category || 'Other',
                level: 3,
                proficiency: 'Intermediate',
                yearsExperience: 0
            };

            return next;
        });
    }

    function changeLevel(name, value) {
        const level = Number(value);

        setSelectedSkills(current => ({
            ...current,
            [name]: {
                ...current[name],
                level,
                proficiency: ratingNames[level - 1]
            }
        }));
    }

    function toggleRole(role) {
        setTargetRoles(current => {
            const exists = current.some(
                title => title.toLowerCase() === role.title.toLowerCase()
            );

            if (exists) {
                return current.filter(
                    title => title.toLowerCase() !== role.title.toLowerCase()
                );
            }

            if (current.length >= 3) {
                setError('Choose at most three target roles.');
                return current;
            }

            setError('');
            return [...current, role.title];
        });
    }

    async function nextStep() {
        setError('');
        setMessage('');

        if (step === 0) {
            setSaving(true);
            const saved = await saveBasics();
            setSaving(false);

            if (!saved) return;

            setStep(1);
            return;
        }

        if (step === 1) {
            if (Object.keys(selectedSkills).length === 0) {
                setMessage('You can continue without skills, but role matches will be less informative until you add some.');
            }
            setStep(2);
            return;
        }

        await finishOnboarding();
    }

    async function finishOnboarding() {
        if (targetRoles.length > 3) {
            setError('Choose at most three target roles.');
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');

        try {
            const skills = Object.values(selectedSkills).map(skill => ({
                name: skill.name,
                category: skill.category,
                level: Number(skill.level),
                proficiency: ratingNames[Number(skill.level) - 1],
                yearsExperience: Number(skill.yearsExperience || 0)
            }));

            await api.put('/skills/profile', {
                targetRoles,
                skills
            });

            navigate('/roles', { replace: true });
        } catch (requestError) {
            setError(
                requestError.response?.data?.error?.message ||
                'Could not save onboarding. Please try again.'
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                <LoaderCircle size={18} className="mr-2 inline animate-spin" />
                Loading your profile, skill catalog and career roles...
            </div>
        );
    }

    const filteredCatalog = catalog.filter(skill => {
        const term = search.trim().toLowerCase();

        return !term ||
            skill.name.toLowerCase().includes(term) ||
            (skill.aliases || []).some(alias => alias.toLowerCase().includes(term));
    });

    const categories = [...new Set(filteredCatalog.map(skill => skill.category))];

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700"
            >
                <ArrowLeft size={16} /> Back to overview
            </button>

            <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-9">
                <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
                <div className="relative">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-200">
                        <Sparkles size={15} /> Personalise CareerPilot
                    </div>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Let's set your direction.</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                        Tell us the basics, rate your skills, and choose the roles you want to work toward.
                    </p>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-3">
                    {steps.map((item, index) => {
                        const complete = index < step;
                        const current = index === step;

                        return (
                            <button
                                type="button"
                                key={item.title}
                                onClick={() => {
                                    setError('');
                                    setStep(index);
                                }}
                                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                                    current
                                        ? 'border-indigo-300 bg-indigo-50'
                                        : complete
                                            ? 'border-emerald-200 bg-emerald-50/60'
                                            : 'border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                                    current
                                        ? 'bg-indigo-600 text-white'
                                        : complete
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {complete ? <Check size={17} /> : index + 1}
                                </span>
                                <span>
                                    <span className="block text-sm font-bold text-slate-800">{item.title}</span>
                                    <span className="mt-1 block text-xs text-slate-500">{item.caption}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {error && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                    {error}
                </div>
            )}

            {message && (
                <div role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-800">
                    {message}
                </div>
            )}

            {step === 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                            <GraduationCap size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Basic information</h2>
                            <p className="mt-1 text-sm text-slate-500">Keep your profile useful and up to date.</p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <div>
                            <FieldLabel htmlFor="onboarding-name">Display name</FieldLabel>
                            <input
                                id="onboarding-name"
                                value={displayName}
                                onChange={event => setDisplayName(event.target.value)}
                                required
                                minLength={2}
                                maxLength={80}
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <FieldLabel htmlFor="onboarding-college">College / university (optional)</FieldLabel>
                            <input
                                id="onboarding-college"
                                value={college}
                                onChange={event => setCollege(event.target.value)}
                                maxLength={120}
                                className={inputClass}
                                placeholder="Your institution"
                            />
                        </div>

                        <div>
                            <FieldLabel htmlFor="onboarding-grad-year">Expected graduation year (optional)</FieldLabel>
                            <input
                                id="onboarding-grad-year"
                                type="number"
                                min="2020"
                                max="2100"
                                value={gradYear}
                                onChange={event => setGradYear(event.target.value)}
                                className={inputClass}
                                placeholder="e.g. 2027"
                            />
                        </div>
                    </div>
                </section>
            )}

            {step === 1 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Rate your skills</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Select the skills you have and use the 1–5 slider to rate your current level. Ratings are self-assessments until supported by test results.
                        </p>
                    </div>

                    <div className="relative mt-5">
                        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            aria-label="Search skills"
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder="Search the canonical skills catalog..."
                            className={`${inputClass} pl-10`}
                        />
                    </div>

                    <div className="mt-5 space-y-3">
                        {categories.map(category => {
                            const categorySkills = filteredCatalog.filter(skill => skill.category === category);
                            const categorySelected = categorySkills.filter(skill => selectedSkills[skill.name]).length;

                            return (
                                <details key={category} open={Boolean(search.trim())} className="overflow-hidden rounded-xl border border-slate-200">
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                                        <span className="text-sm font-bold text-slate-800">{category}</span>
                                        <span className="text-xs text-slate-500">
                                            {categorySelected} selected · {categorySkills.length} available
                                        </span>
                                    </summary>

                                    <div className="divide-y divide-slate-100">
                                        {categorySkills.map(skill => {
                                            const selected = selectedSkills[skill.name];

                                            return (
                                                <div key={skill.name} className="p-4">
                                                    <label className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(selected)}
                                                            onChange={event => toggleSkill(skill, event.target.checked)}
                                                            className="h-4 w-4 accent-indigo-600"
                                                        />
                                                        <span className="text-sm font-semibold text-slate-800">{skill.name}</span>
                                                    </label>

                                                    {selected && (
                                                        <div className="mt-4 rounded-xl bg-slate-50 p-4 sm:ml-7">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <label htmlFor={`rating-${skill.name}`} className="text-xs font-bold text-slate-600">
                                                                    Self-rating
                                                                </label>
                                                                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                                                                    {selected.level}/5 · {ratingNames[selected.level - 1]}
                                                                </span>
                                                            </div>
                                                            <input
                                                                id={`rating-${skill.name}`}
                                                                type="range"
                                                                min="1"
                                                                max="5"
                                                                step="1"
                                                                value={selected.level}
                                                                onChange={event => changeLevel(skill.name, event.target.value)}
                                                                className="mt-3 w-full accent-indigo-600"
                                                            />
                                                            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                                                                <span>Beginner</span>
                                                                <span>Expert</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </details>
                            );
                        })}
                    </div>

                    <p className="mt-4 text-xs text-slate-500">
                        {Object.keys(selectedSkills).length} skills selected. You can change these later from your skill profile.
                    </p>
                </section>
            )}

            {step === 2 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                            <Target size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Choose your target roles</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Select at most three. You can update them later.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                        {targetRoles.map(title => (
                            <span key={title} className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                                {title}
                            </span>
                        ))}
                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                            {targetRoles.length}/3 selected
                        </span>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {roles.map(role => {
                            const checked = targetRoles.some(
                                title => title.toLowerCase() === role.title.toLowerCase()
                            );

                            return (
                                <label
                                    key={role.slug}
                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                                        checked
                                            ? 'border-indigo-300 bg-indigo-50/70'
                                            : 'border-slate-200 hover:border-indigo-200'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleRole(role)}
                                        className="mt-1 h-4 w-4 accent-indigo-600"
                                    />
                                    <span>
                                        <span className="block text-sm font-bold text-slate-900">{role.title}</span>
                                        <span className="mt-1 block text-xs leading-5 text-slate-500">{role.description}</span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </section>
            )}

            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="text-xs leading-5 text-slate-500">
                    Step {step + 1} of 3
                    <span className="mt-1 block">Your changes are saved to your CareerPilot account.</span>
                </div>

                <div className="flex gap-2">
                    {step > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                setError('');
                                setMessage('');
                                setStep(current => current - 1);
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                        >
                            <ArrowLeft size={16} /> Back
                        </button>
                    )}

                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => void nextStep()}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {saving && <LoaderCircle size={16} className="animate-spin" />}
                        {saving ? 'Saving...' : step === 2 ? 'Finish onboarding' : 'Continue'}
                        {!saving && (step === 2 ? <Check size={16} /> : <ArrowRight size={16} />)}
                    </button>
                </div>
            </section>
        </div>
    );
}
