'use client';

import { useState, useMemo } from 'react';
import {
    Chart as ChartJS, CategoryScale, LinearScale,
    PointElement, LineElement, BarElement,
    Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatDateLabel } from '../_lib/dateUtils';
import { formatMetric, formatCompact, getMetricsByCategory, isInvertMetric } from '../_lib/metrics';
import { cn } from '@/lib/utils';
import { ChevronDown, Search, TrendingUp, TrendingDown } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// ============================
// Metric Selector Dropdown
// ============================
function MetricSelector({ allMetrics, availableKeys, selected, onSelect, label }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const available = {};
    for (const key of availableKeys) { if (allMetrics[key]) available[key] = allMetrics[key]; }
    const categories = getMetricsByCategory(available);
    const filtered = {};
    for (const [cat, metrics] of Object.entries(categories)) {
        const matches = metrics.filter(m => !search || m.label.toLowerCase().includes(search.toLowerCase()));
        if (matches.length) filtered[cat] = matches;
    }
    return (
        <div className="relative">
            <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-secondary)] text-sm text-[var(--text-primary)] hover:border-[var(--accent-primary)] cursor-pointer transition-all bg-[var(--bg-card)]">
                {allMetrics[selected]?.label || selected}
                <ChevronDown size={14} className={cn('text-[var(--text-tertiary)] transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} />
                    <div className="absolute top-full right-0 mt-1 w-[260px] max-h-[360px] overflow-y-auto bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] z-50" style={{ boxShadow: 'var(--shadow-md)' }}>
                        <div className="sticky top-0 bg-[var(--bg-card)] p-2 border-b border-[var(--border-primary)]">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar metrica..." autoFocus
                                    className="w-full h-8 pl-8 pr-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
                            </div>
                        </div>
                        <div className="p-1">
                            {Object.entries(filtered).map(([cat, metrics]) => (
                                <div key={cat} className="mb-1">
                                    <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-2 py-1">{cat}</p>
                                    {metrics.map(m => (
                                        <button key={m.key} onClick={() => { onSelect(m.key); setOpen(false); setSearch(''); }}
                                            className={cn('w-full px-2 py-1.5 rounded-lg text-left cursor-pointer transition-all text-xs',
                                                m.key === selected ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] font-medium' : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'
                                            )}>
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ============================
// Helpers
// ============================
function getColor(key) {
    if (key === 'revenue' || key === 'roas' || key.startsWith('action_values_')) return '#10B981';
    if (key === 'spend' || key.startsWith('cost_per_') || key === 'cpc' || key === 'cpm' || key === 'cpp') return '#EF4444';
    if (key === 'results') return '#8B5CF6';
    if (key === 'ctr' || key === 'inline_link_click_ctr') return '#F59E0B';
    return '#3B82F6';
}
function fmtDateCompact(d) {
    if (!d) return '';
    const dt = new Date(d + 'T12:00:00');
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return `${dt.getDate()}-${months[dt.getMonth()]}`;
}
function fmtCompactGeneric(v) {
    const a = Math.abs(v);
    if (a >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toFixed(0);
}

// ============================
// Main Component
// ============================
// Default chart metrics per objective
const CHART_DEFAULTS = {
    OUTCOME_SALES: { a: 'spend', b: 'revenue' },
    CONVERSIONS: { a: 'spend', b: 'revenue' },
    MESSAGES: { a: 'spend', b: 'results' },
    OUTCOME_LEADS: { a: 'spend', b: 'results' },
    LEAD_GENERATION: { a: 'spend', b: 'results' },
    _DEFAULT: { a: 'spend', b: 'clicks' },
};

export default function InsightsChart({ insights, previousInsights, allMetrics, currency, dateRange, prevDateRange, objective }) {
    const defaults = CHART_DEFAULTS[objective] || CHART_DEFAULTS._DEFAULT;
    const [mode, setMode] = useState('single');
    const [metricA, setMetricA] = useState(defaults.a);
    const [metricB, setMetricB] = useState(defaults.b);
    const [lastObjective, setLastObjective] = useState(objective);

    // Update defaults when objective changes
    if (objective !== lastObjective) {
        const newDefaults = CHART_DEFAULTS[objective] || CHART_DEFAULTS._DEFAULT;
        setMetricA(newDefaults.a);
        setMetricB(newDefaults.b);
        setLastObjective(objective);
    }

    const currentSorted = useMemo(() => [...insights].sort((a, b) => a.date.localeCompare(b.date)), [insights]);
    const prevSorted = useMemo(() => [...(previousInsights || [])].sort((a, b) => a.date.localeCompare(b.date)), [previousInsights]);

    const availableKeys = useMemo(() => {
        const keys = new Set();
        for (const row of insights) {
            for (const k of Object.keys(row)) {
                if (k !== 'date' && k !== 'result_type' && allMetrics[k]) keys.add(k);
            }
        }
        return [...keys];
    }, [insights, allMetrics]);

    const labels = currentSorted.map(d => formatDateLabel(d.date));

    if (!currentSorted.length) {
        return (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-8 text-center text-[var(--text-secondary)] text-sm">
                No hay datos de tendencia para este periodo
            </div>
        );
    }

    const metaA = allMetrics[metricA];
    const metaB = allMetrics[metricB];
    const colorA = getColor(metricA);
    const colorB = getColor(metricB);

    // Current values
    const valuesA = currentSorted.map(d => d[metricA] || 0);
    const totalA = valuesA.reduce((s, v) => s + v, 0);

    // Previous period values for metric A
    const prevValuesA = prevSorted.map(d => d[metricA] || 0);
    // Pad or trim to match current length
    while (prevValuesA.length < valuesA.length) prevValuesA.push(0);
    const totalPrevA = prevValuesA.reduce((s, v) => s + v, 0);

    // Delta calculation
    const deltaNum = totalPrevA > 0 ? ((totalA - totalPrevA) / totalPrevA) * 100 : 0;
    const invertedA = isInvertMetric(metricA);
    const isPositiveA = invertedA ? deltaNum <= 0 : deltaNum >= 0; // for color (semantic good/bad)
    const isIncreased = deltaNum >= 0; // for arrow direction (actual change direction)

    // Dual mode: values for metric B
    const valuesB = mode === 'dual' ? currentSorted.map(d => d[metricB] || 0) : [];
    const totalB = valuesB.reduce((s, v) => s + v, 0);

    // Dual axes when:
    // 1. Different metric types (currency vs number), OR
    // 2. Same type but scale differs >10x (e.g. spend $400K vs revenue $8M)
    const scaleRatio = mode === 'dual' && totalA > 0 && totalB > 0
        ? Math.max(totalA, totalB) / Math.min(totalA, totalB)
        : 1;
    const useDualAxis = mode === 'dual' && (metaA?.type !== metaB?.type || scaleRatio > 10);

    // Build datasets
    const datasets = [];

    if (mode === 'single') {
        // Current period — solid line
        datasets.push({
            label: metaA?.label || metricA,
            data: valuesA,
            borderColor: colorA,
            backgroundColor: `${colorA}18`,
            fill: true,
            tension: 0.45,
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: colorA,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            yAxisID: 'y',
        });
        // Previous period — dashed line
        if (prevSorted.length > 0) {
            datasets.push({
                label: `${metaA?.label || metricA} (anterior)`,
                data: prevValuesA.slice(0, valuesA.length),
                borderColor: '#b4b2a9',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.45,
                borderWidth: 1.5,
                borderDash: [5, 4],
                pointRadius: 0,
                pointHoverRadius: 4,
                pointBackgroundColor: '#b4b2a9',
                yAxisID: 'y',
            });
        }
    } else {
        // Dual mode — two solid lines
        datasets.push({
            label: metaA?.label || metricA,
            data: valuesA,
            borderColor: colorA,
            backgroundColor: `${colorA}12`,
            fill: true,
            tension: 0.45,
            borderWidth: 2.5,
            pointRadius: 2,
            pointHoverRadius: 5,
            yAxisID: 'y',
        });
        datasets.push({
            label: metaB?.label || metricB,
            data: valuesB,
            borderColor: colorB,
            backgroundColor: `${colorB}12`,
            fill: true,
            tension: 0.45,
            borderWidth: 2.5,
            pointRadius: 2,
            pointHoverRadius: 5,
            yAxisID: useDualAxis ? 'y1' : 'y',
        });
    }

    const fmtTick = (v, meta) => {
        if (meta?.type === 'currency') return formatCompact(v, currency);
        if (meta?.type === 'percent') return `${v.toFixed(1)}%`;
        return fmtCompactGeneric(v);
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1A1A1A',
                titleColor: '#FFFFFF',
                bodyColor: '#EDEDED',
                borderColor: '#2A2A2A',
                borderWidth: 0.5,
                cornerRadius: 8,
                padding: 10,
                titleFont: { size: 12, weight: '600' },
                bodyFont: { size: 12 },
                usePointStyle: true,
                callbacks: {
                    label: (ctx) => {
                        const dsIdx = ctx.datasetIndex;
                        const isSecond = mode === 'dual' && dsIdx === 1;
                        const meta = isSecond ? metaB : metaA;
                        const key = isSecond ? metricB : metricA;
                        return ` ${ctx.dataset.label}: ${formatMetric(ctx.parsed.y, meta?.type, currency)}`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { color: '#BFBFBF', font: { size: 11 }, maxTicksLimit: 7, autoSkip: true },
            },
            y: {
                position: 'left',
                grid: { color: '#2A2A2A', lineWidth: 1 },
                border: { display: false },
                ticks: { color: '#BFBFBF', font: { size: 11 }, callback: (v) => fmtTick(v, metaA) },
            },
            ...(useDualAxis ? {
                y1: {
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    border: { display: false },
                    ticks: { color: '#BFBFBF', font: { size: 11 }, callback: (v) => fmtTick(v, metaB) },
                },
            } : {}),
        },
    };

    return (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
                <div>
                    {/* Title + mode toggle */}
                    <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Rendimiento Diario</h3>
                        <div className="flex gap-0.5 p-0.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-primary)]">
                            <button onClick={() => setMode('single')} className={cn('px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-all', mode === 'single' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)]')}>
                                Una metrica
                            </button>
                            <button onClick={() => setMode('dual')} className={cn('px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-all', mode === 'dual' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)]')}>
                                Comparar
                            </button>
                        </div>
                    </div>

                    {/* Period info blocks */}
                    <div className="flex items-start gap-6 flex-wrap">
                        {/* Current period */}
                        <div className="flex items-start gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: colorA }} />
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">
                                    {fmtDateCompact(dateRange?.from)} → {fmtDateCompact(dateRange?.to)}
                                </span>
                                <span className="text-xs text-[var(--text-secondary)]">{metaA?.label || metricA}</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-bold text-[var(--text-primary)]">
                                        {metaA?.type === 'currency' ? formatCompact(totalA, currency) : formatMetric(totalA, metaA?.type, currency)}
                                    </span>
                                    {mode === 'single' && totalPrevA > 0 && (
                                        <span className={cn('text-xs font-semibold flex items-center gap-0.5', isPositiveA ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>
                                            {isIncreased ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                            {Math.abs(deltaNum).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Previous period (single mode) */}
                        {mode === 'single' && prevSorted.length > 0 && (
                            <div className="flex items-start gap-2.5">
                                <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 bg-[#b4b2a9]" />
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">
                                        {fmtDateCompact(prevDateRange?.from)} → {fmtDateCompact(prevDateRange?.to)}
                                    </span>
                                    <span className="text-xs text-[var(--text-secondary)]">{metaA?.label || metricA} (anterior)</span>
                                    <span className="text-xl font-bold text-[var(--text-secondary)]">
                                        {metaA?.type === 'currency' ? formatCompact(totalPrevA, currency) : formatMetric(totalPrevA, metaA?.type, currency)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Metric B info (dual mode) */}
                        {mode === 'dual' && (
                            <div className="flex items-start gap-2.5">
                                <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: colorB }} />
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">
                                        {fmtDateCompact(dateRange?.from)} → {fmtDateCompact(dateRange?.to)}
                                    </span>
                                    <span className="text-xs text-[var(--text-secondary)]">{metaB?.label || metricB}</span>
                                    <span className="text-xl font-bold text-[var(--text-primary)]">
                                        {metaB?.type === 'currency' ? formatCompact(totalB, currency) : formatMetric(totalB, metaB?.type, currency)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Metric selectors */}
                <div className="flex flex-col gap-2 items-end">
                    <MetricSelector allMetrics={allMetrics} availableKeys={availableKeys} selected={metricA} onSelect={setMetricA} />
                    {mode === 'dual' && (
                        <MetricSelector allMetrics={allMetrics} availableKeys={availableKeys} selected={metricB} onSelect={setMetricB} />
                    )}
                </div>
            </div>

            {/* Chart */}
            <div className="h-[300px]">
                <Line data={{ labels, datasets }} options={options} />
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 mt-3 pt-3 border-t border-[var(--border-primary)]">
                {mode === 'single' ? (
                    <>
                        <div className="flex items-center gap-1.5">
                            <span className="w-5 h-0.5 rounded-full" style={{ background: colorA }} />
                            <span className="text-[11px] text-[var(--text-secondary)]">{metaA?.label} (actual)</span>
                        </div>
                        {prevSorted.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <span className="w-5 h-0 border-t border-dashed border-[#b4b2a9]" />
                                <span className="text-[11px] text-[var(--text-secondary)]">{metaA?.label} (anterior)</span>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-1.5">
                            <span className="w-5 h-0.5 rounded-full" style={{ background: colorA }} />
                            <span className="text-[11px] text-[var(--text-secondary)]">{metaA?.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-5 h-0.5 rounded-full" style={{ background: colorB }} />
                            <span className="text-[11px] text-[var(--text-secondary)]">{metaB?.label}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
