'use client';

import { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { formatMetric } from '../_lib/metrics';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const AGE_ORDER = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

export default function AgeBarChart({ ageData, currency }) {
    const sorted = useMemo(() => {
        if (!ageData?.length) return [];
        return [...ageData].sort((a, b) => {
            const ai = AGE_ORDER.indexOf(a.age);
            const bi = AGE_ORDER.indexOf(b.age);
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });
    }, [ageData]);

    if (!sorted.length) {
        return (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-6 text-center text-sm text-[var(--text-tertiary)]">
                Sin datos de edad
            </div>
        );
    }

    const chartData = {
        labels: sorted.map(r => r.age),
        datasets: [{
            data: sorted.map(r => r.spend),
            backgroundColor: 'rgba(255, 45, 45, 0.70)',
            borderColor: '#FF2D2D',
            borderWidth: 1,
            borderRadius: 4,
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
                    label: (ctx) => ` ${formatMetric(ctx.parsed.y, 'currency', currency)}`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#BFBFBF', font: { size: 11 } },
                border: { color: 'rgba(128,128,128,0.2)' },
            },
            y: {
                grid: { color: 'rgba(128,128,128,0.1)' },
                ticks: {
                    color: '#BFBFBF',
                    font: { size: 11 },
                    callback: (val) => formatMetric(val, 'currency', currency),
                },
                border: { color: 'rgba(128,128,128,0.2)' },
            },
        },
    };

    const total = sorted.reduce((s, r) => s + r.spend, 0);

    return (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Inversion por Rango de Edad</h3>
            <div style={{ height: '220px' }}>
                <Bar data={chartData} options={options} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                {sorted.map(r => {
                    const pct = total > 0 ? ((r.spend / total) * 100).toFixed(1) : 0;
                    return (
                        <div key={r.age} className="flex items-center gap-1.5 text-xs">
                            <span className="text-[var(--text-primary)] font-medium">{r.age}</span>
                            <span className="text-[var(--text-secondary)] tabular-nums">{formatMetric(r.spend, 'currency', currency)}</span>
                            <span className="text-[var(--text-tertiary)]">({pct}%)</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
