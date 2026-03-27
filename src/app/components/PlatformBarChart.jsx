'use client';

import { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { formatMetric } from '../_lib/metrics';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const PLATFORM_LABELS = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    whatsapp_connected: 'WhatsApp',
    audience_network: 'Audience Network',
    an_classic: 'Audience Network',
    messenger: 'Messenger',
};

const PLATFORM_COLORS = {
    facebook: 'rgba(24, 119, 242, 0.80)',
    instagram: 'rgba(225, 48, 108, 0.80)',
    whatsapp_connected: 'rgba(37, 211, 102, 0.80)',
    audience_network: 'rgba(245, 158, 11, 0.80)',
    an_classic: 'rgba(245, 158, 11, 0.80)',
    messenger: 'rgba(0, 136, 255, 0.80)',
};

const PLATFORM_BORDER = {
    facebook: '#1877F2',
    instagram: '#E1306C',
    whatsapp_connected: '#25D366',
    audience_network: '#F59E0B',
    an_classic: '#F59E0B',
    messenger: '#0088FF',
};

export default function PlatformBarChart({ platformData, currency }) {
    const sorted = useMemo(() => {
        if (!platformData?.length) return [];
        return [...platformData].sort((a, b) => b.spend - a.spend);
    }, [platformData]);

    if (!sorted.length) {
        return (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-6 text-center text-sm text-[var(--text-tertiary)]">
                Sin datos de plataformas
            </div>
        );
    }

    const chartData = {
        labels: sorted.map(r => PLATFORM_LABELS[r.platform] || r.platform),
        datasets: [{
            data: sorted.map(r => r.spend),
            backgroundColor: sorted.map(r => PLATFORM_COLORS[r.platform] || 'rgba(99, 102, 241, 0.80)'),
            borderColor: sorted.map(r => PLATFORM_BORDER[r.platform] || '#6366F1'),
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
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Inversion por Plataforma</h3>
            <div style={{ height: '220px' }}>
                <Bar data={chartData} options={options} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                {sorted.map(r => {
                    const pct = total > 0 ? ((r.spend / total) * 100).toFixed(1) : 0;
                    const label = PLATFORM_LABELS[r.platform] || r.platform;
                    const color = PLATFORM_COLORS[r.platform] || 'rgba(99, 102, 241, 0.80)';
                    return (
                        <div key={r.platform} className="flex items-center gap-1.5 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className="text-[var(--text-primary)] font-medium">{label}</span>
                            <span className="text-[var(--text-secondary)] tabular-nums">{formatMetric(r.spend, 'currency', currency)}</span>
                            <span className="text-[var(--text-tertiary)]">({pct}%)</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
