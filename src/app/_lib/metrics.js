/**
 * Metric registry — all Meta Ads metrics with metadata.
 * Categories and names match Meta Ads Manager in español.
 * Organized by objective-specific groups.
 */

// --- Metric definitions ---

export const METRIC_REGISTRY = {
    // ========== RESULTADOS ==========
    results:                  { label: 'Resultados',                    category: 'Resultados',         type: 'number',   icon: '🎯' },
    cost_per_result:          { label: 'Costo por Resultado',           category: 'Resultados',         type: 'currency', icon: '🎯' },
    revenue:                  { label: 'Valor de Conversión',           category: 'Resultados',         type: 'currency', icon: '💰' },
    roas:                     { label: 'ROAS',                          category: 'Resultados',         type: 'roas',     icon: '📈' },
    ticket_promedio:          { label: 'Valor Conv. Promedio',          category: 'Resultados',         type: 'currency', icon: '🧾' },

    // ========== FUNNEL DE VENTAS ==========
    pct_compras:              { label: '% de Compras (Compras/Checkouts)',         category: 'Funnel de Ventas',  type: 'percent', icon: '🛒' },
    initiate_checkout:        { label: 'Pagos Iniciados',                          category: 'Funnel de Ventas',  type: 'number',  icon: '💳' },
    cost_per_initiate_checkout: { label: 'Costo por Pago Iniciado',                category: 'Funnel de Ventas',  type: 'currency', icon: '💳' },
    pct_checkout:             { label: '% de Checkout (Checkouts/Carritos)',        category: 'Funnel de Ventas',  type: 'percent', icon: '🛒' },
    add_to_cart:              { label: 'Artículos al Carrito',                      category: 'Funnel de Ventas',  type: 'number',  icon: '🛒' },
    cost_per_add_to_cart:     { label: 'Costo por Artículo al Carrito',            category: 'Funnel de Ventas',  type: 'currency', icon: '🛒' },
    pct_carritos:             { label: '% de Carritos (Carritos/Vis. Contenido)',   category: 'Funnel de Ventas',  type: 'percent', icon: '🛒' },
    view_content:             { label: 'Visualizaciones de Contenido',             category: 'Funnel de Ventas',  type: 'number',  icon: '👁' },
    cost_per_view_content:    { label: 'Costo por Vis. de Contenido',              category: 'Funnel de Ventas',  type: 'currency', icon: '👁' },
    pct_ver_contenido:        { label: '% Ver Contenido (Vis./Visitas Landing)',   category: 'Funnel de Ventas',  type: 'percent', icon: '👁' },
    pct_compras_landing:      { label: '% Compras por Visita Landing',             category: 'Funnel de Ventas',  type: 'percent', icon: '📊' },

    // ========== TRÁFICO ==========
    landing_page_views:       { label: 'Visitas a Landing',             category: 'Tráfico',            type: 'number',   icon: '📄' },
    cost_per_landing_page_view: { label: 'Costo por Visita Landing',    category: 'Tráfico',            type: 'currency', icon: '📄' },
    pct_visitas:              { label: '% de Visitas (Landing/Clics Salientes)',  category: 'Tráfico', type: 'percent', icon: '📊' },
    outbound_clicks:          { label: 'Clics Salientes',               category: 'Tráfico',            type: 'number',   icon: '🔗' },
    cost_per_outbound_click:  { label: 'Costo por Clic Saliente',       category: 'Tráfico',            type: 'currency', icon: '🔗' },
    outbound_clicks_ctr:      { label: '% Clics Salientes',             category: 'Tráfico',            type: 'percent',  icon: '🔗' },

    // ========== CLICS ÚNICOS ==========
    unique_inline_link_clicks:          { label: 'Clics Únicos en Enlace',          category: 'Clics Únicos',  type: 'number',   icon: '🔗' },
    cost_per_unique_inline_link_click:  { label: 'Costo por Clic Único Enlace',     category: 'Clics Únicos',  type: 'currency', icon: '🔗' },
    unique_inline_link_click_ctr:       { label: 'CTR Único (Enlace)',              category: 'Clics Únicos',  type: 'percent',  icon: '📊' },

    // ========== CONVERSIÓN (Mensajes/Leads) ==========
    pct_mensajes:             { label: '% de Mensajes (Conv./Clics Únicos)',       category: 'Conversión',  type: 'percent', icon: '💬' },
    tasa_conversion_leads:    { label: 'Tasa Conv. Leads (Leads/Clics Únicos)',    category: 'Conversión',  type: 'percent', icon: '🎯' },
    tasa_conversion_leads_web: { label: 'Tasa Conv. Leads Web (Leads/Visitas)',    category: 'Conversión',  type: 'percent', icon: '🎯' },

    // ========== VIDEO ==========
    hook_rate:                { label: 'Hook Rate (3s/Impresiones)',     category: 'Video',              type: 'percent',  icon: '🎬' },
    video_avg_time:           { label: 'Tiempo Promedio Reproducción',   category: 'Video',              type: 'decimal',  icon: '⏱' },

    // ========== ENGAGEMENT GENERAL ==========
    spend:                    { label: 'Inversión',                     category: 'General',            type: 'currency', icon: '💰' },
    impressions:              { label: 'Impresiones',                   category: 'General',            type: 'number',   icon: '👁' },
    reach:                    { label: 'Alcance',                       category: 'General',            type: 'number',   icon: '📡' },
    frequency:                { label: 'Frecuencia',                    category: 'General',            type: 'decimal',  icon: '🔄' },
    cpm:                      { label: 'CPM',                           category: 'General',            type: 'currency', icon: '💵' },
    cpp:                      { label: 'Costo por 1.000 Alcanzadas',    category: 'General',            type: 'currency', icon: '💵' },
    clicks:                   { label: 'Clics',                         category: 'General',            type: 'number',   icon: '👆' },
    ctr:                      { label: 'CTR',                           category: 'General',            type: 'percent',  icon: '📊' },
    cpc:                      { label: 'CPC',                           category: 'General',            type: 'currency', icon: '💵' },
};

