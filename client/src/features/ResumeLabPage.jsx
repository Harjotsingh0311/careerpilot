import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle, ArrowRight, Check, CheckCircle2, FileText,
    LoaderCircle, RefreshCw, ShieldCheck, Sparkles, Trash2,
    Upload, XCircle
} from 'lucide-react';
import api from '../lib/api';

const panel = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50';

function getError(error, fallback) {
    return error.response?.data?.error?.message || fallback;
}

function SkillChip({ children, type = 'neutral' }) {
    const styles = {
        matched: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        missing: 'border-amber-200 bg-amber-50 text-amber-900',
        neutral: 'border-slate-200 bg-slate-50 text-slate-700'
    };

    return (
        <span className={`inline-flex rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${styles[type]}`}>
            {children}
        </span>
    );
}

function DocumentInputPanel({
    kind,
    title,
    description,
    file,
    onFileChange,
    text,
    onTextChange,
    onSubmit,
    busy,
    documents,
    selectedId,
    onSelect,
    onDeleteOne
}) {
    const inputId = `document-file-${kind}`;
    const sameKind = documents.filter(document => document.kind === kind);
    const [mode, setMode] = useState('file');

    return (
        <section className={panel}>
            <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    kind === 'resume'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-violet-50 text-violet-700'
                }`}>
                    <FileText size={21} />
                </div>
                <div>
                    <h2 className="font-bold text-slate-900">{title}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button
                    type="button"
                    onClick={() => setMode('file')}
                    className={`rounded-lg px-3 py-2 text-xs font-bold ${
                        mode === 'file'
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-slate-500'
                    }`}
                >
                    Upload PDF/DOCX
                </button>
                <button
                    type="button"
                    onClick={() => setMode('text')}
                    className={`rounded-lg px-3 py-2 text-xs font-bold ${
                        mode === 'text'
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-slate-500'
                    }`}
                >
                    Paste text
                </button>
            </div>

            <form
                className="mt-4 space-y-3"
                onSubmit={event => {
                    event.preventDefault();
                    onSubmit(kind, mode);
                }}
            >
                {mode === 'file' ? (
                    <div>
                        <label
                            htmlFor={inputId}
                            className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 px-4 py-5 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40"
                        >
                            <Upload size={23} className="text-indigo-600" />
                            <span className="mt-3 text-sm font-bold text-slate-800">
                                {file?.name || 'Choose a PDF or DOCX'}
                            </span>
                            <span className="mt-1 text-xs leading-5 text-slate-500">
                                Maximum 5 MB · PDF up to 10 pages
                            </span>
                        </label>

                        <input
                            id={inputId}
                            type="file"
                            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={event => onFileChange(kind, event.target.files?.[0] || null)}
                            className="sr-only"
                        />
                    </div>
                ) : (
                    <div>
                        <label htmlFor={`document-text-${kind}`} className="mb-2 block text-xs font-bold text-slate-600">
                            Paste {kind === 'resume' ? 'resume' : 'job description'} text
                        </label>
                        <textarea
                            id={`document-text-${kind}`}
                            value={text}
                            onChange={event => onTextChange(kind, event.target.value)}
                            rows={7}
                            maxLength={20000}
                            placeholder="Paste the readable text here (at least 200 characters)..."
                            className="w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        />
                        <div className="mt-1 text-right text-[11px] text-slate-400">
                            {text.length.toLocaleString()} / 20,000 characters
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={busy || (mode === 'file' ? !file : text.trim().length < 200)}
                    className={`${button} w-full bg-indigo-600 text-white hover:bg-indigo-700`}
                >
                    {busy
                        ? <LoaderCircle size={16} className="animate-spin" />
                        : <Upload size={16} />
                    }
                    {busy ? 'Processing document...' : 'Save and extract skills'}
                </button>
            </form>

            <div className="mt-5 border-t border-slate-100 pt-4">
                <label htmlFor={`choose-document-${kind}`} className="mb-2 block text-xs font-bold text-slate-600">
                    Stored {kind === 'resume' ? 'resumes' : 'job descriptions'}
                </label>

                {sameKind.length === 0 ? (
                    <p className="text-xs leading-5 text-slate-400">
                        No stored documents of this type yet.
                    </p>
                ) : (
                    <>
                        <select
                            id={`choose-document-${kind}`}
                            value={selectedId}
                            onChange={event => onSelect(kind, event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        >
                            <option value="">Choose a stored document...</option>
                            {sameKind.map(document => (
                                <option key={document.id} value={document.id}>
                                    {document.name} · {new Date(document.createdAt).toLocaleDateString()}
                                </option>
                            ))}
                        </select>

                        {selectedId && (
                            <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3">
                                <div className="min-w-0">
                                    <div className="break-words text-xs font-semibold text-slate-700">
                                        {sameKind.find(document => document.id === selectedId)?.name}
                                    </div>
                                    <div className="mt-1 text-[11px] text-slate-400">
                                        {sameKind.find(document => document.id === selectedId)?.extractedSkills?.length || 0} extracted skills
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onDeleteOne(selectedId)}
                                    className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800"
                                >
                                    <Trash2 size={13} /> Delete
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}

function MatchRing({ score }) {
    return (
        <div
            className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full p-2"
            style={{
                background: `conic-gradient(#4f46e5 ${score}%, #e2e8f0 ${score}%)`
            }}
            aria-label={`Resume to job-description match: ${score}%`}
        >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
                <span className="text-3xl font-extrabold text-slate-900">{score}%</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Match
                </span>
            </div>
        </div>
    );
}

