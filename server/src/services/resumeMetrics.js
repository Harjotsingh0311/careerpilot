export function calculateResumeMatch(resumeSkills, mustHave, niceToHave) {
    const resume = new Set(resumeSkills.map(value => value.toLowerCase()));
    const required = [...new Set(mustHave)];
    const nice = [...new Set(niceToHave)];

    const requiredMatches = required.filter(
        skill => resume.has(skill.toLowerCase())
    );

    const niceMatches = nice.filter(
        skill => resume.has(skill.toLowerCase())
    );

    const requiredCoverage = required.length
        ? requiredMatches.length / required.length
        : 0;

    const niceCoverage = nice.length
        ? niceMatches.length / nice.length
        : 0;

    // Blueprint formula: 75% required coverage + 25% nice-to-have coverage.
    const matchPercentage = Math.round(
        100 * (0.75 * requiredCoverage + 0.25 * niceCoverage)
    );

    return {
        matchPercentage,
        requiredCoverage: Math.round(requiredCoverage * 100),
        niceCoverage: Math.round(niceCoverage * 100),
        requiredCount: required.length,
        requiredMatched: requiredMatches.length,
        niceCount: nice.length,
        niceMatched: niceMatches.length,
        matchedRequired: requiredMatches,
        missingRequired: required.filter(
            skill => !resume.has(skill.toLowerCase())
        ),
        matchedNice: niceMatches,
        missingNice: nice.filter(
            skill => !resume.has(skill.toLowerCase())
        )
    };
}

export function buildAtsChecks(resumeText, match) {
    const text = String(resumeText || '');
    const lower = text.toLowerCase();
    const lines = text.split(/\n/).map(line => line.trim()).filter(Boolean);

    const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
    const hasPhone = /\d(?:[\s().+-]*\d){9,}/.test(text);

    const hasEducation = /\beducation\b/i.test(text);
    const hasExperience = /\b(experience|projects?)\b/i.test(text);
    const hasSkills = /\bskills?\b/i.test(text);

    const hasProfessionalLink =
        /github\.com|linkedin\.com/i.test(text);

    const quantifiedLines = lines.filter(line => /\d/.test(line));
    const bulletLines = lines.filter(line =>
        /^(?:[-*•▪]\s+|\d+[.)]\s+)/.test(line)
    );

    const actionVerbs = new Set([
        'built', 'developed', 'designed', 'reduced', 'led', 'trained',
        'created', 'implemented', 'improved', 'increased', 'automated',
        'delivered', 'analysed', 'analyzed', 'managed', 'deployed',
        'optimised', 'optimized', 'engineered', 'launched', 'tested',
        'integrated', 'created', 'maintained', 'coordinated', 'measured',
        'evaluated', 'trained', 'resolved', 'streamlined', 'migrated'
    ]);

    const actionVerbLines = bulletLines.filter(line => {
        const content = line.replace(/^(?:[-*•▪]\s+|\d+[.)]\s+)/, '');
        const firstWord = (content.match(/^[A-Za-z]+/) || [''])[0].toLowerCase();
        return actionVerbs.has(firstWord);
    });

    const actionShare = bulletLines.length
        ? actionVerbLines.length / bulletLines.length
        : 0;

    const checks = [
        {
            check: 'Contact information',
            pass: hasEmail && hasPhone,
            tip: hasEmail && hasPhone
                ? 'An email address and a phone-number-like sequence were found.'
                : 'Include a professional email address and a contact phone number.'
        },
        {
            check: 'Standard sections',
            pass: hasEducation && hasExperience && hasSkills,
            tip: 'Use clear Education, Experience or Projects, and Skills section headings.'
        },
        {
            check: 'Professional links',
            pass: hasProfessionalLink,
            tip: 'Consider including a GitHub or LinkedIn profile link.'
        },
        {
            check: 'Quantified impact',
            pass: quantifiedLines.length >= 3,
            tip: quantifiedLines.length >= 3
                ? 'At least three lines contain numeric details.'
                : 'Add measurable outcomes, scale, counts, percentages, or timings to at least three lines.'
        },
        {
            check: 'Action-led bullet points',
            pass: bulletLines.length > 0 && actionShare >= 0.5,
            tip: bulletLines.length === 0
                ? 'Use bullet points for project and experience achievements.'
                : 'Start more bullet points with clear action verbs such as Built, Designed, Measured, or Improved.'
        },
        {
            check: 'Resume length',
            pass: text.length >= 1000 && text.length <= 8000,
            tip: text.length < 1000
                ? 'The extracted text is short; check whether important content is missing.'
                : text.length > 8000
                    ? 'The extracted text is lengthy; consider removing repetition and lower-priority detail.'
                    : 'The extracted length is within the configured student-resume heuristic. This is not a literal page count.'
        },
        {
            check: 'Required JD keywords',
            pass: match.requiredCount > 0 && match.requiredMatched > 0,
            tip: match.requiredCount === 0
                ? 'No required JD skills were extracted. Check the job description text and parsed requirements.'
                : match.missingRequired.length
                    ? `Review whether you can truthfully demonstrate: ${match.missingRequired.slice(0, 5).join(', ')}.`
                    : 'All extracted required JD skills were detected in the resume.'
        }
    ];

    const passed = checks.filter(item => item.pass).length;

    return {
        score: Math.round(100 * passed / checks.length),
        passed,
        total: checks.length,
        checks
    };
}

export function buildWeakBulletLines(text) {
    const lines = String(text || '').split(/\n/)
        .map(line => line.trim())
        .filter(line => /^(?:[-*•▪]\s+|\d+[.)]\s+)/.test(line));

    return lines
        .filter(line => !/\d/.test(line))
        .slice(0, 3)
        .map(line => line.slice(0, 250));
}


export function normalizeAiFeedback(value, sourceLines = [], matchPercentage = 0) {
    const input = value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};

    const fallbackExplanation =
        `The resume matches ${matchPercentage}% of the extracted job requirements. ` +
        'Review missing required skills and use the ATS checklist to prioritise improvements.';

    const explanation = typeof input.explanation === 'string' &&
        input.explanation.trim()
        ? input.explanation.trim().slice(0, 600)
        : fallbackExplanation.slice(0, 600);

    const candidates = Array.isArray(input.rewrites)
        ? input.rewrites.slice(0, 3)
        : [];

    const rewrites = candidates.map((entry, index) => {
        // The original must come from the actual resume, not model-generated text.
        const source = sourceLines[index];

        if (typeof source !== 'string' || !source.trim()) {
            return null;
        }

        let improved;
        let reason;

        if (typeof entry === 'string') {
            // Some models return a rewrite as a string instead of an object.
            improved = entry;
        } else if (
            entry &&
            typeof entry === 'object' &&
            !Array.isArray(entry)
        ) {
            improved =
                entry.improved ??
                entry.suggested ??
                entry.rewrite ??
                entry.rewrittenBullet ??
                entry.bullet ??
                entry.text;

            reason =
                entry.reason ??
                entry.rationale ??
                entry.why;
        } else {
            return null;
        }

        if (typeof improved !== 'string' || !improved.trim()) {
            return null;
        }

        if (typeof reason !== 'string' || !reason.trim()) {
            reason = 'Review this suggestion for accuracy before using it.';
        }

        return {
            original: source.trim().slice(0, 250),
            improved: improved.trim().slice(0, 350),
            reason: reason.trim().slice(0, 150)
        };
    }).filter(Boolean);

    return { explanation, rewrites };
}
