function round1(value) {
    return Math.round(value * 10) / 10;
}

function average(values) {
    if (!values.length) return null;

    return round1(
        values.reduce((sum, value) => sum + value, 0) / values.length * 10
    );
}

function evaluatedTurns(session) {
    return (session.turns || []).filter(turn =>
        typeof turn.answer === 'string' &&
        turn.answer.trim().length > 0 &&
        turn.evaluation
    );
}

export function calculateInterviewMetrics(session) {
    const turns = session.turns || [];
    const completed = evaluatedTurns(session);

    const technical = completed
        .filter(turn => ['jd', 'fundamental'].includes(turn.kind))
        .map(turn => turn.evaluation.score);

    const resumeDepth = completed
        .filter(turn => turn.kind === 'resume')
        .map(turn => turn.evaluation.score);

    const behavioral = completed
        .filter(turn => turn.kind === 'behavioral')
        .map(turn => turn.evaluation.score);

    const scores = completed.map(turn => turn.evaluation.score);
    const clarity = completed.map(turn => turn.evaluation.clarity);
    const correctness = completed.map(turn => turn.evaluation.correctness);

    return {
        overallScore: average(scores) ?? 0,
        categoryScores: {
            technical: average(technical),
            resumeDepth: average(resumeDepth),
            behavioral: average(behavioral)
        },
        communicationScore: average(clarity) ?? 0,
        correctnessScore: average(correctness) ?? 0,
        completionRate: turns.length
            ? round1(completed.length / turns.length * 100)
            : 0,
        questionsAnswered: completed.length,
        questionsTotal: turns.length
    };
}

export function collectInterviewFeedback(session) {
    const strengths = [];
    const gaps = [];

    for (const turn of session.turns || []) {
        for (const item of turn.evaluation?.strengths || []) {
            if (typeof item === 'string' && !strengths.includes(item)) {
                strengths.push(item);
            }
        }

        for (const item of turn.evaluation?.gaps || []) {
            if (typeof item === 'string' && !gaps.includes(item)) {
                gaps.push(item);
            }
        }
    }

    return {
        strengths: strengths.slice(0, 10),
        gaps: gaps.slice(0, 10)
    };
}
