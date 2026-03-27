'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash2, DollarSign, TrendingUp, AlertCircle, Loader2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { getHeatColor } from '../_lib/metrics';
import { addSale, deleteSale, getSales } from '../_actions/sales';
import { toast } from 'sonner';

function fmt(n, type, currency) {
    if (n == null || isNaN(n)) return '—';
    if (type === 'currency') return new Intl.NumberFormat('es-AR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
    if (type === 'percent') return `${n.toFixed(2)}%`;
    if (type === 'roas') return n > 0 ? `${n.toFixed(2)}x` : '—';
    return new Intl.NumberFormat('es-AR').format(Math.round(n));
}

// --- Column definitions ---

const C = {
    // Meta
    ad_format:          { key: 'ad_format',              label: 'Formato',                    type: 'badge' },
    ad_status:          { key: 'ad_status',              label: 'Estado',                     type: 'status' },
    // Resultados
    spend:              { key: 'spend',                  label: 'Inversión',                  type: 'currency' },
    results:            { key: 'results',                label: 'Resultados',                 type: 'number' },
    cost_result:        { key: 'cost_result',            label: 'Costo por Resultado',        type: 'currency' },
    revenue:            { key: 'revenue',                label: 'Valor Conv. Compras',        type: 'currency' },
    roas:               { key: 'roas',                   label: 'ROAS',                       type: 'roas' },
    ticket:             { key: 'ticket',                 label: 'Valor Conv. Promedio',       type: 'currency' },
    purchases:          { key: 'purchases',              label: 'Compras',                    type: 'number' },
    cpa:                { key: 'cpa',                    label: 'Costo por Compra',           type: 'currency' },
    // Funnel de ventas
    pct_compras_landing: { key: 'pct_compras_landing',   label: '% Compras/Landing',          type: 'percent' },
    pct_compras:        { key: 'pct_compras',            label: '% Compras/Checkouts',        type: 'percent' },
    initiate_checkout:  { key: 'initiate_checkout',      label: 'Pagos Iniciados',            type: 'number' },
    cost_checkout:      { key: 'cost_checkout',          label: 'Costo/Pago Iniciado',        type: 'currency' },
    pct_checkout:       { key: 'pct_checkout',           label: '% Checkout/Carritos',        type: 'percent' },
    add_to_cart:        { key: 'add_to_cart',            label: 'Artículos al Carrito',       type: 'number' },
    cost_add_to_cart:   { key: 'cost_add_to_cart',       label: 'Costo/Artículo al Carrito',  type: 'currency' },
    pct_carritos:       { key: 'pct_carritos',           label: '% Carritos/Vis. Contenido',  type: 'percent' },
    view_content:       { key: 'view_content',           label: 'Vis. de Contenido',          type: 'number' },
    cost_view_content:  { key: 'cost_view_content',      label: 'Costo/Vis. Contenido',       type: 'currency' },
    pct_ver_contenido:  { key: 'pct_ver_contenido',      label: '% Vis. Contenido/Landing',   type: 'percent' },
    // Tráfico
    landing_views:      { key: 'landing_page_views',     label: 'Visitas a Landing',          type: 'number' },
    cost_landing:       { key: 'cost_landing',           label: 'Costo/Visita Landing',       type: 'currency' },
    pct_visitas:        { key: 'pct_visitas',            label: '% Visitas/Clics Salientes',  type: 'percent' },
    outbound_clicks:    { key: 'outbound_clicks',        label: 'Clics Salientes',            type: 'number' },
    outbound_ctr:       { key: 'outbound_clicks_ctr',    label: '% Clics Salientes',          type: 'percent' },
    cost_outbound:      { key: 'cost_outbound',          label: 'Costo/Clic Saliente',        type: 'currency' },
    // Clics únicos
    unique_link_clicks: { key: 'unique_link_clicks',     label: 'Clics Únicos Enlace',        type: 'number' },
    cost_unique_link:   { key: 'cost_unique_link',       label: 'Costo/Clic Único Enlace',    type: 'currency' },
    ctr_unique_link:    { key: 'ctr_unique_link',        label: 'CTR Único (Enlace)',          type: 'percent' },
    // Mensajes
    messages:           { key: 'messages',               label: 'Conversaciones',             type: 'number' },
    cost_message:       { key: 'cost_message',           label: 'Costo/Conversación',         type: 'currency' },
    pct_mensajes:       { key: 'pct_mensajes',           label: '% Mensajes/Clics Únicos',    type: 'percent' },
    // Leads
    leads:              { key: 'leads',                  label: 'Clientes Potenciales',       type: 'number' },
    cost_lead:          { key: 'cost_lead',              label: 'Costo por Lead',             type: 'currency' },
    tasa_leads:         { key: 'tasa_leads',             label: 'Tasa Conv. Leads',           type: 'percent' },
    tasa_leads_web:     { key: 'tasa_leads_web',         label: 'Tasa Conv. Leads Web',       type: 'percent' },
    // Video
    hook_rate:          { key: 'hook_rate',              label: 'Hook Rate (3s)',              type: 'percent' },
    video_avg_time:     { key: 'video_avg_time',         label: 'Tiempo Prom. Video',         type: 'decimal' },
    // General
    impressions:        { key: 'impressions',            label: 'Impresiones',                type: 'number' },
    reach:              { key: 'reach',                  label: 'Alcance',                    type: 'number' },
    frequency:          { key: 'frequency',              label: 'Frecuencia',                 type: 'decimal' },
    cpm:                { key: 'cpm',                    label: 'CPM',                        type: 'currency' },
    cpp:                { key: 'cpp',                    label: 'Costo/1.000 Alcanzadas',     type: 'currency' },
    clicks:             { key: 'clicks',                 label: 'Clics',                      type: 'number' },
    ctr:                { key: 'ctr',                    label: 'CTR',                        type: 'percent' },
    cpc:                { key: 'cpc',                    label: 'CPC',                        type: 'currency' },
};

function getColumnsForObjective(objective, hasVideo, hasRevenue) {
    const base = (() => {
        switch (objective) {
            case 'OUTCOME_SALES':
            case 'CONVERSIONS':
                return [
                    C.ad_format, C.ad_status, C.spend, C.revenue, C.roas, C.purchases, C.cpa, C.ticket,
                    C.pct_compras_landing, C.pct_compras, C.initiate_checkout, C.cost_checkout,
                    C.pct_checkout, C.add_to_cart, C.cost_add_to_cart, C.pct_carritos,
                    C.view_content, C.cost_view_content, C.pct_ver_contenido,
                    C.landing_views, C.cost_landing, C.pct_visitas,
                    C.outbound_clicks, C.outbound_ctr, C.cost_outbound,
                    C.frequency, C.reach, C.cpp, C.impressions, C.cpm,
                ];
            case 'MESSAGES':
                return [
                    C.ad_format, C.ad_status, C.spend, C.messages, C.cost_message, C.pct_mensajes,
                    C.unique_link_clicks, C.cost_unique_link, C.ctr_unique_link,
                    C.frequency, C.reach, C.cpp, C.impressions, C.cpm,
                ];
            case 'LEAD_GENERATION':
                return [
                    C.ad_format, C.ad_status, C.spend, C.leads, C.cost_lead, C.tasa_leads,
                    C.unique_link_clicks, C.cost_unique_link, C.ctr_unique_link,
                    C.frequency, C.reach, C.cpp, C.impressions, C.cpm,
                ];
            case 'OUTCOME_LEADS':
                return [
                    C.ad_format, C.ad_status, C.spend, C.leads, C.cost_lead, C.tasa_leads_web,
                    C.landing_views, C.cost_landing, C.pct_visitas,
                    C.outbound_clicks, C.cost_outbound, C.outbound_ctr,
                    C.frequency, C.reach, C.cpp, C.impressions, C.cpm,
                ];
            case 'OUTCOME_TRAFFIC':
            case 'LINK_CLICKS':
                return [
                    C.ad_format, C.ad_status, C.spend, C.landing_views, C.cost_landing,
                    C.outbound_clicks, C.cost_outbound, C.pct_visitas,
                    C.unique_link_clicks, C.cost_unique_link, C.ctr_unique_link,
                    C.frequency, C.reach, C.cpp, C.impressions, C.cpm,
                ];
            case 'OUTCOME_AWARENESS':
            case 'REACH':
                return [
                    C.ad_format, C.ad_status, C.spend, C.reach, C.cpp, C.results, C.cost_result,
                    C.unique_link_clicks, C.cost_unique_link, C.ctr_unique_link,
                    C.frequency, C.impressions, C.cpm,
                ];
            case 'OUTCOME_ENGAGEMENT':
                return [
                    C.ad_format, C.ad_status, C.spend, C.results, C.cost_result,
                    C.unique_link_clicks, C.cost_unique_link, C.ctr_unique_link,
                    C.frequency, C.reach, C.cpp, C.impressions, C.cpm,
                ];
            default:
                if (hasRevenue) {
                    return [
                        C.ad_format, C.ad_status, C.spend, C.results, C.revenue, C.roas, C.cpa,
                        C.landing_views, C.outbound_clicks, C.unique_link_clicks, C.ctr_unique_link,
                        C.frequency, C.reach, C.impressions, C.cpm,
                    ];
                }
                return [
                    C.ad_format, C.ad_status, C.spend, C.results, C.cost_result,
                    C.unique_link_clicks, C.cost_unique_link, C.ctr_unique_link,
                    C.frequency, C.reach, C.impressions, C.cpm,
                ];
        }
    })();
    if (hasVideo) {
        // Insert hook_rate and video_avg_time before the general metrics
        const generalIdx = base.findIndex(c => c.key === 'frequency');
        if (generalIdx > -1) {
            base.splice(generalIdx, 0, C.hook_rate, C.video_avg_time);
        } else {
            base.push(C.hook_rate, C.video_avg_time);
        }
    }
    return base;
}

function getDefaultSort(objective) {
    switch (objective) {
        case 'OUTCOME_SALES':
        case 'CONVERSIONS':
            return 'revenue';
        case 'MESSAGES':
            return 'messages';
        case 'OUTCOME_LEADS':
        case 'LEAD_GENERATION':
            return 'leads';
        case 'OUTCOME_TRAFFIC':
        case 'LINK_CLICKS':
            return 'clicks';
        default:
            return 'results';
    }
}

function getWorstSort(objective) {
    // Worst = highest cost per result / lowest efficiency
    switch (objective) {
        case 'OUTCOME_SALES':
        case 'CONVERSIONS':
            return 'cpa'; // highest CPA = worst
        case 'MESSAGES':
            return 'cpm_msg';
        case 'OUTCOME_LEADS':
        case 'LEAD_GENERATION':
            return 'cpl';
        default:
            return 'cost_result';
    }
}

function getWorstTitle(datePreset, dateRange) {
    switch (datePreset) {
        case 'today': return 'Los peores anuncios hoy';
        case 'yesterday': return 'Los peores anuncios de ayer';
        case '3d': return 'Los peores anuncios de los ultimos 3 dias';
        case '7d': return 'Los peores anuncios de la semana';
        case '14d': return 'Los peores anuncios de los ultimos 14 dias';
        case '30d': return 'Los peores anuncios de los ultimos 30 dias';
        case 'this_month': return 'Los peores anuncios de este mes';
        case '90d': return 'Los peores anuncios de los ultimos 90 dias';
        case 'custom': {
            if (dateRange?.from && dateRange?.to) {
                const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
                return `Los peores anuncios del ${fmtDate(dateRange.from)} al ${fmtDate(dateRange.to)}`;
            }
            return 'Los peores anuncios del periodo';
        }
        default: return 'Los peores anuncios del periodo';
    }
}

function getEmptyMessage(objective) {
    switch (objective) {
        case 'OUTCOME_SALES':
        case 'CONVERSIONS':
            return 'Sin compras en este periodo';
        case 'MESSAGES':
            return 'Sin mensajes en este periodo';
        case 'OUTCOME_LEADS':
        case 'LEAD_GENERATION':
            return 'Sin leads en este periodo';
        default:
            return 'Sin resultados en este periodo';
    }
}

function SortIcon({ active, dir }) {
    if (!active) return <ArrowUpDown size={10} className="inline ml-1 opacity-30" />;
    return dir === 'asc' ? <ArrowUp size={11} className="inline ml-1" /> : <ArrowDown size={11} className="inline ml-1" />;
}

function getDateTitle(datePreset, dateRange) {
    switch (datePreset) {
        case 'today': return 'Los mejores anuncios hoy';
        case 'yesterday': return 'Los mejores anuncios de ayer';
        case '3d': return 'Los mejores anuncios de los ultimos 3 dias';
        case '7d': return 'Los mejores anuncios de la semana';
        case '14d': return 'Los mejores anuncios de los ultimos 14 dias';
        case '30d': return 'Los mejores anuncios de los ultimos 30 dias';
        case 'this_month': return 'Los mejores anuncios de este mes';
        case '90d': return 'Los mejores anuncios de los ultimos 90 dias';
        case 'custom': {
            if (dateRange?.from && dateRange?.to) {
                const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
                return `Los mejores anuncios del ${fmtDate(dateRange.from)} al ${fmtDate(dateRange.to)}`;
            }
            return 'Los mejores anuncios del periodo';
        }
        default: return 'Los mejores anuncios del periodo';
    }
}

// --- Enriched ad data builder ---

function enrichAd(ad, objective) {
    const spend = ad.spend || 0;
    const results = ad.results || 0;
    const revenue = ad.revenue || 0;
    const clicks = ad.clicks || 0;
    const impressions = ad.impressions || 0;
    const reach = ad.reach || 0;

    // Action counts
    const messages = ad.actions_messaging_conversation_started_7d
        || ad['actions_onsite_conversion.messaging_conversation_started_7d']
        || (objective === 'MESSAGES' ? results : 0);
    const leads = ad.actions_lead
        || ad['actions_onsite_conversion.lead_grouped']
        || ad['actions_offsite_conversion.fb_pixel_lead']
        || (objective === 'OUTCOME_LEADS' || objective === 'LEAD_GENERATION' ? results : 0);
    const purchases = ad.actions_purchase
        || ad['actions_offsite_conversion.fb_pixel_purchase']
        || (objective === 'OUTCOME_SALES' || objective === 'CONVERSIONS' ? results : 0);

    // Funnel counts (from buildMetrics top-level or fallback to action data)
    const landing_page_views = ad.landing_page_views || ad.actions_landing_page_view || 0;
    const view_content = ad.view_content || ad.actions_view_content || 0;
    const add_to_cart = ad.add_to_cart || ad.actions_add_to_cart || 0;
    const initiate_checkout = ad.initiate_checkout || ad.actions_initiate_checkout || 0;
    const outbound_clicks = ad.outbound_clicks || ad.outbound_clicks_outbound_click || 0;
    const unique_link_clicks = ad.unique_inline_link_clicks || 0;

    // Video
    const videoViews = ad.actions_video_view || ad.video_p25_video_view || 0;
    const hook_rate = ad.hook_rate || (impressions > 0 && videoViews > 0 ? (videoViews / impressions) * 100 : 0);
    const video_avg_time = ad.video_avg_time || ad.video_avg_time_video_view || 0;

    // Format
    const rawFormat = (ad.format || '').toUpperCase();
    const formatMap = { 'VIDEO': 'Video', 'SLIDESHOW': 'Video', 'CAROUSEL': 'Carrusel', 'IMAGE': 'Imagen', 'PHOTO': 'Imagen' };
    const ad_format = formatMap[rawFormat] || rawFormat || 'Otro';

    return {
        id: ad.id,
        name: ad.name,
        thumbnail: ad.thumbnail_url || '',
        ad_format,
        ad_status: ad.status || 'UNKNOWN',
        // Core
        spend, impressions, clicks, results, revenue, reach,
        purchases, messages, leads,
        // Ratios
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        cpp: reach > 0 ? (spend / reach) * 1000 : 0,
        frequency: reach > 0 ? impressions / reach : 0,
        roas: spend > 0 && revenue > 0 ? revenue / spend : 0,
        ticket: purchases > 0 ? revenue / purchases : 0,
        cpa: purchases > 0 ? spend / purchases : 0,
        cost_result: results > 0 ? spend / results : 0,
        // Messages/Leads
        cost_message: messages > 0 ? spend / messages : 0,
        cost_lead: leads > 0 ? spend / leads : 0,
        pct_mensajes: unique_link_clicks > 0 ? (messages / unique_link_clicks) * 100 : 0,
        tasa_leads: unique_link_clicks > 0 ? (leads / unique_link_clicks) * 100 : 0,
        tasa_leads_web: landing_page_views > 0 ? (leads / landing_page_views) * 100 : 0,
        // Funnel counts
        landing_page_views,
        view_content,
        add_to_cart,
        initiate_checkout,
        outbound_clicks,
        unique_link_clicks,
        // Funnel per-step costs
        cost_landing: landing_page_views > 0 ? spend / landing_page_views : 0,
        cost_view_content: view_content > 0 ? spend / view_content : 0,
        cost_add_to_cart: add_to_cart > 0 ? spend / add_to_cart : 0,
        cost_checkout: initiate_checkout > 0 ? spend / initiate_checkout : 0,
        cost_outbound: outbound_clicks > 0 ? spend / outbound_clicks : 0,
        cost_unique_link: unique_link_clicks > 0 ? spend / unique_link_clicks : 0,
        // Funnel %
        pct_visitas: outbound_clicks > 0 ? (landing_page_views / outbound_clicks) * 100 : 0,
        pct_ver_contenido: landing_page_views > 0 ? (view_content / landing_page_views) * 100 : 0,
        pct_carritos: view_content > 0 ? (add_to_cart / view_content) * 100 : 0,
        pct_checkout: add_to_cart > 0 ? (initiate_checkout / add_to_cart) * 100 : 0,
        pct_compras: initiate_checkout > 0 ? (purchases / initiate_checkout) * 100 : 0,
        pct_compras_landing: landing_page_views > 0 ? (purchases / landing_page_views) * 100 : 0,
        outbound_clicks_ctr: impressions > 0 ? (outbound_clicks / impressions) * 100 : 0,
        ctr_unique_link: ad.unique_inline_link_click_ctr || (impressions > 0 ? (unique_link_clicks / impressions) * 100 : 0),
        // Video
        hook_rate,
        video_avg_time,
        video_views: videoViews,
    };
}

// --- Top Ads Table ---

const PAGE_SIZE = 10;

function AdsTable({ data, columns, defaultSort, defaultDir, currency, title, emptyMsg, roasBE, cprBE, savedCols, onColsChange }) {
    const [sortKey, setSortKey] = useState(defaultSort);
    const [sortDir, setSortDir] = useState(defaultDir || 'desc');
    const [visibleCols, setVisibleCols] = useState(() => {
        // Use saved columns if available, filtering to only valid column keys
        if (savedCols?.length) {
            const validKeys = new Set(columns.map(c => c.key));
            const valid = savedCols.filter(k => validKeys.has(k));
            if (valid.length > 0) return valid;
        }
        return columns.map(c => c.key);
    });
    const [showColPicker, setShowColPicker] = useState(false);
    const [page, setPage] = useState(0);

    const sorted = useMemo(() => {
        return [...data].sort((a, b) => {
            const av = a[sortKey] ?? 0;
            const bv = b[sortKey] ?? 0;
            if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
            return sortDir === 'asc' ? av - bv : bv - av;
        });
    }, [data, sortKey, sortDir]);

    // Compute min/max per metric for heat map coloring
    const metricRanges = useMemo(() => {
        const ranges = {};
        for (const col of columns) {
            if (col.type === 'badge' || col.type === 'status') continue;
            const values = data.map(r => r[col.key]).filter(v => v != null && !isNaN(v) && v !== 0);
            if (values.length < 2) { ranges[col.key] = null; continue; }
            ranges[col.key] = { min: Math.min(...values), max: Math.max(...values) };
        }
        return ranges;
    }, [data, columns]);

    // Map column keys to heat-compatible metric keys for isInvertMetric
    const heatKeyMap = {
        cpa: 'cost_per_result', cost_lead: 'cost_per_result', cost_message: 'cost_per_result',
        cost_result: 'cost_per_result', cpc: 'cpc', spend: 'spend',
        cost_landing: 'cost_per_result', cost_view_content: 'cost_per_result',
        cost_add_to_cart: 'cost_per_result', cost_checkout: 'cost_per_result',
        cost_outbound: 'cost_per_result', cost_unique_link: 'cost_per_result',
        cpm: 'cpm', cpp: 'cpp', frequency: 'frequency',
    };

    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
        setPage(0);
    };

    const toggleCol = (key) => {
        setVisibleCols(prev => {
            const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
            if (onColsChange) onColsChange(next);
            return next;
        });
    };

    const activeCols = columns.filter(c => visibleCols.includes(c.key));

    if (!data.length) {
        return (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-6 text-center text-sm text-[var(--text-tertiary)]">
                {emptyMsg}
            </div>
        );
    }

    return (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--text-tertiary)]">{data.length} anuncios</span>
                    <div className="relative">
                        <button onClick={() => setShowColPicker(!showColPicker)}
                            className="text-xs text-[var(--accent-primary)] hover:underline cursor-pointer">
                            Columnas
                        </button>
                        {showColPicker && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowColPicker(false)} />
                                <div className="absolute top-full right-0 mt-1 w-[180px] bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] z-50 p-1" style={{ boxShadow: 'var(--shadow-md)' }}>
                                    {columns.map(col => (
                                        <button key={col.key} onClick={() => toggleCol(col.key)}
                                            className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left cursor-pointer text-xs',
                                                visibleCols.includes(col.key) ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]' : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]')}>
                                            <span className="w-3 h-3 rounded border flex items-center justify-center flex-shrink-0"
                                                style={{ borderColor: visibleCols.includes(col.key) ? 'var(--accent-primary)' : 'var(--border-secondary)', backgroundColor: visibleCols.includes(col.key) ? 'var(--accent-primary)' : 'transparent' }}>
                                                {visibleCols.includes(col.key) && <span className="text-white text-[7px]">✓</span>}
                                            </span>
                                            {col.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[var(--border-primary)]">
                            <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-3 py-2">Anuncio</th>
                            {activeCols.map(col => (
                                <th key={col.key} onClick={() => toggleSort(col.key)}
                                    className="text-right text-xs font-medium text-[var(--text-secondary)] px-3 py-2 cursor-pointer select-none hover:text-[var(--text-primary)] whitespace-nowrap">
                                    {col.label}
                                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paged.map(ad => (
                            <tr key={ad.id} className="border-b border-[var(--border-primary)] last:border-0 hover:bg-[var(--row-hover)]">
                                <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                        {ad.thumbnail && <img src={ad.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                                        <span className="font-medium text-[var(--text-primary)] truncate max-w-[220px]">{ad.name}</span>
                                    </div>
                                </td>
                                {activeCols.map(col => {
                                    const val = ad[col.key];
                                    if (col.type === 'badge') {
                                        const formatStyles = {
                                            'Video': { icon: '▶', cls: 'bg-purple-500/15 text-purple-400' },
                                            'Carrusel': { icon: '◫', cls: 'bg-blue-500/15 text-blue-400' },
                                            'Imagen': { icon: '⬜', cls: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]' },
                                        };
                                        const fs = formatStyles[val] || { icon: '•', cls: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]' };
                                        return (
                                            <td key={col.key} className="px-3 py-2.5 text-center">
                                                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', fs.cls)}>
                                                    {fs.icon} {val}
                                                </span>
                                            </td>
                                        );
                                    }
                                    if (col.type === 'status') {
                                        const isActive = val === 'ACTIVE';
                                        return (
                                            <td key={col.key} className="px-3 py-2.5 text-center">
                                                <span className={cn(
                                                    'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
                                                    isActive ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)]'
                                                )}>
                                                    {isActive ? 'Activo' : 'Apagado'}
                                                </span>
                                            </td>
                                        );
                                    }
                                    let display;
                                    if (col.type === 'currency') {
                                        display = fmt(val, 'currency', currency);
                                    } else if (col.type === 'roas') {
                                        display = fmt(val, 'roas', currency);
                                    } else if (col.type === 'percent') {
                                        display = fmt(val, 'percent', currency);
                                    } else {
                                        display = fmt(val, 'number', currency);
                                    }
                                    // BE threshold heat colors for ROAS and CPA
                                    let heatBg = 'transparent';
                                    const isCpaCol = ['cpa', 'cost_lead', 'cost_message', 'cost_result'].includes(col.key);
                                    if (col.key === 'roas' && val > 0) {
                                        const threshold = roasBE || 1;
                                        const ratio = Math.min(val / threshold, 2) / 2;
                                        if (ratio >= 0.5) {
                                            const intensity = (ratio - 0.5) * 2;
                                            heatBg = `rgba(16, 185, 129, ${(intensity * 0.2).toFixed(3)})`;
                                        } else {
                                            const intensity = (0.5 - ratio) * 2;
                                            heatBg = `rgba(239, 68, 68, ${(intensity * 0.2).toFixed(3)})`;
                                        }
                                    } else if (isCpaCol && cprBE && val > 0) {
                                        // CPA: below BE = green (good), above BE = red (bad) — inverted from ROAS
                                        const ratio = Math.min(cprBE / val, 2) / 2;
                                        if (ratio >= 0.5) {
                                            const intensity = (ratio - 0.5) * 2;
                                            heatBg = `rgba(16, 185, 129, ${(intensity * 0.2).toFixed(3)})`;
                                        } else {
                                            const intensity = (0.5 - ratio) * 2;
                                            heatBg = `rgba(239, 68, 68, ${(intensity * 0.2).toFixed(3)})`;
                                        }
                                    } else {
                                        const range = metricRanges[col.key];
                                        const heatKey = heatKeyMap[col.key] || col.key;
                                        heatBg = range ? getHeatColor(val, range.min, range.max, heatKey) : 'transparent';
                                    }
                                    return (
                                        <td key={col.key} className="px-3 py-2.5 text-right tabular-nums font-medium text-[var(--text-primary)]" style={{ backgroundColor: heatBg }}>
                                            {display}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-primary)]">
                    <p className="text-xs text-[var(--text-tertiary)]">
                        {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} de {sorted.length}
                    </p>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                            className="px-2.5 py-1 rounded-lg text-xs text-[var(--text-secondary)] border border-[var(--border-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 cursor-pointer transition-all">
                            Anterior
                        </button>
                        <span className="text-xs text-[var(--text-tertiary)] px-2">{page + 1} / {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                            className="px-2.5 py-1 rounded-lg text-xs text-[var(--text-secondary)] border border-[var(--border-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 cursor-pointer transition-all">
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Main Component ---

export default function SalesTracker({ ads, campaigns, objective, currency = 'USD', datePreset, dateRange, roasBE, cprBE, savedTopAdsCols, onSaveTopAdsCols }) {
    const [salesLog, setSalesLog] = useState([]);
    const [selectedAdId, setSelectedAdId] = useState('');
    const [saleAmount, setSaleAmount] = useState('');
    const [saleNote, setSaleNote] = useState('');
    const [isPending, startTransition] = useTransition();
    const [loaded, setLoaded] = useState(false);

    const isSalesObjective = objective === 'OUTCOME_SALES' || objective === 'CONVERSIONS';
    const isMessages = objective === 'MESSAGES';
    const isLeads = objective === 'OUTCOME_LEADS' || objective === 'LEAD_GENERATION';
    const showManualTracker = isMessages || isLeads;

    // Load sales from DB on mount
    useEffect(() => {
        getSales().then(result => {
            if (result.ok) setSalesLog(result.sales);
            setLoaded(true);
        });
    }, []);

    const [hideZeroResults, setHideZeroResults] = useState(true);

    // Enrich all ads with computed metrics
    const allEnrichedAds = useMemo(() => {
        return ads
            .filter(a => (a.spend || 0) > 0 || (a.results || 0) > 0)
            .map(a => enrichAd(a, objective));
    }, [ads, objective]);

    // Check if any ads have video or revenue (for column selection)
    const hasVideo = allEnrichedAds.some(a => a.video_views > 0);
    const hasRevenue = allEnrichedAds.some(a => a.revenue > 0);

    // Get columns and sort for objective
    const columns = useMemo(() => getColumnsForObjective(objective, hasVideo, hasRevenue), [objective, hasVideo, hasRevenue]);
    const bestTitle = getDateTitle(datePreset, dateRange);
    const worstTitle = getWorstTitle(datePreset, dateRange);
    const emptyMsg = getEmptyMessage(objective);

    const totalAdsCount = allEnrichedAds.length;
    const zeroResultsCount = allEnrichedAds.filter(a => (a.results || 0) === 0).length;

    // Split into BEST and WORST — no overlap
    const { bestAds, worstAds } = useMemo(() => {
        let filtered = allEnrichedAds;
        if (hideZeroResults) filtered = filtered.filter(a => (a.results || 0) > 0);

        // Only ads with spend
        const withSpend = filtered.filter(a => a.spend > 0);
        if (withSpend.length === 0) return { bestAds: filtered, worstAds: [] };

        const isSalesObj = objective === 'OUTCOME_SALES' || objective === 'CONVERSIONS' || hasRevenue;
        const isTrafficObj = objective === 'OUTCOME_TRAFFIC' || objective === 'LINK_CLICKS';

        // If ROAS BE is set, use it as the divider for best/worst
        if (roasBE && isSalesObj) {
            const best = withSpend.filter(a => a.roas >= roasBE).sort((a, b) => b.roas - a.roas);
            const worst = withSpend.filter(a => a.roas < roasBE).sort((a, b) => a.roas - b.roas);
            const noSpend = filtered.filter(a => a.spend === 0);
            return { bestAds: [...best, ...noSpend], worstAds: worst };
        }

        // No ROAS BE — score and split by midpoint
        const scored = withSpend.map(ad => {
            let score;
            if (isSalesObj) {
                score = ad.results > 0 ? (ad.roas || 0) : -1;
            } else if (isTrafficObj) {
                score = ad.ctr || 0;
            } else {
                score = ad.results > 0 ? -(ad.cost_result || ad.spend) : -Infinity;
            }
            return { ...ad, _score: score };
        });

        scored.sort((a, b) => b._score - a._score);

        const midpoint = Math.max(1, Math.ceil(scored.length / 2));
        const best = scored.slice(0, midpoint);
        const worst = scored.slice(midpoint);

        const noSpend = filtered.filter(a => a.spend === 0);

        return {
            bestAds: [...best, ...noSpend],
            worstAds: worst,
        };
    }, [allEnrichedAds, hideZeroResults, objective, hasRevenue, roasBE]);

    const defaultSort = getDefaultSort(objective);
    const worstSort = getWorstSort(objective);

    // Manual tracker data
    const salesByAd = useMemo(() => {
        const map = {};
        for (const sale of salesLog) {
            if (!map[sale.ad_id]) {
                const ad = ads.find(a => a.id === sale.ad_id);
                map[sale.ad_id] = { adName: sale.ad_name || ad?.name || sale.ad_id, thumbnail: ad?.thumbnail_url || '', totalRevenue: 0, count: 0, adSpend: ad?.spend || 0 };
            }
            map[sale.ad_id].totalRevenue += parseFloat(sale.amount);
            map[sale.ad_id].count += 1;
        }
        return Object.entries(map).sort((a, b) => b[1].totalRevenue - a[1].totalRevenue);
    }, [salesLog, ads]);

    const totalManualRevenue = salesLog.reduce((sum, s) => sum + parseFloat(s.amount), 0);

    const handleAddSale = () => {
        if (!selectedAdId || !saleAmount) return;
        const ad = ads.find(a => a.id === selectedAdId);
        startTransition(async () => {
            const result = await addSale(selectedAdId, ad?.name, saleAmount, currency, saleNote);
            if (result.error) { toast.error(result.error); return; }
            setSalesLog(prev => [result.sale, ...prev]);
            setSaleAmount('');
            setSaleNote('');
            toast.success('Venta registrada');
        });
    };

    const handleDeleteSale = (saleId) => {
        startTransition(async () => {
            const result = await deleteSale(saleId);
            if (result.error) { toast.error(result.error); return; }
            setSalesLog(prev => prev.filter(s => s.id !== saleId));
            toast.success('Venta eliminada');
        });
    };

    return (
        <div className="space-y-6">
            {/* Filter toggle */}
            {zeroResultsCount > 0 && (
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={hideZeroResults}
                            onChange={e => setHideZeroResults(e.target.checked)}
                            className="rounded"
                        />
                        Ocultar anuncios sin resultados
                    </label>
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                        ({zeroResultsCount} de {totalAdsCount} sin resultados)
                    </span>
                </div>
            )}

            {/* Best Ads Table */}
            <AdsTable
                data={bestAds}
                columns={columns}
                defaultSort={defaultSort}
                defaultDir="desc"
                currency={currency}
                title={roasBE ? `${bestTitle} (ROAS >= ${roasBE}x)` : bestTitle}
                emptyMsg={emptyMsg}
                roasBE={roasBE}
                cprBE={cprBE}
                savedCols={savedTopAdsCols}
                onColsChange={onSaveTopAdsCols}
            />

            {/* Worst Ads Table */}
            {worstAds.length > 0 && (
                <AdsTable
                    data={worstAds}
                    columns={columns}
                    defaultSort={worstSort}
                    defaultDir="desc"
                    currency={currency}
                    title={roasBE ? `${worstTitle} (ROAS < ${roasBE}x)` : worstTitle}
                    emptyMsg=""
                    roasBE={roasBE}
                    cprBE={cprBE}
                    savedCols={savedTopAdsCols}
                    onColsChange={onSaveTopAdsCols}
                />
            )}

            {/* Manual tracker (messages/leads) */}
            {showManualTracker && (
                <>
                    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-4">
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Registrar Venta</h4>
                        <div className="flex gap-3 flex-wrap items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs text-[var(--text-secondary)] mb-1">Anuncio</label>
                                <select value={selectedAdId} onChange={e => setSelectedAdId(e.target.value)} className="w-full">
                                    <option value="">Seleccionar anuncio...</option>
                                    {ads.map(ad => (
                                        <option key={ad.id} value={ad.id}>{ad.name} (ID: {ad.id})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-[140px]">
                                <label className="block text-xs text-[var(--text-secondary)] mb-1">Monto ({currency})</label>
                                <input type="number" step="0.01" min="0" value={saleAmount} onChange={e => setSaleAmount(e.target.value)} placeholder="0.00"
                                    className="w-full h-9 px-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)]" />
                            </div>
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs text-[var(--text-secondary)] mb-1">Nota (opcional)</label>
                                <input type="text" value={saleNote} onChange={e => setSaleNote(e.target.value)} placeholder="Ej: Cliente Juan, servicio X"
                                    className="w-full h-9 px-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)]" />
                            </div>
                            <button onClick={handleAddSale} disabled={!selectedAdId || !saleAmount || isPending}
                                className="h-9 px-4 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium disabled:opacity-40 cursor-pointer transition-opacity flex items-center gap-1.5">
                                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                Agregar
                            </button>
                        </div>
                    </div>

                    {/* Summary by ad */}
                    {salesByAd.length > 0 && (
                        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Ventas por Anuncio</h4>
                                <span className="text-sm font-bold text-[var(--success)]">Total: {fmt(totalManualRevenue, 'currency', currency)}</span>
                            </div>
                            <div className="space-y-2">
                                {salesByAd.map(([adId, data]) => {
                                    const roi = data.adSpend > 0 ? data.totalRevenue / data.adSpend : 0;
                                    return (
                                        <div key={adId} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-primary)]">
                                            {data.thumbnail && <img src={data.thumbnail} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{data.adName}</p>
                                                <p className="text-xs text-[var(--text-secondary)]">{data.count} venta{data.count > 1 ? 's' : ''} — Inversion: {fmt(data.adSpend, 'currency', currency)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-[var(--success)]">{fmt(data.totalRevenue, 'currency', currency)}</p>
                                                <p className="text-xs text-[var(--text-secondary)]">
                                                    ROI: <span className={cn('font-medium', roi >= 1 ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>{roi > 0 ? `${roi.toFixed(2)}x` : '—'}</span>
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Sales log */}
                    {salesLog.length > 0 && (
                        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-4">
                            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Registro de Ventas ({salesLog.length})</h4>
                            <div className="space-y-1.5">
                                {salesLog.map(sale => (
                                    <div key={sale.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--row-hover)] group">
                                        <DollarSign size={14} className="text-[var(--success)] flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm text-[var(--text-primary)]">{fmt(sale.amount, 'currency', currency)}</span>
                                            <span className="text-xs text-[var(--text-secondary)] ml-2">{sale.ad_name || sale.ad_id}</span>
                                            {sale.note && <span className="text-xs text-[var(--text-tertiary)] ml-2">— {sale.note}</span>}
                                        </div>
                                        <span className="text-xs text-[var(--text-tertiary)]">
                                            {new Date(sale.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                        </span>
                                        <button onClick={() => handleDeleteSale(sale.id)} disabled={isPending}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--danger)] hover:bg-[var(--danger-bg)] cursor-pointer transition-all">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-[var(--info-bg)] rounded-xl border border-[var(--info)]/20 p-4">
                        <div className="flex items-start gap-3">
                            <TrendingUp size={18} className="text-[var(--info)] flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Automatizar tracking</h4>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                    {isMessages
                                        ? 'Para automatizar, usa parametros UTM con el ad_id o integra con un CRM via webhook de WhatsApp.'
                                        : 'Para automatizar, usa utm_content con el ad_id en formularios o integra con tu CRM via API de Meta.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
