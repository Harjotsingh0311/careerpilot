import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
const SkillProfilePage = lazy(() => import('./features/SkillProfilePage'))
const AssessmentPage = lazy(() => import('./features/AssessmentPage'))
const DashboardInsights = lazy(() => import('./features/DashboardInsights'))
const RoleMatchesPage = lazy(() => import('./features/RoleMatchesPage'))
const ResumeLabPage = lazy(() => import('./features/ResumeLabPage'))
const OnboardingPage = lazy(() => import('./features/OnboardingPage'))
const InterviewStudioPage = lazy(() => import('./features/InterviewStudioPage'))
const VoiceLabPage = lazy(() => import('./features/VoiceLabPage'))
import {
  Activity, ArrowRight, ArrowUpRight, BookOpen, BrainCircuit,
  BriefcaseBusiness, CheckCircle2, ChevronRight, FileSearch,
  GraduationCap, LayoutDashboard, LogOut, Menu, MessageSquareText, Mic,
  ShieldCheck, Sparkles, Target, X,
} from 'lucide-react'
import { getHealth } from './lib/api'

const navigation = [
  { label: 'Overview', path: '/', icon: LayoutDashboard, end: true },
  { label: 'Onboarding', path: '/onboarding', icon: GraduationCap },
  { label: 'Skill profile', path: '/skills', icon: BrainCircuit },
  { label: 'Assessments', path: '/assessments', icon: Target },
  { label: 'Role matcher', path: '/roles', icon: BriefcaseBusiness },
  { label: 'Resume lab', path: '/resume', icon: FileSearch },
  { label: 'Interview studio', path: '/interview', icon: MessageSquareText },
  { label: 'Voice lab', path: '/voice', icon: Mic },
]

const modules = [
  {
    title: 'Skill profile',
    description: 'Map your current strengths and identify skills to develop.',
    path: '/skills',
    icon: BrainCircuit,
    color: 'bg-violet-50 text-violet-700',
    label: 'Build your profile',
  },
  {
    title: 'Role matcher',
    description: 'Explore role fit, skill gaps and the capabilities employers seek.',
    path: '/roles',
    icon: BriefcaseBusiness,
    color: 'bg-blue-50 text-blue-700',
    label: 'Explore roles',
  },
  {
    title: 'Resume lab',
    description: 'Prepare to analyse your resume against a job description.',
    path: '/resume',
    icon: FileSearch,
    color: 'bg-amber-50 text-amber-700',
    label: 'Review your resume',
  },
  {
    title: 'Interview studio',
    description: 'Prepare for job-specific interview practice and feedback.',
    path: '/interview',
    icon: MessageSquareText,
    color: 'bg-emerald-50 text-emerald-700',
    label: 'Prepare to practise',
  },
]

