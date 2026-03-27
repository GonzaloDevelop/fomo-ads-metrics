/**
 * Date utilities — timezone-aware.
 * Default: America/Argentina/Buenos_Aires (UTC-3).
 */

const DEFAULT_TZ = 'America/Argentina/Buenos_Aires';

export function toLocalDate(date, tz = DEFAULT_TZ) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-CA', { timeZone: tz });
}

export function todayLocal(tz = DEFAULT_TZ) {
    return toLocalDate(new Date(), tz);
}

export function daysAgoLocal(n, tz = DEFAULT_TZ) {
    return toLocalDate(new Date(Date.now() - n * 864e5), tz);
}

export function computeDateRange(preset, customFrom, customTo, tz = DEFAULT_TZ) {
    const today = todayLocal(tz);
    const yesterday = daysAgoLocal(1, tz);

    switch (preset) {
        case 'today':
            return { from: today, to: today, days: 1 };
        case 'yesterday':
            return { from: yesterday, to: yesterday, days: 1 };
        case '3d':
            return { from: daysAgoLocal(3, tz), to: yesterday, days: 3 };
        case '7d':
            return { from: daysAgoLocal(7, tz), to: yesterday, days: 7 };
        case '14d':
            return { from: daysAgoLocal(14, tz), to: yesterday, days: 14 };
        case '30d':
            return { from: daysAgoLocal(30, tz), to: yesterday, days: 30 };
        case 'this_month': {
            const todayDate = new Date(todayLocal(tz) + 'T12:00:00');
            const firstOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString().split('T')[0];
            const diffMs = new Date(yesterday + 'T12:00:00') - new Date(firstOfMonth + 'T12:00:00');
            const days = Math.max(1, Math.round(diffMs / 864e5) + 1);
            return { from: firstOfMonth, to: yesterday, days };
        }
        case '90d':
            return { from: daysAgoLocal(90, tz), to: yesterday, days: 90 };
        case 'custom':
            if (customFrom && customTo) {
                const diffMs = new Date(customTo + 'T12:00:00') - new Date(customFrom + 'T12:00:00');
                const days = Math.max(1, Math.round(diffMs / 864e5) + 1);
                return { from: customFrom, to: customTo, days };
            }
            return { from: daysAgoLocal(30, tz), to: yesterday, days: 30 };
        default:
            return { from: daysAgoLocal(30, tz), to: yesterday, days: 30 };
    }
}

export function formatDateLabel(dateStr) {
    const dt = new Date(dateStr + 'T12:00:00');
    return dt.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}