// Dynamic action metrics (discovered from data)
const ACTION_PREFIXES = {
    'actions_':                      { labelPrefix: '',           category: 'Acciones',         type: 'number' },
    'action_values_':                { labelPrefix: 'Valor ',     category: 'Valores',          type: 'currency' },
    'cost_per_action_type_':         { labelPrefix: 'Costo por ', category: 'Costos',           type: 'currency' },
    'unique_actions_':               { labelPrefix: 'Únicos: ',   category: 'Acciones Únicas',  type: 'number' },
    'cost_per_unique_action_type_':  { labelPrefix: 'Costo Único por ', category: 'Costos', type: 'currency' },
};

const ACTION_TYPE_LABELS = {
    'lead': 'Lead',
    'purchase': 'Compra',
    'messaging_conversation_started_7d': 'Mensaje',
    'onsite_conversion.lead_grouped': 'Lead (on-site)',
    'offsite_conversion.fb_pixel_lead': 'Lead (Pixel)',
    'offsite_conversion.fb_pixel_purchase': 'Compra (Pixel)',
    'onsite_conversion.purchase': 'Compra (on-site)',
    'omni_purchase': 'Compra (Omni)',
    'link_click': 'Clic en Link',
    'landing_page_view': 'Vista de Landing',
    'post_engagement': 'Interacción Post',
    'page_engagement': 'Interacción Página',
    'video_view': 'Vista de Video',
    'complete_registration': 'Registro Completo',
    'onsite_conversion.messaging_conversation_started_7d': 'Mensaje (on-site)',
    'add_to_cart': 'Agregar al Carrito',
    'initiate_checkout': 'Iniciar Checkout',
    'search': 'Búsqueda',
    'view_content': 'Vista de Contenido',
};

// Keys to EXCLUDE from dynamic discovery (already registered as top-level computed metrics)
const SKIP_DYNAMIC_KEYS = new Set([
    'actions_landing_page_view', 'actions_view_content', 'actions_add_to_cart',
    'actions_initiate_checkout', 'actions_video_view', 'actions_purchase',
    'actions_messaging_conversation_started_7d', 'actions_lead',
    'actions_onsite_conversion.messaging_conversation_started_7d',
    'actions_onsite_conversion.lead_grouped', 'actions_offsite_conversion.fb_pixel_lead',
    'actions_offsite_conversion.fb_pixel_purchase',
    'outbound_clicks_outbound_click', 'cost_per_outbound_click_outbound_click',
    'outbound_clicks_ctr_outbound_click',
    'video_p25_video_view', 'video_p50_video_view', 'video_p75_video_view', 'video_p100_video_view',
    'video_avg_time_video_view',
]);

export function discoverActionMetrics(items) {
    const discovered = {};
    for (const item of items) {
        for (const key of Object.keys(item)) {
            if (discovered[key] || METRIC_REGISTRY[key] || SKIP_DYNAMIC_KEYS.has(key)) continue;
            for (const [prefix, meta] of Object.entries(ACTION_PREFIXES)) {
                if (key.startsWith(prefix)) {
                    const actionType = key.slice(prefix.length);
                    const actionLabel = ACTION_TYPE_LABELS[actionType] || actionType.replace(/_/g, ' ').replace(/\./g, ' > ');
                    discovered[key] = {
                        label: `${meta.labelPrefix}${actionLabel}`,
                        category: meta.category,
                        type: meta.type,
                        icon: meta.type === 'currency' ? '💵' : '📊',
                    };
                    break;
                }
            }
        }
    }
    return discovered;
}

export function getAllMetrics(items) {
    // Only show curated metrics from the registry — no dynamic discovery of raw action types.
    // Users can create custom metrics via "Crear métrica" if they need something specific.
    return { ...METRIC_REGISTRY };
}

// --- Categories (ordered) ---

const CATEGORY_ORDER = [
    'Resultados', 'Funnel de Ventas', 'Tráfico', 'Clics Únicos', 'Conversión',
    'Video', 'General',
    'Acciones', 'Valores', 'Costos', 'Acciones Únicas', 'Personalizadas',
];

