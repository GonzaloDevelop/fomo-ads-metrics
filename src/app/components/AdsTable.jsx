'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Settings2, Search } from 'lucide-react';
import { formatMetric, getHeatColor, getMetricsByCategory } from '../_lib/metrics';

const PAGE_SIZE = 25;

const OBJECTIVE_LABELS = {
    OUTCOME_SALES: 'Ventas', OUTCOME_LEADS: 'Leads', LEAD_GENERATION: 'Lead Gen',
    MESSAGES: 'Mensajes', CONVERSIONS: 'Conversiones', OUTCOME_ENGAGEMENT: 'Interaccion',
    OUTCOME_TRAFFIC: 'Trafico', LINK_CLICKS: 'Clics', OUTCOME_AWARENESS: 'Reconocimiento', REACH: 'Alcance',
};

function StatusBadge({ status }) {
    const isActive = status === 'ACTIVE';
    return (
        <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap',
            isActive ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)]'
        )}>
            {isActive ? 'Activo' : status === 'PAUSED' ? 'Pausado' : status}
        </span>
    );
}

function SortIcon({ active, dir }) {
    if (!active) return <ArrowUpDown size={10} className="inline ml-1 opacity-30" />;
    return dir === 'asc'
        ? <ArrowUp size={11} className="inline ml-1" />
        : <ArrowDown size={11} className="inline ml-1" />;
}

