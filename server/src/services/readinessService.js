export const READINESS_WEIGHTS = {
    technical: 0.30,
    interview: 0.25,
    roleFit: 0.20,
    delivery: 0.15,
    consistency: 0.10
};

export function calculateReadiness(components) {
    const normalised = components.map(component => ({
        ...component,
        available: Number.isFinite(component.score)
    }));

    const available = normalised.filter(component => component.available);

    const weightTotal = available.reduce(
        (sum, component) => sum + component.weight,
        0
    );

    const weightedTotal = available.reduce(
        (sum, component) => sum + component.score * component.weight,
        0
    );

    const score = weightTotal > 0
        ? Math.round(weightedTotal / weightTotal)
        : null;

    const signalsCount = available.length;

    let confidence = 'low';
    if (signalsCount >= 4) confidence = 'high';
    else if (signalsCount === 3) confidence = 'medium';

    return {
        score,
        signalsCount,
        totalSignals: components.length,
        confidence,
        components: normalised
    };
}

export function getIndiaDayKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);

    const values = Object.fromEntries(
        parts.map(part => [part.type, part.value])
    );

    return `${values.year}-${values.month}-${values.day}`;
}

export function shiftDayKey(day, offset) {
    const [year, month, date] = day.split('-').map(Number);
    const shifted = new Date(Date.UTC(year, month - 1, date + offset));

    return shifted.toISOString().slice(0, 10);
}

export function computeStreak(activityDays, today = getIndiaDayKey()) {
    const active = new Set(activityDays);

    let startOffset = 0;

    // A streak may continue from yesterday if today has not yet been active.
    if (!active.has(today) && active.has(shiftDayKey(today, -1))) {
        startOffset = -1;
    } else if (!active.has(today)) {
        return 0;
    }

    let streak = 0;

    for (let offset = startOffset; offset > -365; offset -= 1) {
        if (!active.has(shiftDayKey(today, offset))) break;
        streak += 1;
    }

    return streak;
}
