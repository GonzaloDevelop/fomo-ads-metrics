/**
 * Google Ads metric registry — same format as metrics.js for Meta.
 * Allows the dashboard to reuse the same KPI, chart, and table components.
 */

export const GOOGLE_METRIC_REGISTRY = {
    // GENERAL
    impressions:              { label: 'Impresiones',             category: 'General',      type: 'number',   icon: '👁' },
    clicks:                   { label: 'Clics',                   category: 'General',      type: 'number',   icon: '👆' },
    spend:                    { label: 'Inversion',               category: 'General',      type: 'currency', icon: '💰' },
    ctr:                      { label: 'CTR',                     category: 'General',      type: 'percent',  icon: '📊' },
    cpc:                      { label: 'CPC',                     category: 'General',      type: 'currency', icon: '💵' },
    cpm:                      { label: 'CPM',                     category: 'General',      type: 'currency', icon: '💵' },
    interactions:             { label: 'Interacciones',           category: 'General',      type: 'number',   icon: '👆' },

    // CONVERSIONES
    conversions:              { label: 'Conversiones',            category: 'Conversiones', type: 'decimal',  icon: '🎯' },
    results:                  { label: 'Resultados',              category: 'Conversiones', type: 'decimal',  icon: '🎯' },
    cost_per_conversion:      { label: 'CPA',                     category: 'Conversiones', type: 'currency', icon: '🎯' },
    cost_per_result:          { label: 'Costo por Resultado',     category: 'Conversiones', type: 'currency', icon: '🎯' },
    conversions_value:        { label: 'Valor de Conversiones',   category: 'Conversiones', type: 'currency', icon: '💰' },
    revenue:                  { label: 'Revenue',                 category: 'Conversiones', type: 'currency', icon: '💰' },
    roas:                     { label: 'ROAS',                    category: 'Conversiones', type: 'roas',     icon: '📈' },
    all_conversions:          { label: 'Todas las Conversiones',  category: 'Conversiones', type: 'decimal',  icon: '🔄' },
    all_conversions_value:    { label: 'Valor Total Conv.',       category: 'Conversiones', type: 'currency', icon: '💰' },

    // IMPRESSION SHARE (Search)
    search_impression_share:                  { label: 'Search IS',              category: 'Impression Share', type: 'percent', icon: '📡' },
    search_budget_lost_impression_share:      { label: 'IS Perdido (Budget)',    category: 'Impression Share', type: 'percent', icon: '💸' },
    search_rank_lost_impression_share:        { label: 'IS Perdido (Rank)',      category: 'Impression Share', type: 'percent', icon: '📉' },

    // VIDEO
    video_views:              { label: 'Vistas de Video',         category: 'Video',        type: 'number',   icon: '🎬' },
};

// Campaign type labels
export const CAMPAIGN_TYPE_LABELS = {
    SEARCH: 'Search',
    SHOPPING: 'Shopping',
    PERFORMANCE_MAX: 'PMax',
    DISPLAY: 'Display',
    VIDEO: 'Video',
    DEMAND_GEN: 'Demand Gen',
    MULTI_CHANNEL: 'Multi-canal',
    LOCAL: 'Local',
    SMART: 'Smart',
    HOTEL: 'Hotel',
    DISCOVERY: 'Discovery',
};

// Bidding strategy labels
export const BIDDING_STRATEGY_LABELS = {
    TARGET_CPA: 'Target CPA',
    TARGET_ROAS: 'Target ROAS',
    MAXIMIZE_CONVERSIONS: 'Max Conversiones',
    MAXIMIZE_CONVERSION_VALUE: 'Max Valor Conv.',
    TARGET_SPEND: 'Max Clics',
    MANUAL_CPC: 'CPC Manual',
    MANUAL_CPM: 'CPM Manual',
    TARGET_IMPRESSION_SHARE: 'Target IS',
    ENHANCED_CPC: 'eCPC',
};

export function getAllGoogleMetrics(items) {
    const dynamic = {};
    // Discover any extra numeric fields from data
    for (const item of items) {
        for (const key of Object.keys(item)) {
            if (dynamic[key] || GOOGLE_METRIC_REGISTRY[key]) continue;
            if (typeof item[key] === 'number' && !['id', 'campaign_id'].includes(key)) {
                dynamic[key] = {
                    label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    category: 'Otros',
                    type: 'number',
                    icon: '📊',
                };
            }
        }
    }
    return { ...GOOGLE_METRIC_REGISTRY, ...dynamic };
}

export const GOOGLE_DEFAULT_METRICS = {
    SEARCH: ['spend', 'conversions', 'cost_per_conversion', 'roas', 'ctr', 'cpc'],
    SHOPPING: ['spend', 'conversions_value', 'roas', 'conversions', 'cost_per_conversion', 'ctr'],
    PERFORMANCE_MAX: ['spend', 'conversions_value', 'roas', 'conversions', 'cost_per_conversion'],
    VIDEO: ['spend', 'video_views', 'impressions', 'clicks', 'ctr'],
    _DEFAULT: ['spend', 'conversions', 'cost_per_conversion', 'impressions', 'clicks', 'ctr'],
};