function ColumnConfigDropdown({ allMetrics, metricKeys, onMetricsChange }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const categories = getMetricsByCategory(allMetrics);
    const filtered = {};
    for (const [cat, metrics] of Object.entries(categories)) {
        const matches = metrics.filter(m => !search || m.label.toLowerCase().includes(search.toLowerCase()));
        if (matches.length) filtered[cat] = matches;
    }
    const toggle = (key) => {
        const next = metricKeys.includes(key) ? metricKeys.filter(k => k !== key) : [...metricKeys, key];
        onMetricsChange(next);
    };
    return (
        <div className="relative">
            <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-muted)] cursor-pointer transition-all">
                <Settings2 size={14} />
                Columnas
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} />
                    <div className="absolute top-full right-0 mt-1 w-[280px] max-h-[400px] overflow-y-auto bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] z-50" style={{ boxShadow: 'var(--shadow-md)' }}>
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
                                    {metrics.map(m => {
                                        const on = metricKeys.includes(m.key);
                                        return (
                                            <button key={m.key} onClick={() => toggle(m.key)}
                                                className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left cursor-pointer transition-all text-xs',
                                                    on ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]' : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]')}>
                                                <span className="w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0"
                                                    style={{ borderColor: on ? 'var(--accent-primary)' : 'var(--border-secondary)', backgroundColor: on ? 'var(--accent-primary)' : 'transparent' }}>
                                                    {on && <span className="text-white text-[7px]">✓</span>}
                                                </span>
                                                <span className="flex-1 truncate">{m.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function AdsTable({
    campaigns, adSets, ads,
    metricKeys, allMetrics, currency, onMetricsChange,
}) {
    const [activeLevel, setActiveLevel] = useState('campaigns');
    const [sortKey, setSortKey] = useState('spend');
    const [sortDir, setSortDir] = useState('desc');
    const [page, setPage] = useState(0);
    const [selectedCampaignId, setSelectedCampaignId] = useState(null);
    const [selectedAdSetId, setSelectedAdSetId] = useState(null);

    // Current data based on active level
    const currentData = useMemo(() => {
        switch (activeLevel) {
            case 'campaigns': return campaigns;
            case 'adsets': {
                if (selectedCampaignId) return adSets.filter(a => a.campaign_id === selectedCampaignId);
                return adSets;
            }
            case 'ads': {
                let result = ads;
                if (selectedCampaignId) result = result.filter(a => a.campaign_id === selectedCampaignId);
                if (selectedAdSetId) result = result.filter(a => a.adset_id === selectedAdSetId);
                return result;
            }
            default: return [];
        }
    }, [activeLevel, campaigns, adSets, ads, selectedCampaignId, selectedAdSetId]);

    const nameKey = activeLevel === 'campaigns' ? 'campaign_name' : 'name';

    // Sort
    const sorted = useMemo(() => {
        return [...currentData].sort((a, b) => {
            let av = a[sortKey];
            let bv = b[sortKey];
            // Normalize nulls
            if (av == null) av = typeof bv === 'string' ? '' : 0;
            if (bv == null) bv = typeof av === 'string' ? '' : 0;
            // Both strings → localeCompare
            if (typeof av === 'string' && typeof bv === 'string') {
                return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
            }
            // Numeric
            const na = typeof av === 'number' ? av : parseFloat(av) || 0;
            const nb = typeof bv === 'number' ? bv : parseFloat(bv) || 0;
            return sortDir === 'asc' ? na - nb : nb - na;
        });
    }, [currentData, sortKey, sortDir]);

    // Compute min/max per metric for heat map coloring
    const metricRanges = useMemo(() => {
        const ranges = {};
        for (const key of metricKeys) {
            const values = currentData.map(r => r[key]).filter(v => v != null && !isNaN(v) && v !== 0);
            if (values.length < 2) { ranges[key] = null; continue; }
            ranges[key] = { min: Math.min(...values), max: Math.max(...values) };
        }
        return ranges;
    }, [currentData, metricKeys]);

    // Pagination
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    const switchLevel = (level) => {
        setActiveLevel(level);
        setPage(0);
    };

    // Counts (filtered)
    const adSetCount = selectedCampaignId ? adSets.filter(a => a.campaign_id === selectedCampaignId).length : adSets.length;
    const adCount = (() => {
        let r = ads;
        if (selectedCampaignId) r = r.filter(a => a.campaign_id === selectedCampaignId);
        if (selectedAdSetId) r = r.filter(a => a.adset_id === selectedAdSetId);
        return r.length;
    })();

    const tabs = [
        { key: 'campaigns', label: 'Campañas', count: campaigns.length },
        { key: 'adsets', label: 'Conjuntos', count: adSetCount },
        { key: 'ads', label: 'Anuncios', count: adCount },
    ];

    // Active filter info
    const selectedCampaignName = selectedCampaignId
        ? campaigns.find(c => c.id === selectedCampaignId)?.campaign_name
        : null;
    const selectedAdSetName = selectedAdSetId
        ? adSets.find(a => a.id === selectedAdSetId)?.name
        : null;

    return (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)]">
            {/* Tabs */}
            <div className="flex items-center border-b border-[var(--border-primary)] px-4">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => switchLevel(tab.key)}
                        className={cn(
                            'px-4 py-3 text-sm font-medium cursor-pointer transition-all border-b-2 -mb-px',
                            activeLevel === tab.key
                                ? 'text-[var(--accent-primary)] border-[var(--accent-primary)]'
                                : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
                        )}
                    >
                        {tab.label} ({tab.count})
                    </button>
                ))}

                {/* Active filters + column config */}
                <div className="ml-auto flex items-center gap-2">
                    {selectedCampaignName && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--accent-muted)] text-xs text-[var(--accent-primary)]">
                            Campaña: <strong className="truncate max-w-[140px]">{selectedCampaignName}</strong>
                            <button onClick={() => { setSelectedCampaignId(null); setSelectedAdSetId(null); setPage(0); }} className="hover:opacity-70 cursor-pointer font-bold">×</button>
                        </span>
                    )}
                    {selectedAdSetName && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--info-bg)] text-xs text-[var(--info)]">
                            Conjunto: <strong className="truncate max-w-[140px]">{selectedAdSetName}</strong>
                            <button onClick={() => { setSelectedAdSetId(null); setPage(0); }} className="hover:opacity-70 cursor-pointer font-bold">×</button>
                        </span>
                    )}
                    {onMetricsChange && (
                        <ColumnConfigDropdown allMetrics={allMetrics} metricKeys={metricKeys} onMetricsChange={onMetricsChange} />
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[var(--table-head-bg)] border-b border-[var(--border-primary)]">
                            <th
                                onClick={() => toggleSort(nameKey)}
                                className="cursor-pointer whitespace-nowrap select-none px-4 py-2.5 text-left text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] sticky left-0 bg-[var(--table-head-bg)] z-10 min-w-[220px]"
                            >
                                {activeLevel === 'campaigns' ? 'Campaña' : activeLevel === 'adsets' ? 'Conjunto' : 'Anuncio'}
                                <SortIcon active={sortKey === nameKey} dir={sortDir} />
                            </th>
                            {activeLevel === 'campaigns' && (
                                <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">
                                    Objetivo
                                </th>
                            )}
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">
                                Estado
                            </th>
                            {metricKeys.map(key => {
                                const meta = allMetrics[key];
                                if (!meta) return null;
                                return (
                                    <th
                                        key={key}
                                        onClick={() => toggleSort(key)}
                                        className="cursor-pointer whitespace-nowrap select-none px-4 py-2.5 text-right text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    >
                                        {meta.label}
                                        <SortIcon active={sortKey === key} dir={sortDir} />
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {paged.length === 0 && (
                            <tr>
                                <td colSpan={99} className="px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">
                                    Sin datos
                                </td>
                            </tr>
                        )}
                        {paged.map((row, idx) => {
                            const isEven = idx % 2 === 0;
                            const isClickable = activeLevel === 'campaigns' || activeLevel === 'adsets';

                            return (
                                <tr
                                    key={row.id || idx}
                                    onClick={() => {
                                        if (activeLevel === 'campaigns') {
                                            setSelectedCampaignId(row.id === selectedCampaignId ? null : row.id);
                                            setSelectedAdSetId(null);
                                            switchLevel('adsets');
                                        } else if (activeLevel === 'adsets') {
                                            setSelectedAdSetId(row.id === selectedAdSetId ? null : row.id);
                                            switchLevel('ads');
                                        }
                                    }}
                                    className={cn(
                                        'border-b border-[var(--border-primary)] last:border-0 transition-colors',
                                        isClickable && 'cursor-pointer',
                                        !isEven && 'bg-[var(--row-alt)]',
                                        'hover:bg-[var(--row-hover)]'
                                    )}
                                >
                                    <td className="px-4 py-3 sticky left-0 bg-inherit z-10">
                                        <div className="flex items-center gap-2 max-w-[280px]">
                                            {activeLevel === 'ads' && row.thumbnail_url && (
                                                <img src={row.thumbnail_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                                            )}
                                            <span className="font-medium text-[var(--text-primary)] truncate text-[13px]" title={row[nameKey]}>
                                                {row[nameKey] || '—'}
                                            </span>
                                        </div>
                                    </td>
                                    {activeLevel === 'campaigns' && (
                                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                                            {OBJECTIVE_LABELS[row.objective] || row.objective || '—'}
                                        </td>
                                    )}
                                    <td className="px-4 py-3">
                                        <StatusBadge status={row.status} />
                                    </td>
                                    {metricKeys.map(key => {
                                        const meta = allMetrics[key];
                                        if (!meta) return null;
                                        const val = row[key];
                                        const range = metricRanges[key];
                                        const heatBg = range ? getHeatColor(val, range.min, range.max, key) : 'transparent';
                                        return (
                                            <td
                                                key={key}
                                                className="px-4 py-3 whitespace-nowrap text-xs text-[var(--text-primary)] text-right tabular-nums"
                                                style={{ backgroundColor: heatBg }}
                                            >
                                                {formatMetric(val, meta.type, currency)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-primary)] bg-[var(--table-head-bg)]">
                    <p className="text-xs text-[var(--text-secondary)]">
                        {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} de {sorted.length}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 cursor-pointer transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i}
                                onClick={() => setPage(i)}
                                className={cn(
                                    'flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium cursor-pointer transition-all',
                                    page === i
                                        ? 'bg-[var(--accent-primary)] text-white'
                                        : 'border border-[var(--border-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                )}
                            >
                                {i + 1}
                            </button>
                        )).slice(
                            // Show max 7 page buttons around current page
                            Math.max(0, page - 3),
                            Math.min(totalPages, page + 4)
                        )}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 cursor-pointer transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
