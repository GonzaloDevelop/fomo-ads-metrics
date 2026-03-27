'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { formatMetric } from '../_lib/metrics';

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

export default function CampaignTable({
    data, type = 'campaign', metricKeys, allMetrics, currency,
    selectedCampaignId, onSelectCampaign, selectedAdSetId, onSelectAdSet,
}) {
    const [sortKey, setSortKey] = useState('spend');
    const [sortDir, setSortDir] = useState('desc');

    const nameKey = type === 'campaign' ? 'campaign_name' : 'name';

    const sorted = useMemo(() => {
        return [...data].sort((a, b) => {
            const av = a[sortKey] ?? '';
            const bv = b[sortKey] ?? '';
            if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
            return sortDir === 'asc' ? av - bv : bv - av;
        });
    }, [data, sortKey, sortDir]);

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    if (!data.length) {
        return <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">Sin datos</p>;
    }

    const isClickable = (type === 'campaign' && onSelectCampaign) || (type === 'adset' && onSelectAdSet);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-[var(--border-primary)]">
                        {/* Name column */}
                        <th
                            onClick={() => toggleSort(nameKey)}
                            className="cursor-pointer whitespace-nowrap select-none px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] sticky left-0 bg-[var(--bg-card)] z-10"
                        >
                            {type === 'campaign' ? 'Campaña' : type === 'adset' ? 'Conjunto' : 'Anuncio'}
                            <SortIcon active={sortKey === nameKey} dir={sortDir} />
                        </th>
                        {type === 'campaign' && (
                            <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">Objetivo</th>
                        )}
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">Estado</th>
                        {/* Dynamic metric columns */}
                        {metricKeys.map(key => {
                            const meta = allMetrics[key];
                            if (!meta) return null;
                            return (
                                <th
                                    key={key}
                                    onClick={() => toggleSort(key)}
                                    className="cursor-pointer whitespace-nowrap select-none px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                >
                                    {meta.label}
                                    <SortIcon active={sortKey === key} dir={sortDir} />
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((row, idx) => {
                        const isSelected =
                            (type === 'campaign' && row.id === selectedCampaignId) ||
                            (type === 'adset' && row.id === selectedAdSetId);

                        return (
                            <tr
                                key={row.id || idx}
                                onClick={() => {
                                    if (type === 'campaign' && onSelectCampaign) onSelectCampaign(row.id === selectedCampaignId ? null : row.id);
                                    if (type === 'adset' && onSelectAdSet) onSelectAdSet(row.id === selectedAdSetId ? null : row.id);
                                }}
                                className={cn(
                                    'border-b border-[var(--border-primary)] last:border-0 transition-colors',
                                    isClickable && 'cursor-pointer',
                                    isSelected ? 'bg-[var(--accent-muted)]' : 'hover:bg-[var(--row-hover)]'
                                )}
                            >
                                <td className="px-3 py-2.5 sticky left-0 bg-inherit z-10">
                                    <div className="flex items-center gap-2 max-w-[220px]">
                                        {type === 'ad' && row.thumbnail_url && (
                                            <img src={row.thumbnail_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                                        )}
                                        <span className="font-medium text-[var(--text-primary)] truncate text-xs" title={row[nameKey]}>
                                            {row[nameKey] || '—'}
                                        </span>
                                    </div>
                                </td>
                                {type === 'campaign' && (
                                    <td className="px-3 py-2.5 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                                        {OBJECTIVE_LABELS[row.objective] || row.objective || '—'}
                                    </td>
                                )}
                                <td className="px-3 py-2.5"><StatusBadge status={row.status} /></td>
                                {metricKeys.map(key => {
                                    const meta = allMetrics[key];
                                    if (!meta) return null;
                                    return (
                                        <td key={key} className="px-3 py-2.5 whitespace-nowrap text-xs text-[var(--text-primary)]">
                                            {formatMetric(row[key], meta.type, currency)}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function SortIcon({ active, dir }) {
    if (!active) return <ArrowUpDown size={10} className="inline ml-1 opacity-30" />;
    return dir === 'asc'
        ? <ArrowUp size={11} className="inline ml-1" />
        : <ArrowDown size={11} className="inline ml-1" />;
}
