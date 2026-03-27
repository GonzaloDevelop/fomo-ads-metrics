'use client';

import { useMemo } from 'react';
import { formatMetric } from '../_lib/metrics';
import { cn } from '@/lib/utils';

/**
 * Ecommerce funnel: Click anuncio → Visita web → Ve producto → Inicia Checkout → Compra
 * Each step shows: count, % from top (click anuncio), % drop from previous step.
 */

const FUNNEL_STEPS = [
    { key: 'actions_link_click',       label: 'Click anuncio',   color: '#3B82F6' },
    { key: 'actions_landing_page_view', label: 'Visita web',     color: '#06B6D4' },
    { key: 'actions_view_content',      label: 'Ve producto',    color: '#8B5CF6' },
    { key: 'actions_initiate_checkout', label: 'Inicia Checkout', color: '#F59E0B' },
    { key: 'actions_purchase',          label: 'Compra',         color: '#10B981' },
];

// Also check alternative keys Meta may report
const ALT_KEYS = {
    'actions_link_click': ['actions_link_click', 'inline_link_clicks'],
    'actions_landing_page_view': ['actions_landing_page_view', 'actions_offsite_conversion.fb_pixel_landing_page_view'],
    'actions_view_content': ['actions_view_content', 'actions_offsite_conversion.fb_pixel_view_content'],
    'actions_initiate_checkout': ['actions_initiate_checkout', 'actions_offsite_conversion.fb_pixel_initiate_checkout'],
    'actions_purchase': ['actions_purchase', 'actions_offsite_conversion.fb_pixel_purchase', 'actions_omni_purchase'],
};

function getValue(data, primaryKey) {
    const alts = ALT_KEYS[primaryKey] || [primaryKey];
    for (const key of alts) {
        if (data[key] && data[key] > 0) return data[key];
    }
    return 0;
}

export default function FunnelChart({ kpiData, currency }) {
    const steps = useMemo(() => {
        if (!kpiData) return [];
        return FUNNEL_STEPS.map(step => ({
            ...step,
            value: getValue(kpiData, step.key),
        }));
    }, [kpiData]);

    const topValue = steps[0]?.value || 0;

    if (!topValue) {
        return (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-6 text-center text-sm text-[var(--text-tertiary)]">
                Sin datos de funnel para este periodo
            </div>
        );
    }

    return (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-5">Funnel de Conversion</h3>
            <div className="space-y-2">
                {steps.map((step, i) => {
                    const pctFromTop = topValue > 0 ? (step.value / topValue) * 100 : 0;
                    const prevValue = i > 0 ? steps[i - 1].value : step.value;
                    const dropPct = prevValue > 0 ? ((prevValue - step.value) / prevValue) * 100 : 0;
                    const barWidth = Math.max(pctFromTop, 3); // min 3% width for visibility

                    return (
                        <div key={step.key}>
                            {/* Drop indicator between steps */}
                            {i > 0 && dropPct > 0 && (
                                <div className="flex items-center gap-2 py-1 pl-4">
                                    <svg width="12" height="12" viewBox="0 0 12 12" className="text-[var(--danger)]">
                                        <path d="M6 2 L6 10 M3 7 L6 10 L9 7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <span className="text-[11px] text-[var(--danger)]">
                                        -{dropPct.toFixed(1)}% abandono
                                    </span>
                                </div>
                            )}

                            {/* Step bar */}
                            <div className="flex items-center gap-3">
                                <div className="w-[120px] flex-shrink-0 text-right">
                                    <span className="text-xs font-medium text-[var(--text-primary)]">{step.label}</span>
                                </div>
                                <div className="flex-1 relative">
                                    <div className="h-10 rounded-lg bg-[var(--bg-elevated)] overflow-hidden">
                                        <div
                                            className="h-full rounded-lg flex items-center px-3 transition-all duration-500"
                                            style={{
                                                width: `${barWidth}%`,
                                                backgroundColor: `${step.color}20`,
                                                borderLeft: `3px solid ${step.color}`,
                                            }}
                                        >
                                            <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums whitespace-nowrap">
                                                {formatMetric(step.value, 'number', currency)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-[60px] text-right flex-shrink-0">
                                    <span className={cn(
                                        'text-xs font-semibold tabular-nums',
                                        pctFromTop >= 50 ? 'text-[var(--success)]' : pctFromTop >= 20 ? 'text-[var(--warning)]' : 'text-[var(--danger)]'
                                    )}>
                                        {pctFromTop.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            {topValue > 0 && steps[steps.length - 1].value > 0 && (
                <div className="mt-4 pt-3 border-t border-[var(--border-primary)] flex items-center justify-between">
                    <span className="text-xs text-[var(--text-secondary)]">Tasa de conversion total</span>
                    <span className="text-sm font-bold text-[var(--success)]">
                        {((steps[steps.length - 1].value / topValue) * 100).toFixed(2)}%
                    </span>
                </div>
            )}
        </div>
    );
}
