import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function AuthPage({ mode = 'login' }) {
    const isRegister = mode === 'register';
    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            if (isRegister) {
                await signUp({ displayName, email, password });
            } else {
                await signIn({ email, password });
            }

            const requestedPath = isRegister ? '/onboarding' : (location.state?.from?.pathname || '/');
            navigate(requestedPath, { replace: true });
        } catch (requestError) {
            const apiError = requestError.response?.data?.error;
            setError(
                apiError?.message ||
                (requestError.code === 'ECONNABORTED' || !requestError.response
                    ? 'Cannot reach the API. Check that your backend is running.'
                    : 'We could not complete your request. Check the details and try again.')
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
            <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 lg:grid-cols-2">
                <section className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white lg:flex">
                    <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
                    <div className="relative flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600">
                            <GraduationCap size={24} />
                        </div>
                        <span className="text-xl font-extrabold">CareerPilot.</span>
                    </div>

                    <div className="relative py-12">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs text-indigo-100">
                            <Sparkles size={14} />
                            Your career journey starts here
                        </div>
                        <h1 className="text-4xl font-bold leading-tight">
                            Make your next
                            <span className="block text-indigo-300">move a confident one.</span>
                        </h1>
                        <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">
                            Assess your skills, discover development gaps, and build towards your career goals.
                        </p>
                    </div>

                    <div className="relative flex items-center gap-2 text-xs text-slate-300">
                        <ShieldCheck size={16} />
                        Your access tokens are handled securely.
                    </div>
                </section>

                <section className="p-6 sm:p-10 lg:p-12">
                    <Link to="/" className="mb-10 flex items-center gap-2 text-lg font-extrabold text-slate-900 lg:hidden">
                        <GraduationCap size={25} className="text-indigo-600" />
                        CareerPilot.
                    </Link>

                    <div className="text-sm font-bold text-indigo-600">
                        {isRegister ? 'GET STARTED' : 'WELCOME BACK'}
                    </div>
                    <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                        {isRegister ? 'Create your account' : 'Sign in to CareerPilot'}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        {isRegister
                            ? 'Create your account to start your career development journey.'
                            : 'Sign in to continue working towards your career goals.'}
                    </p>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                        {isRegister && (
                            <div>
                                <label htmlFor="displayName" className="mb-2 block text-sm font-semibold text-slate-700">
                                    Your name
                                </label>
                                <input
                                    id="displayName"
                                    name="displayName"
                                    autoComplete="name"
                                    required
                                    minLength={2}
                                    maxLength={80}
                                    value={displayName}
                                    onChange={event => setDisplayName(event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                    placeholder="Enter your name"
                                />
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                maxLength={254}
                                value={email}
                                onChange={event => setEmail(event.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete={isRegister ? 'new-password' : 'current-password'}
                                required
                                minLength={isRegister ? 8 : 1}
                                maxLength={72}
                                value={password}
                                onChange={event => setPassword(event.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                placeholder={isRegister ? 'At least 8 characters' : 'Enter your password'}
                            />
                            {isRegister && (
                                <p className="mt-2 text-xs text-slate-400">
                                    Use at least 8 characters.
                                </p>
                            )}
                        </div>

                        {error && (
                            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting
                                ? 'Please wait...'
                                : isRegister ? 'Create account' : 'Sign in'}
                            {!submitting && <ArrowRight size={17} />}
                        </button>
                    </form>

                    <p className="mt-7 text-center text-sm text-slate-500">
                        {isRegister ? 'Already have an account?' : 'New to CareerPilot?'}{' '}
                        <Link
                            to={isRegister ? '/login' : '/register'}
                            className="font-bold text-indigo-700 hover:text-indigo-800"
                        >
                            {isRegister ? 'Sign in' : 'Create an account'}
                        </Link>
                    </p>

                    <p className="mt-8 text-center text-xs leading-5 text-slate-400">
                        Do not use a password that you use for another important account.
                    </p>
                </section>
            </div>
        </main>
    );
}
