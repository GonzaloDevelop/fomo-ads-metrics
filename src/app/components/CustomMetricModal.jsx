'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, X, Search, Calculator } from 'lucide-react';
import { getMetricsByCategory } from '../_lib/metrics';

/**
 * Modal to create custom calculated metrics.
 * Formula: metricA (operator) metricB
 * Stored in user settings.
 */
export default function CustomMetricModal({ allMetrics, onSave, onClose }) {
    const [name, setName] = useState('');
    const [metricA, setMetricA] = useState('');
    const [operator, setOperator] = useState('/');
    const [metricB, setMetricB] = useState('');
    const [format, setFormat] = useState('currency');
    const [searchA, setSearchA] = useState('');
    const [searchB, setSearchB] = useState('');
    const [pickingA, setPickingA] = useState(false);
    const [pickingB, setPickingB] = useState(false);

    const categories = getMetricsByCategory(allMetrics);

    const handleSave = () => {
        if (!name || !metricA || !metricB) return;
        onSave({
            id: `custom_${Date.now()}`,
            name,
            metricA,
            operator,
            metricB,
            format,
        });
    };

    const MetricPick = ({ search, setSearch, selected, onSelect, open, setOpen }) => {
        if (!open) return null;
        const filtered = {};
        for (const [cat, metrics] of Object.entries(categories)) {
            const matches = metrics.filter(m => !search || m.label.toLowerCase().includes(search.toLowerCase()));
            if (matches.length) filtered[cat] = matches;
        }
        return (
            <div className="absolute top-full left-0 mt-1 w-[280px] max-h-[300px] overflow-y-auto bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] z-50" style={{ boxShadow: 'var(--shadow-md)' }}>
                <div className="sticky top-0 bg-[var(--bg-card)] p-2 border-b border-[var(--border-primary)]">
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." autoFocus
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
                                        m.key === selected ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]' : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]')}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] w-full max-w-md p-6 space-y-4" style={{ boxShadow: 'var(--shadow-md)' }} onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            <Calculator size={18} />
                            Crear metrica personalizada
                        </h3>
                        <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer">
                            <X size={18} className="text-[var(--text-tertiary)]" />
                        </button>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Nombre</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Ticket Promedio"
                            className="w-full h-9 px-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
                    </div>

                    {/* Formula */}
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Formula</label>
                        <div className="flex items-center gap-2">
                            {/* Metric A */}
                            <div className="flex-1 relative">
                                <button onClick={() => { setPickingA(!pickingA); setPickingB(false); }}
                                    className="w-full h-9 px-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-sm text-left cursor-pointer hover:border-[var(--accent-primary)] truncate">
                                    {metricA ? (allMetrics[metricA]?.label || metricA) : <span className="text-[var(--text-muted)]">Metrica A</span>}
                                </button>
                                <MetricPick search={searchA} setSearch={setSearchA} selected={metricA} onSelect={setMetricA} open={pickingA} setOpen={setPickingA} />
                            </div>

                            {/* Operator */}
                            <select value={operator} onChange={e => setOperator(e.target.value)} className="w-14 text-center">
                                <option value="/">/</option>
                                <option value="*">×</option>
                                <option value="+">+</option>
                                <option value="-">−</option>
                            </select>

                            {/* Metric B */}
                            <div className="flex-1 relative">
                                <button onClick={() => { setPickingB(!pickingB); setPickingA(false); }}
                                    className="w-full h-9 px-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-sm text-left cursor-pointer hover:border-[var(--accent-primary)] truncate">
                                    {metricB ? (allMetrics[metricB]?.label || metricB) : <span className="text-[var(--text-muted)]">Metrica B</span>}
                                </button>
                                <MetricPick search={searchB} setSearch={setSearchB} selected={metricB} onSelect={setMetricB} open={pickingB} setOpen={setPickingB} />
                            </div>
                        </div>

                        {/* Preview */}
                        {metricA && metricB && (
                            <p className="text-xs text-[var(--text-tertiary)] mt-2">
                                = {allMetrics[metricA]?.label} {operator} {allMetrics[metricB]?.label}
                            </p>
                        )}
                    </div>

                    {/* Format */}
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Formato del resultado</label>
                        <select value={format} onChange={e => setFormat(e.target.value)} className="w-full">
                            <option value="currency">Moneda ($)</option>
                            <option value="number">Numero</option>
                            <option value="percent">Porcentaje (%)</option>
                            <option value="decimal">Decimal</option>
                        </select>
                    </div>

                    <button onClick={handleSave} disabled={!name || !metricA || !metricB}
                        className="w-full h-9 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium disabled:opacity-40 cursor-pointer transition-opacity flex items-center justify-center gap-2">
                        <Plus size={14} />
                        Crear metrica
                    </button>
                </div>
            </div>
        </>
    );
}