function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-white px-5 py-6">
      <Link to="/" onClick={onNavigate} className="mb-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
          <GraduationCap size={23} />
        </div>
        <div>
          <div className="text-lg font-extrabold tracking-tight text-slate-900">
            CareerPilot<span className="text-indigo-600">.</span>
          </div>
          <div className="text-xs text-slate-500">Your career copilot</div>
        </div>
      </Link>

      <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        Workspace
      </div>

      <nav className="space-y-1">
        {navigation.map(({ label, path, icon: Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Icon size={19} />
            <span>{label}</span>
            {path === '/assessments' && (
              <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                Start
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-8">
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
            <Sparkles size={18} />
          </div>
          <p className="text-sm font-bold text-slate-800">Small steps. Real progress.</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Assess your skills, find your gaps, and build a focused practice plan.
          </p>
        </div>
        <div className="mt-5 flex items-center gap-2 px-1 text-xs text-slate-400">
          <ShieldCheck size={15} />
          <span>Built with privacy in mind</span>
        </div>
      </div>
    </div>
  )
}

function HealthStatus({ health }) {
  const isConnected = health?.data?.api === 'online' && health?.data?.db === 'connected'
  const hasError = health?.error
  const label = hasError
    ? 'API unavailable'
    : !health
      ? 'Checking connection'
      : isConnected
        ? 'Systems connected'
        : 'Database unavailable'

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
      <span className={`h-2 w-2 rounded-full ${
        isConnected ? 'bg-emerald-500' : hasError ? 'bg-rose-500' : 'bg-amber-400'
      }`} />
      {label}
    </div>
  )
}

function Dashboard({ health }) {
  const stats = [
    {
      label: 'Career readiness',
      value: '—',
      note: 'Measured after your first assessment',
      icon: Target,
      iconStyle: 'bg-indigo-50 text-indigo-700',
    },
    {
      label: 'Skill profile',
      value: 'Not set up',
      note: 'Your strengths and gaps will appear here',
      icon: BrainCircuit,
      iconStyle: 'bg-violet-50 text-violet-700',
    },
    {
      label: 'Assessments',
      value: 'Ready to begin',
      note: 'Start with a baseline assessment',
      icon: CheckCircle2,
      iconStyle: 'bg-emerald-50 text-emerald-700',
    },
  ]

  const stages = [
    { number: '01', title: 'Assess', text: 'Establish your current skill level.', active: true },
    { number: '02', title: 'Diagnose', text: 'Understand strengths and skill gaps.' },
    { number: '03', title: 'Practise', text: 'Work on the areas that need attention.' },
    { number: '04', title: 'Re-assess', text: 'Measure progress and adjust your focus.' },
  ]

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-36 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-indigo-100">
            <Sparkles size={14} />
            Your career journey starts here
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Build skills that move
            <span className="block text-indigo-300">your career forward.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
            Assess where you stand, understand what to improve, and practise with a clear direction.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/assessments"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-indigo-50"
            >
              Start your journey <ArrowRight size={17} />
            </Link>
            <Link
              to="/roles"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Explore career roles
            </Link>
          </div>
        </div>
      </section>

      <section>
        <DashboardInsights />
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Your roadmap</h2>
          <p className="mt-1 text-sm text-slate-500">A simple cycle for turning insights into progress.</p>
        </div>

        <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage, index) => (
            <div key={stage.number} className={`relative p-5 ${index > 0 ? 'border-t border-slate-100 sm:border-l xl:border-t-0' : ''}`}>
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                stage.active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {stage.number}
              </div>
              <h3 className="font-bold text-slate-800">{stage.title}</h3>
              <p className="mt-2 text-sm leading-5 text-slate-500">{stage.text}</p>
              <div className={`mt-4 text-xs font-semibold ${stage.active ? 'text-indigo-700' : 'text-slate-400'}`}>
                {stage.active ? 'Begin here' : 'Your next milestone'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Explore your workspace</h2>
            <p className="mt-1 text-sm text-slate-500">Choose an area to work on next.</p>
          </div>
          <span className="hidden items-center gap-1 text-xs text-slate-400 sm:inline-flex">
            <Activity size={14} /> Modules are being built in stages
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {modules.map(({ title, description, path, icon: Icon, color, label }) => (
            <Link
              key={title}
              to={path}
              className="group flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-100 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${color}`}>
                <Icon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-700">
                  {label} <ArrowUpRight size={14} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
              <ChevronRight size={18} className="mt-1 shrink-0 text-slate-300 transition group-hover:text-indigo-600" />
            </Link>
          ))}
        </div>
      </section>

      <footer className="flex flex-col gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>CareerPilot · Assess. Diagnose. Practise. Re-assess.</span>
        <span className="inline-flex items-center gap-1"><ShieldCheck size={13} /> Your progress dashboard</span>
      </footer>
    </div>
  )
}

function ModulePage({ title, description, icon: Icon }) {
  return (
    <section className="mx-auto max-w-3xl py-12">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
        <Icon size={26} />
      </div>
      <div className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">CareerPilot workspace</div>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-3 max-w-xl leading-7 text-slate-600">{description}</p>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-50 p-2 text-amber-700"><BookOpen size={20} /></div>
          <div>
            <h2 className="font-bold text-slate-900">This module is next in the build plan</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              The navigation is working, but this feature is not implemented yet. We will build its real functionality and connect it to the backend in upcoming steps. No sample results are being presented as real data.
            </p>
          </div>
        </div>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700">
          Back to overview <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  )
}

function AppLayout() {
  const { user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [health, setHealth] = useState(null)

  useEffect(() => {
    let active = true
    getHealth()
      .then((result) => {
        if (active) setHealth(result)
      })
      .catch(() => {
        if (active) setHealth({ error: true })
      })

    return () => { active = false }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200/80 transition-transform duration-200 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={21} />
            </button>
            <div>
              <div className="text-sm font-bold text-slate-900">Your workspace</div>
              <div className="text-xs text-slate-500">A clearer path to your next opportunity</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="max-w-40 truncate text-xs font-bold text-slate-800">{user?.displayName}</div>
              <div className="max-w-40 truncate text-[11px] text-slate-500">{user?.email}</div>
            </div>
            <button
              type="button"
              onClick={() => { void signOut() }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-8 sm:py-9">
          <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading module...</div>}><Routes>
            <Route path="/" element={<Dashboard health={health} />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/skills" element={<SkillProfilePage />} />
            <Route path="/assessments" element={<AssessmentPage />} />
            <Route path="/roles" element={<RoleMatchesPage />} />
            <Route path="/resume" element={<ResumeLabPage />} />
            <Route path="/interview" element={<InterviewStudioPage />} />
            <Route path="/voice" element={<VoiceLabPage />} />
            <Route path="*" element={<ModulePage title="Page not found" icon={BookOpen} description="This page does not exist in the current workspace." />} />
          </Routes></Suspense>
        </main>
      </div>
    </div>
  )
}

export default function Workspace() {
  return <AppLayout />
}
