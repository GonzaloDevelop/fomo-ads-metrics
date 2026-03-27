'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, X, Search, ChevronDown } from 'lucide-react';
import { getMetricsByCategory } from '../_lib/metrics';

export default function MetricPicker({ allMetrics, selectedKeys, onToggle }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const categories = getMetricsByCategory(allMetrics);

    const filtered = {};
    for (const [cat, metrics] of Object.entries(categories)) {
        const matches = metrics.filter(m =>
            !search || m.label.toLowerCase().includes(search.toLowerCase()) || m.key.toLowerCase().includes(search.toLowerCase())
        );
        if (matches.length) filtered[cat] = matches;
    }

    return (
        <div className="relative">
            {/* Trigger */}
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-muted)] cursor-pointer transition-all"
            >
                <Plus size={14} />
                Metricas ({selectedKeys.length})
                <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
            </button>

            {/* Dropdown */}
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 w-[340px] max-h-[480px] overflow-y-auto bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] z-50" style={{ boxShadow: 'var(--shadow-md)' }}>
                        {/* Search */}
                        <div className="sticky top-0 bg-[var(--bg-card)] p-2 border-b border-[var(--border-primary)]">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Buscar metrica..."
                                    className="w-full h-8 pl-8 pr-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="p-1">
                            {Object.entries(filtered).map(([cat, metrics]) => (
                                <div key={cat} className="mb-1">
                                    <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-2 py-1.5">
                                        {cat}
                                    </p>
                                    {metrics.map(m => {
                                        const isSelected = selectedKeys.includes(m.key);
                                        return (
                                            <button
                                                key={m.key}
                                                onClick={() => onToggle(m.key)}
                                                className={cn(
                                                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left cursor-pointer transition-all text-xs',
                                                    isSelected
                                                        ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                                                        : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'
                                                )}
                                            >
                                                <span className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                                                    style={{
                                                        borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-secondary)',
                                                        backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                                                    }}
                                                >
                                                    {isSelected && <span className="text-white text-[8px]">✓</span>}
                                                </span>
                                                <span className="flex-1">{m.icon} {m.label}</span>
                                                <span className="text-[10px] text-[var(--text-tertiary)]">{m.type}</span>
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
