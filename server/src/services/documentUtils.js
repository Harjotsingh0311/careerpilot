import crypto from 'node:crypto';

export function cleanText(value) {
    return String(value || '')
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map(line => line.replace(/[ \t]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, 20000);
}
export function hashText(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

export function normalizeSkillName(value) {
    return String(value ?? '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9+#. ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function makeSkillLookup(catalog) {
    const lookup = new Map();

    for (const skill of catalog) {
        lookup.set(normalizeSkillName(skill.name), skill.name);

        for (const alias of skill.aliases || []) {
            lookup.set(normalizeSkillName(alias), skill.name);
        }
    }

    return lookup;
}

export function normalizeSkills(values, lookup) {
    const result = new Set();

    for (const value of values || []) {
        const canonical = lookup.get(normalizeSkillName(value));
        if (canonical) result.add(canonical);
    }

    return [...result];
}

export function scanSkillsInText(text, catalog) {
    // Longer names first, so C++ is considered before C and JavaScript
    // before any shorter related token. Overlapping matches are ignored.
    const terms = [];

    for (const skill of catalog) {
        terms.push({ term: skill.name, canonical: skill.name });

        for (const alias of skill.aliases || []) {
            terms.push({ term: alias, canonical: skill.name });
        }
    }

    terms.sort((a, b) => b.term.length - a.term.length);

    const source = String(text || '');
    const occupied = [];
    const found = new Set();

    for (const item of terms) {
        const term = normalizeSkillName(item.term);
        if (!term) continue;

        const pattern = new RegExp(
            `(?<![a-z0-9])${escapeRegex(term).replace(/\s+/g, '\\s+')}(?![a-z0-9])`,
            'giu'
        );

        for (const match of source.matchAll(pattern)) {
            const start = match.index;
            const end = start + match[0].length;

            const overlaps = occupied.some(
                range => start < range.end && end > range.start
            );

            if (overlaps) continue;

            occupied.push({ start, end });
            found.add(item.canonical);
        }
    }

    return [...found].sort((a, b) => a.localeCompare(b));
}