function SkillGroup({ title, skills, type, emptyMessage }) {
    return (
        <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                {title} <span className="ml-1 text-slate-400">({skills.length})</span>
            </div>
            {skills.length ? (
                <div className="flex flex-wrap gap-2">
                    {skills.map(skill => (
                        <SkillChip key={skill} type={type}>{skill}</SkillChip>
                    ))}
                </div>
            ) : (
                <p className="text-xs leading-5 text-slate-400">{emptyMessage}</p>
            )}
        </div>
    );
}

function AnalysisView({ analysis }) {
    const { resume, jobDescription, match, ats, aiFeedback } = analysis;

    return (
        <div className="space-y-5">
            <section className={`${panel} overflow-hidden`}>
                <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                    <MatchRing score={match.matchPercentage} />

                    <div className="flex-1">
                        <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                            Resume vs job description
                        </div>
                        <h2 className="mt-2 text-xl font-bold text-slate-900">
                            {jobDescription.roleTitle || jobDescription.name || 'Role match report'}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            The score combines required-skill coverage (75%) and nice-to-have coverage (25%). These are keyword-based estimates, not a guarantee of ATS performance or hiring success.
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-xl bg-slate-50 p-3">
                                <div className="text-xs text-slate-500">Required skills</div>
                                <div className="mt-1 text-lg font-extrabold text-slate-900">
                                    {match.requiredMatched}/{match.requiredCount}
                                </div>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                                <div className="text-xs text-slate-500">Required coverage</div>
                                <div className="mt-1 text-lg font-extrabold text-slate-900">
                                    {match.requiredCoverage}%
                                </div>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                                <div className="text-xs text-slate-500">Nice-to-have</div>
                                <div className="mt-1 text-lg font-extrabold text-slate-900">
                                    {match.niceMatched}/{match.niceCount}
                                </div>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                                <div className="text-xs text-slate-500">ATS checklist</div>
                                <div className="mt-1 text-lg font-extrabold text-slate-900">
                                    {ats.score}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
                <article className={panel}>
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-indigo-600" />
                        <h3 className="font-bold text-slate-900">Resume evidence</h3>
                    </div>
                    <p className="mt-2 break-words text-xs text-slate-500">{resume.name}</p>

                    <div className="mt-5 space-y-5">
                        <SkillGroup
                            title="Matched required skills"
                            skills={match.matchedRequired}
                            type="matched"
                            emptyMessage="No required skills were matched."
                        />
                        <SkillGroup
                            title="Missing required skills"
                            skills={match.missingRequired}
                            type="missing"
                            emptyMessage="No required skill gaps were detected."
                        />
                        <SkillGroup
                            title="Matched nice-to-have"
                            skills={match.matchedNice}
                            type="matched"
                            emptyMessage="No optional skill matches were found."
                        />
                    </div>
                </article>

                <article className={panel}>
                    <div className="flex items-center gap-2">
                        <TargetIcon />
                        <h3 className="font-bold text-slate-900">Job description requirements</h3>
                    </div>
                    <p className="mt-2 break-words text-xs text-slate-500">{jobDescription.name}</p>

                    {jobDescription.seniority && jobDescription.seniority !== 'unknown' && (
                        <span className="mt-3 inline-flex rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold capitalize text-violet-700">
                            {jobDescription.seniority}
                        </span>
                    )}

                    <div className="mt-5 space-y-5">
                        <SkillGroup
                            title="Required skills"
                            skills={jobDescription.mustHave}
                            type="neutral"
                            emptyMessage="No required skills were extracted. Review the JD text or enable AI extraction."
                        />
                        <SkillGroup
                            title="Nice-to-have skills"
                            skills={jobDescription.niceToHave}
                            type="neutral"
                            emptyMessage="No optional skills were extracted."
                        />
                        {jobDescription.mustHave.length > 0 && (
                            <SkillGroup
                                title="Unmatched requirements"
                                skills={match.missingRequired}
                                type="missing"
                                emptyMessage="All extracted required skills were detected in the resume."
                            />
                        )}
                    </div>
                </article>
            </section>

            <section className={panel}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={19} className="text-emerald-700" />
                            <h3 className="text-lg font-bold text-slate-900">ATS-style checklist</h3>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            Seven deterministic checks. Each result includes a practical tip.
                        </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                        {ats.passed}/{ats.total} passed
                    </span>
                </div>

                <div className="mt-5 divide-y divide-slate-100">
                    {ats.checks.map(item => (
                        <div key={item.check} className="flex items-start gap-3 py-4">
                            {item.pass
                                ? <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-600" />
                                : <AlertCircle size={19} className="mt-0.5 shrink-0 text-amber-600" />
                            }
                            <div className="flex-1">
                                <div className="text-sm font-bold text-slate-800">{item.check}</div>
                                <p className="mt-1 text-xs leading-5 text-slate-500">{item.tip}</p>
                            </div>
                            <span className={`text-xs font-bold ${item.pass ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {item.pass ? 'Pass' : 'Review'}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            <section className={panel}>
                <div className="flex items-center gap-2">
                    <Sparkles size={19} className="text-violet-600" />
                    <h3 className="text-lg font-bold text-slate-900">AI explanation and bullet rewrites</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{aiFeedback.explanation}</p>

                {aiFeedback.available && aiFeedback.rewrites?.length > 0 && (
                    <div className="mt-5 space-y-4">
                        {aiFeedback.rewrites.map((rewrite, index) => (
                            <div key={`${rewrite.original}-${index}`} className="rounded-xl border border-slate-200 p-4">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Original bullet</div>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{rewrite.original}</p>
                                <div className="mt-4 text-xs font-bold uppercase tracking-wider text-emerald-700">Suggested rewrite</div>
                                <p className="mt-2 text-sm leading-6 text-slate-800">{rewrite.improved}</p>
                                <p className="mt-2 text-xs leading-5 text-slate-500">{rewrite.reason}</p>
                            </div>
                        ))}
                    </div>
                )}

                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                    Review every suggested rewrite before using it. Keep only claims that accurately reflect your real experience.
                </p>
            </section>
        </div>
    );
}

function TargetIcon() {
    return <Check size={18} className="text-violet-600" />;
}

export default function ResumeLabPage() {
    const [documents, setDocuments] = useState([]);
    const [resumeId, setResumeId] = useState('');
    const [jdId, setJdId] = useState('');
    const [files, setFiles] = useState({ resume: null, jd: null });
    const [texts, setTexts] = useState({ resume: '', jd: '' });
    const [busyKind, setBusyKind] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [analysis, setAnalysis] = useState(null);

    const selectedResume = useMemo(
        () => documents.find(document => document.id === resumeId),
        [documents, resumeId]
    );

    const selectedJd = useMemo(
        () => documents.find(document => document.id === jdId),
        [documents, jdId]
    );

    const loadDocuments = useCallback(async () => {
        const response = await api.get('/documents');
        const nextDocuments = response.data.data.documents || [];
        setDocuments(nextDocuments);
        return nextDocuments;
    }, []);

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const response = await api.get('/documents');

                if (!active) return;

                const nextDocuments = response.data.data.documents || [];
                setDocuments(nextDocuments);
                setResumeId(nextDocuments.find(item => item.kind === 'resume')?.id || '');
                setJdId(nextDocuments.find(item => item.kind === 'jd')?.id || '');
            } catch (requestError) {
                if (active) {
                    setError(getError(
                        requestError,
                        'Could not load your documents. Make sure the backend is running.'
                    ));
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        load();
        return () => { active = false; };
    }, []);

    function changeFile(kind, file) {
        setFiles(previous => ({ ...previous, [kind]: file }));
        setError('');
        setNotice('');
    }

    function changeText(kind, text) {
        setTexts(previous => ({ ...previous, [kind]: text }));
        setError('');
        setNotice('');
    }

    function chooseDocument(kind, id) {
        if (kind === 'resume') setResumeId(id);
        else setJdId(id);

        setAnalysis(null);
        setError('');
    }

    async function addDocument(kind, mode) {
        setBusyKind(kind);
        setError('');
        setNotice('');
        setAnalysis(null);

        try {
            let response;

            if (mode === 'file') {
                const file = files[kind];

                if (!file) {
                    setError('Choose a PDF or DOCX file first.');
                    return;
                }

                const body = new FormData();
                body.append('kind', kind);
                body.append('file', file);

                response = await api.post('/documents', body);
            } else {
                const text = texts[kind].trim();

                if (text.length < 200) {
                    setError('Please provide at least 200 characters of readable text.');
                    return;
                }

                response = await api.post('/documents/text', {
                    kind,
                    name: kind === 'resume' ? 'Pasted resume' : 'Pasted job description',
                    text
                });
            }

            const savedDocument = response.data.data.document;
            const nextDocuments = await loadDocuments();

            if (kind === 'resume') setResumeId(savedDocument.id);
            else setJdId(savedDocument.id);

            setNotice(
                response.data.data.cacheHit
                    ? 'This document matched a saved text-hash cache entry. It was reused without a new AI extraction.'
                    : `${kind === 'resume' ? 'Resume' : 'Job description'} saved and processed.`
            );

            if (savedDocument.aiWarning) {
                setNotice(previous => `${previous} ${savedDocument.aiWarning}`);
            }

            if (mode === 'file') {
                setFiles(previous => ({ ...previous, [kind]: null }));
            } else {
                setTexts(previous => ({ ...previous, [kind]: '' }));
            }

            setDocuments(nextDocuments);
        } catch (requestError) {
            setError(getError(
                requestError,
                'The document could not be processed. Check its format and try again.'
            ));
        } finally {
            setBusyKind('');
        }
    }

    async function runAnalysis() {
        if (!selectedResume || !selectedJd) {
            setError('Choose both a stored resume and a stored job description.');
            return;
        }

        if (selectedResume.kind !== 'resume' || selectedJd.kind !== 'jd') {
            setError('Select a resume in the left panel and a job description in the right panel.');
            return;
        }

        setAnalyzing(true);
        setError('');
        setNotice('');
        setAnalysis(null);

        try {
            const response = await api.post('/documents/analyze', {
                resumeId,
                jdId
            });

            setAnalysis(response.data.data.analysis);
            setNotice('Analysis complete. Match and ATS numbers were calculated by the backend.');
        } catch (requestError) {
            setError(getError(
                requestError,
                'Resume/JD analysis failed. Check the selected documents and try again.'
            ));
        } finally {
            setAnalyzing(false);
        }
    }

    async function deleteOne(id) {
        const document = documents.find(item => item.id === id);
        if (!document) return;

        const confirmed = window.confirm(
            `Delete "${document.name}" permanently from your CareerPilot account?`
        );

        if (!confirmed) return;

        setError('');
        setNotice('');
        setAnalysis(null);

        try {
            await api.delete(`/documents/${id}`);
            const remaining = await loadDocuments();

            if (resumeId === id) {
                setResumeId(remaining.find(item => item.kind === 'resume')?.id || '');
            }
            if (jdId === id) {
                setJdId(remaining.find(item => item.kind === 'jd')?.id || '');
            }

            setNotice('Document permanently deleted.');
        } catch (requestError) {
            setError(getError(requestError, 'Could not delete this document.'));
        }
    }

    async function deleteMyData() {
        const confirmed = window.confirm(
            'This permanently deletes every stored resume and job description from your CareerPilot account. It does not delete your account, skills, or assessment results. Continue?'
        );

        if (!confirmed) return;

        setDeleting(true);
        setError('');
        setNotice('');
        setAnalysis(null);

        try {
            const response = await api.delete('/documents');

            setDocuments([]);
            setResumeId('');
            setJdId('');
            setFiles({ resume: null, jd: null });
            setTexts({ resume: '', jd: '' });

            setNotice(
                `Deleted ${response.data.data.deletedCount} stored document(s).`
            );
        } catch (requestError) {
            setError(getError(requestError, 'Could not delete your document data.'));
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-9">
                <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl" />
                <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-200">
                            <Sparkles size={15} /> Resume & JD lab
                        </div>
                        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                            Make your resume job-specific.
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                            Compare your resume against a real job description, identify missing skills, and review a deterministic ATS-style checklist.
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-300">
                        <ShieldCheck size={15} className="text-emerald-300" />
                        Private to your account
                    </div>
                </div>
            </section>

            {error && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                    <XCircle size={17} className="mt-0.5 shrink-0" /> {error}
                </div>
            )}
            {notice && (
                <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> {notice}
                </div>
            )}

            {loading ? (
                <section className={panel}>
                    <LoaderCircle size={18} className="mr-2 inline animate-spin text-indigo-600" />
                    Loading your stored documents...
                </section>
            ) : (
                <section className="grid gap-5 lg:grid-cols-2">
                    <DocumentInputPanel
                        kind="resume"
                        title="Your resume"
                        description="Upload your current resume or paste its readable text."
                        file={files.resume}
                        onFileChange={changeFile}
                        text={texts.resume}
                        onTextChange={changeText}
                        onSubmit={addDocument}
                        busy={busyKind === 'resume'}
                        documents={documents}
                        selectedId={resumeId}
                        onSelect={chooseDocument}
                        onDeleteOne={deleteOne}
                    />
                    <DocumentInputPanel
                        kind="jd"
                        title="Job description"
                        description="Use the exact job description you intend to apply for."
                        file={files.jd}
                        onFileChange={changeFile}
                        text={texts.jd}
                        onTextChange={changeText}
                        onSubmit={addDocument}
                        busy={busyKind === 'jd'}
                        documents={documents}
                        selectedId={jdId}
                        onSelect={chooseDocument}
                        onDeleteOne={deleteOne}
                    />
                </section>
            )}

            <section className={`${panel} flex flex-col justify-between gap-4 sm:flex-row sm:items-center`}>
                <div>
                    <h2 className="font-bold text-slate-900">Ready to compare?</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        Select one stored resume and one stored JD above. Both must belong to your account.
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                        {documents.length} stored document(s) · Documents expire after 30 days.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => void loadDocuments().catch(error => setError(getError(error, 'Could not refresh documents.')))}
                        className={`${button} border border-slate-200 text-slate-600 hover:bg-slate-50`}
                    >
                        <RefreshCw size={15} /> Refresh
                    </button>
                    <button
                        type="button"
                        disabled={analyzing || !resumeId || !jdId}
                        onClick={() => void runAnalysis()}
                        className={`${button} bg-indigo-600 text-white hover:bg-indigo-700`}
                    >
                        {analyzing
                            ? <LoaderCircle size={16} className="animate-spin" />
                            : <ArrowRight size={16} />
                        }
                        {analyzing ? 'Analysing...' : 'Analyse resume vs JD'}
                    </button>
                    <button
                        type="button"
                        disabled={deleting || documents.length === 0}
                        onClick={() => void deleteMyData()}
                        className={`${button} border border-rose-200 text-rose-700 hover:bg-rose-50`}
                    >
                        {deleting
                            ? <LoaderCircle size={15} className="animate-spin" />
                            : <Trash2 size={15} />
                        }
                        Delete my data
                    </button>
                </div>
            </section>

            {analysis ? (
                <AnalysisView analysis={analysis} />
            ) : (
                <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                        <FileText size={26} />
                    </div>
                    <h2 className="mt-4 text-lg font-bold text-slate-900">Your comparison report will appear here</h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        Save both documents, choose them in the panels, and start the analysis to see the match ring, skill gaps, ATS checklist and any available AI feedback.
                    </p>
                </section>
            )}

            <p className="text-xs leading-5 text-slate-400">
                Privacy note: original uploaded files are processed in memory and are not kept as files on the server. CareerPilot stores extracted text and parsed fields for your account so you can reopen or delete them. AI extraction and rewrites require a configured Groq API key.
            </p>
        </div>
    );
}
