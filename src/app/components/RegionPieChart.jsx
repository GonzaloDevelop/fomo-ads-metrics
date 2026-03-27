'use client';

import { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { formatMetric } from '../_lib/metrics';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#A855F7',
    '#6366F1', '#84CC16', '#D946EF', '#0EA5E9',
];

export default function RegionPieChart({ regionData, currency }) {
    const data = useMemo(() => {
        if (!regionData?.length) return null;
        // Top 10 + "Otros"
        const top = regionData.slice(0, 10);
        const rest = regionData.slice(10);
        const otherSpend = rest.reduce((s, r) => s + r.spend, 0);
        const items = [...top];
        if (otherSpend > 0) items.push({ region: 'Otros', spend: otherSpend });
        return items;
    }, [regionData]);

    if (!data?.length) {
        return (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-6 text-center text-sm text-[var(--text-tertiary)]">
                Sin datos de regiones
            </div>
        );
    }

    const totalSpend = data.reduce((s, r) => s + r.spend, 0);

    const chartData = {
        labels: data.map(r => r.region),
        datasets: [{
            data: data.map(r => r.spend),
            backgroundColor: COLORS.slice(0, data.length),
            borderWidth: 2,
            borderColor: 'var(--bg-card)',
        }],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
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
                callbacks: {
                    label: (ctx) => {
                        const val = ctx.parsed;
                        const pct = ((val / totalSpend) * 100).toFixed(1);
                        return ` ${formatMetric(val, 'currency', currency)} (${pct}%)`;
                    },
                },
            },
        },
    };

    return (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Inversion por Provincia</h3>
            <div className="flex gap-6 items-start">
                <div className="w-[220px] h-[220px] flex-shrink-0">
                    <Pie data={chartData} options={options} />
                </div>
                <div className="flex-1 space-y-1.5 max-h-[220px] overflow-y-auto">
                    {data.map((r, i) => {
                        const pct = totalSpend > 0 ? ((r.spend / totalSpend) * 100).toFixed(1) : 0;
                        return (
                            <div key={r.region} className="flex items-center gap-2 text-xs">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                <span className="flex-1 text-[var(--text-primary)] truncate">{r.region}</span>
                                <span className="text-[var(--text-secondary)] tabular-nums">{formatMetric(r.spend, 'currency', currency)}</span>
                                <span className="text-[var(--text-tertiary)] w-10 text-right tabular-nums">{pct}%</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
