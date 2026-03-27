/**
 * Metric registry — all Meta Ads metrics with metadata.
 * Categories match Meta Ads Manager structure.
 */

// --- Metric definitions (ordered within categories) ---

export const METRIC_REGISTRY = {
    // GENERAL
    impressions:              { label: 'Impresiones',             category: 'General',      type: 'number',   icon: '👁' },
    reach:                    { label: 'Alcance',                 category: 'General',      type: 'number',   icon: '📡' },
    frequency:                { label: 'Frecuencia',              category: 'General',      type: 'decimal',  icon: '🔄' },
    cpm:                      { label: 'CPM',                     category: 'General',      type: 'currency', icon: '💵' },
    cpp:                      { label: 'CPP',                     category: 'General',      type: 'currency', icon: '💵' },
    spend:                    { label: 'Inversion',               category: 'General',      type: 'currency', icon: '💰' },

    // ENGAGEMENT
    ctr:                      { label: 'CTR',                     category: 'Engagement',   type: 'percent',  icon: '📊' },
    cpc:                      { label: 'CPC',                     category: 'Engagement',   type: 'currency', icon: '💵' },
    clicks:                   { label: 'Clics',                   category: 'Engagement',   type: 'number',   icon: '👆' },
    unique_clicks:            { label: 'Clics Unicos',            category: 'Engagement',   type: 'number',   icon: '👆' },
    cost_per_unique_click:    { label: 'Costo/Clic Unico',       category: 'Engagement',   type: 'currency', icon: '💵' },
    inline_link_clicks:       { label: 'Clics en Enlace',        category: 'Engagement',   type: 'number',   icon: '🔗' },
    cost_per_inline_link_click: { label: 'Costo/Clic Enlace',    category: 'Engagement',   type: 'currency', icon: '💵' },
    inline_link_click_ctr:    { label: 'CTR de Enlace',           category: 'Engagement',   type: 'percent',  icon: '📊' },

    // CONVERSIONES
    results:                  { label: 'Resultados',              category: 'Conversiones', type: 'number',   icon: '🎯' },
    cost_per_result:          { label: 'Costo por Resultado',     category: 'Conversiones', type: 'currency', icon: '🎯' },
    roas:                     { label: 'ROAS',                    category: 'Conversiones', type: 'roas',     icon: '📈' },
    ticket_promedio:          { label: 'Ticket Promedio',          category: 'Conversiones', type: 'currency', icon: '🧾' },

    // Acciones comunes (hardcoded para que aparezcan en alertas sin necesidad de data)
    actions_purchase:                               { label: 'Compras',                category: 'Acciones',     type: 'number',   icon: '🛒' },
    actions_lead:                                   { label: 'Leads',                  category: 'Acciones',     type: 'number',   icon: '🎯' },
    actions_link_click:                             { label: 'Clics en Enlace',        category: 'Acciones',     type: 'number',   icon: '🔗' },
    actions_landing_page_view:                      { label: 'Vistas de Landing',      category: 'Acciones',     type: 'number',   icon: '📄' },
    actions_view_content:                           { label: 'Vistas de Contenido',    category: 'Acciones',     type: 'number',   icon: '👁' },
    actions_add_to_cart:                            { label: 'Agregar al Carrito',     category: 'Acciones',     type: 'number',   icon: '🛒' },
    actions_initiate_checkout:                      { label: 'Iniciar Checkout',       category: 'Acciones',     type: 'number',   icon: '💳' },
    actions_messaging_conversation_started_7d:      { label: 'Mensajes Iniciados',     category: 'Acciones',     type: 'number',   icon: '💬' },

    // Costos por accion comunes
    cost_per_action_type_purchase:                  { label: 'Costo por Compra',       category: 'Costos por Accion', type: 'currency', icon: '💵' },
    cost_per_action_type_lead:                      { label: 'Costo por Lead',         category: 'Costos por Accion', type: 'currency', icon: '💵' },
    cost_per_action_type_messaging_conversation_started_7d: { label: 'Costo por Mensaje', category: 'Costos por Accion', type: 'currency', icon: '💵' },
    cost_per_action_type_link_click:                { label: 'Costo por Clic Enlace',  category: 'Costos por Accion', type: 'currency', icon: '💵' },

    // Facturacion comunes
    action_values_purchase:                         { label: 'Facturacion Compra',     category: 'Facturacion',  type: 'currency', icon: '💰' },
    action_values_lead:                             { label: 'Facturacion Lead',       category: 'Facturacion',  type: 'currency', icon: '💰' },
};

