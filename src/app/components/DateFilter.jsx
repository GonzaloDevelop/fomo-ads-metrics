'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

const PRESETS = [
    { label: 'Hoy', value: 'today' },
    { label: 'Ayer', value: 'yesterday' },
    { label: '7D', value: '7d' },
    { label: '14D', value: '14d' },
    { label: '30D', value: '30d' },
    { label: 'Este mes', value: 'this_month' },
    { label: '90D', value: '90d' },
];

export default function DateFilter({ datePreset, onDateChange, loading }) {
    const [showCustom, setShowCustom] = useState(false);
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    const applyCustom = () => {
        if (customFrom && customTo) {
            onDateChange('custom', { from: customFrom, to: customTo });
            setShowCustom(false);
        }
    };

    return (
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)]">
            <div className="flex gap-2 items-center flex-wrap">
                {PRESETS.map(p => (
                    <button
                        key={p.value}
                        className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border',
                            datePreset === p.value
                                ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                                : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                        )}
                        onClick={() => onDateChange(p.value)}
                        disabled={loading}
                    >
                        {p.label}
                    </button>
                ))}
                <button
                    className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border',
                        datePreset === 'custom'
                            ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                            : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    )}
                    onClick={() => setShowCustom(!showCustom)}
                    disabled={loading}
                >
                    <Calendar size={12} />
                    Personalizado
                </button>
            </div>

            {showCustom && (
                <div className="flex items-center gap-2 flex-wrap">
                    <input
                        type="date"
                        value={customFrom}
                        onChange={e => setCustomFrom(e.target.value)}
                        className="h-8 px-2.5 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--accent-primary)]"
                    />
                    <span className="text-[var(--text-secondary)] text-sm">&mdash;</span>
                    <input
                        type="date"
                        value={customTo}
                        onChange={e => setCustomTo(e.target.value)}
                        className="h-8 px-2.5 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--accent-primary)]"
                    />
                    <button
                        onClick={applyCustom}
                        disabled={!customFrom || !customTo}
                        className="h-8 px-4 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-medium disabled:opacity-40 cursor-pointer transition-opacity"
                    >
                        Aplicar
                    </button>
                </div>
            )}
        </div>
    );
}
