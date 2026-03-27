'use client';

import { formatMetric, METRIC_REGISTRY } from '../_lib/metrics';
import {
    DollarSign, ShoppingCart, TrendingUp, MessageCircle,
    Target, Users, CreditCard, BarChart3, MousePointerClick,
    Eye, Repeat, Link, Hash,
} from 'lucide-react';

const ICONS = {
    spend: CreditCard, cpc: DollarSign, cpm: DollarSign, cpp: DollarSign,
    cost_per_result: Target, cost_per_unique_click: DollarSign,
    cost_per_inline_link_click: DollarSign,
    impressions: Eye, reach: Users, frequency: Repeat,
    clicks: MousePointerClick, unique_clicks: MousePointerClick,
    inline_link_clicks: Link, ctr: BarChart3, inline_link_click_ctr: BarChart3,
    results: Target, revenue: TrendingUp, roas: TrendingUp,
};

const COLORS = {
    currency: 'bg-[var(--danger-bg)] text-[var(--danger)]',
    number: 'bg-[var(--info-bg)] text-[var(--info)]',
    percent: 'bg-[var(--success-bg)] text-[var(--success)]',
    decimal: 'bg-[var(--warning-bg)] text-[var(--warning)]',
    roas: 'bg-[var(--success-bg)] text-[var(--success)]',
};

export default function KPICards({ kpiData, selectedMetrics, allMetrics, currency }) {
    if (!kpiData) {
        return (
            <div className="text-center py-6 text-[var(--text-secondary)] text-sm">
                No hay datos para el periodo seleccionado
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {selectedMetrics.map(key => {
                const meta = allMetrics[key] || METRIC_REGISTRY[key];
                if (!meta) return null;
                const value = kpiData[key];
                const Icon = ICONS[key] || Hash;
                const color = COLORS[meta.type] || COLORS.number;

                return (
                    <div key={key} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-3.5 flex flex-col gap-1.5" style={{ boxShadow: 'var(--shadow-sm)' }}>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[var(--text-secondary)] truncate">{meta.label}</span>
                            <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${color}`}>
                                <Icon size={14} />
                            </div>
                        </div>
                        <p className="text-lg font-bold text-[var(--text-primary)]">
                            {formatMetric(value, meta.type, currency)}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