// Dynamic action metrics (discovered from data)
const ACTION_PREFIXES = {
    'actions_':                      { labelPrefix: '',           category: 'Acciones',         type: 'number' },
    'action_values_':                { labelPrefix: 'Facturacion ', category: 'Facturacion',      type: 'currency' },
    'cost_per_action_type_':         { labelPrefix: 'Costo por ', category: 'Costos por Accion', type: 'currency' },
    'unique_actions_':               { labelPrefix: 'Unicos: ',   category: 'Acciones Unicas',  type: 'number' },
    'cost_per_unique_action_type_':  { labelPrefix: 'Costo Unico por ', category: 'Costos por Accion', type: 'currency' },
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
    'post_engagement': 'Interaccion Post',
    'page_engagement': 'Interaccion Pagina',
    'video_view': 'Vista de Video',
    'complete_registration': 'Registro Completo',
    'onsite_conversion.messaging_conversation_started_7d': 'Mensaje (on-site)',
    'add_to_cart': 'Agregar al Carrito',
    'initiate_checkout': 'Iniciar Checkout',
    'search': 'Busqueda',
    'view_content': 'Vista de Contenido',
};

export function discoverActionMetrics(items) {
    const discovered = {};
    for (const item of items) {
        for (const key of Object.keys(item)) {
            if (discovered[key] || METRIC_REGISTRY[key]) continue;
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
    const dynamic = discoverActionMetrics(items);
    return { ...METRIC_REGISTRY, ...dynamic };
}

// --- Categories (ordered) ---

const CATEGORY_ORDER = ['General', 'Engagement', 'Conversiones', 'Facturacion', 'Acciones', 'Costos por Accion', 'Acciones Unicas', 'Personalizadas'];

export function getMetricsByCategory(allMetrics) {
    const cats = {};
    for (const [key, meta] of Object.entries(allMetrics)) {
        if (!cats[meta.category]) cats[meta.category] = [];
        cats[meta.category].push({ key, ...meta });
    }
    // Return in defined order
    const ordered = {};
    for (const cat of CATEGORY_ORDER) {
        if (cats[cat]) ordered[cat] = cats[cat];
    }
    // Append any remaining
    for (const [cat, metrics] of Object.entries(cats)) {
        if (!ordered[cat]) ordered[cat] = metrics;
    }
    return ordered;
}

// --- Default visible metrics per objective ---

export const DEFAULT_METRICS = {
    OUTCOME_SALES: ['spend', 'action_values_purchase', 'roas', 'ticket_promedio', 'results', 'cost_per_result'],
    CONVERSIONS: ['spend', 'action_values_purchase', 'roas', 'ticket_promedio', 'results', 'cost_per_result'],
    MESSAGES: ['spend', 'results', 'cost_per_result', 'impressions', 'ctr'],
    OUTCOME_LEADS: ['spend', 'results', 'cost_per_result', 'impressions', 'ctr'],
    LEAD_GENERATION: ['spend', 'results', 'cost_per_result', 'impressions', 'ctr'],
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

/**
 * Inverted metrics: lower is better (costs).
 */
export function isInvertMetric(key) {
    if (key.startsWith('cost_per_')) return true;
    if (key.startsWith('cost_per_action_type_')) return true;
    if (key.startsWith('cost_per_unique_action_type_')) return true;
    return ['cpc', 'cpm', 'cpp', 'cost_per_result', 'cost_per_unique_click', 'cost_per_inline_link_click'].includes(key);
}

/**
 * Get heat color for a value within a dataset.
 * Returns a background color string (green for good, red for bad).
 */
export function getHeatColor(value, min, max, metricKey) {
    if (value == null || isNaN(value) || value === 0 || min === max) return 'transparent';
    const invert = isInvertMetric(metricKey);
    // Normalize 0-1
    let ratio = (value - min) / (max - min);
    if (invert) ratio = 1 - ratio; // flip: low cost = green

    // Green (good) → transparent (middle) → Red (bad)
    if (ratio >= 0.5) {
        // Green zone
        const intensity = (ratio - 0.5) * 2; // 0 to 1
        return `rgba(16, 185, 129, ${(intensity * 0.18).toFixed(3)})`;
    } else {
        // Red zone
        const intensity = (0.5 - ratio) * 2; // 0 to 1
        return `rgba(239, 68, 68, ${(intensity * 0.18).toFixed(3)})`;
    }
}