export function getMetricsByCategory(allMetrics) {
    const cats = {};
    for (const [key, meta] of Object.entries(allMetrics)) {
        if (!cats[meta.category]) cats[meta.category] = [];
        cats[meta.category].push({ key, ...meta });
    }
    const ordered = {};
    for (const cat of CATEGORY_ORDER) {
        if (cats[cat]) ordered[cat] = cats[cat];
    }
    for (const [cat, metrics] of Object.entries(cats)) {
        if (!ordered[cat]) ordered[cat] = metrics;
    }
    return ordered;
}

// --- Default visible metrics per objective ---
// These define what KPI cards show by default when first selecting an objective

export const DEFAULT_METRICS = {
    OUTCOME_SALES: ['spend', 'revenue', 'roas', 'results', 'cost_per_result', 'ticket_promedio', 'pct_compras', 'add_to_cart', 'landing_page_views'],
    CONVERSIONS: ['spend', 'revenue', 'roas', 'results', 'cost_per_result', 'ticket_promedio'],
    MESSAGES: ['spend', 'results', 'cost_per_result', 'pct_mensajes', 'unique_inline_link_clicks', 'cost_per_unique_inline_link_click'],
    OUTCOME_LEADS: ['spend', 'results', 'cost_per_result', 'tasa_conversion_leads_web', 'landing_page_views', 'cost_per_landing_page_view'],
    LEAD_GENERATION: ['spend', 'results', 'cost_per_result', 'tasa_conversion_leads', 'unique_inline_link_clicks', 'cost_per_unique_inline_link_click'],
    OUTCOME_ENGAGEMENT: ['spend', 'results', 'cost_per_result', 'impressions', 'reach', 'ctr'],
    OUTCOME_TRAFFIC: ['spend', 'landing_page_views', 'cost_per_landing_page_view', 'outbound_clicks', 'cost_per_outbound_click', 'ctr'],
    LINK_CLICKS: ['spend', 'landing_page_views', 'cost_per_landing_page_view', 'clicks', 'cpc', 'ctr'],
    OUTCOME_AWARENESS: ['spend', 'reach', 'cpp', 'impressions', 'frequency', 'cpm'],
    REACH: ['spend', 'reach', 'cpp', 'impressions', 'frequency', 'cpm'],
    _DEFAULT: ['spend', 'results', 'cost_per_result', 'impressions', 'clicks', 'ctr'],
};

// --- Formatter ---

export function formatMetric(value, type, currency = 'USD') {
    if (value == null || isNaN(value)) return '—';
    switch (type) {
        case 'currency':
            return new Intl.NumberFormat('es-AR', {
                style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
            }).format(value);
        case 'percent':
            return `${value.toFixed(2)}%`;
        case 'roas':
            return value > 0 ? `${value.toFixed(2)}x` : '—';
        case 'decimal':
            return value.toFixed(2);
        case 'number':
        default:
            return new Intl.NumberFormat('es-AR').format(Math.round(value));
    }
}

export function formatCompact(value, currency = 'USD') {
    if (value == null || isNaN(value)) return '—';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    const sym = getCurrencySymbol(currency);
    if (abs >= 1e9) return `${sign}${sym}${(abs / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${sign}${sym}${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${sign}${sym}${(abs / 1e3).toFixed(1)}K`;
    return `${sign}${sym}${abs.toFixed(abs < 10 ? 2 : 0)}`;
}

export function getCurrencySymbol(currency = 'USD') {
    const symbols = { USD: 'US$', ARS: '$', EUR: '€', BRL: 'R$', MXN: 'MX$', CLP: 'CL$', COP: 'CO$', PEN: 'S/' };
    return symbols[currency] || '$';
}

// --- Heat map helpers ---

export function isInvertMetric(key) {
    if (key.startsWith('cost_per_')) return true;
    if (key.startsWith('cost_per_action_type_')) return true;
    if (key.startsWith('cost_per_unique_action_type_')) return true;
    return ['cpc', 'cpm', 'cpp', 'cost_per_result', 'cost_per_unique_click',
        'cost_per_inline_link_click', 'cost_per_unique_inline_link_click',
        'cost_per_outbound_click', 'cost_per_landing_page_view',
        'cost_per_view_content', 'cost_per_add_to_cart', 'cost_per_initiate_checkout',
        'frequency', 'spend',
    ].includes(key);
}

export function getHeatColor(value, min, max, metricKey) {
    if (value == null || isNaN(value) || value === 0 || min === max) return 'transparent';
    const invert = isInvertMetric(metricKey);
    let ratio = (value - min) / (max - min);
    if (invert) ratio = 1 - ratio;

    if (ratio >= 0.5) {
        const intensity = (ratio - 0.5) * 2;
        return `rgba(16, 185, 129, ${(intensity * 0.18).toFixed(3)})`;
    } else {
        const intensity = (0.5 - ratio) * 2;
        return `rgba(239, 68, 68, ${(intensity * 0.18).toFixed(3)})`;
    }
}
