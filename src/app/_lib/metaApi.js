/**
 * Meta Graph API v21.0 client — server-only.
 * Tokens never leak to client.
 * Includes in-memory cache (15min TTL) to avoid hitting rate limits.
 */

const GRAPH_API = 'https://graph.facebook.com/v21.0';

// --- Per-user in-memory cache (15 min TTL) ---
// Cache keys include a token hash so different users never share cached data.
import crypto from 'crypto';

const CACHE_TTL = 15 * 60 * 1000;
const cache = new Map();

function tokenHash(token) {
    return crypto.createHash('sha256').update(token).digest('hex').slice(0, 12);
}

function getCached(key, token) {
    const fullKey = `${tokenHash(token)}:${key}`;
    const entry = cache.get(fullKey);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) {
        cache.delete(fullKey);
        return null;
    }
    return entry.data;
}

function setCache(key, data, token) {
    const fullKey = `${tokenHash(token)}:${key}`;
    cache.set(fullKey, { data, ts: Date.now() });
    if (cache.size > 500) {
        const now = Date.now();
        for (const [k, v] of cache) {
            if (now - v.ts > CACHE_TTL) cache.delete(k);
        }
    }
}

export function clearCache() {
    cache.clear();
}

/** Small delay to space out API calls and avoid rate limits. */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function graphFetch(endpoint, token, retries = 2) {
    const sep = endpoint.includes('?') ? '&' : '?';
    // Mask token in logs
    const logEndpoint = endpoint.split('?')[0];
    const url = `${GRAPH_API}${endpoint}${sep}access_token=${token}`;

    let res;
    try {
        res = await fetch(url, { cache: 'no-store' });
    } catch (fetchErr) {
        console.error(`[Meta API] Network error on ${logEndpoint}:`, fetchErr.message);
        throw new Error(`Error de red al conectar con Meta: ${fetchErr.message}`);
    }

    // HTTP-level errors (429, 503, etc.)
    if (!res.ok && retries > 0) {
        if (res.status === 429 || res.status === 503) {
            const waitSec = parseInt(res.headers.get('retry-after') || '10', 10);
            console.warn(`[Meta API] HTTP ${res.status} on ${logEndpoint}. Retry in ${waitSec}s...`);
            await delay(waitSec * 1000);
            return graphFetch(endpoint, token, retries - 1);
        }
    }

    const data = await res.json();

    if (data.error) {
        const code = data.error.code;
        const subcode = data.error.error_subcode;
        const msg = data.error.message || 'Meta API error';
        const type = data.error.type || '';

        // Log full error for debugging
        console.error(`[Meta API] Error on ${logEndpoint}: code=${code} subcode=${subcode} type=${type} msg="${msg}"`);

        // Service temporarily unavailable (code 2) — retry
        if (code === 2 && retries > 0) {
            console.warn(`[Meta API] Temporarily unavailable. Retry in 5s...`);
            await delay(5000);
            return graphFetch(endpoint, token, retries - 1);
        }

        // Rate limit error codes: 4 (app), 17 (account), 32 (page)
        if ([4, 17, 32].includes(code) && retries > 0) {
            console.warn(`[Meta API] Rate limit (code ${code}). Retry in 15s...`);
            await delay(15000);
            return graphFetch(endpoint, token, retries - 1);
        }

        // Permission error — clear message
        if (code === 10 || code === 200 || code === 190) {
            throw new Error(`Error de permisos (code ${code}): ${msg}. Verifica que el System User tenga acceso a este recurso.`);
        }

        throw new Error(`[Meta code ${code}] ${msg}`);
    }
    return data;
}

const SCALAR_FIELDS = [
    'impressions', 'clicks', 'ctr', 'cpc', 'spend',
    'reach', 'frequency', 'cpm', 'cpp',
    'unique_clicks', 'cost_per_unique_click',
    'inline_link_clicks', 'cost_per_inline_link_click', 'inline_link_click_ctr',
    'unique_inline_link_clicks', 'cost_per_unique_inline_link_click', 'unique_inline_link_click_ctr',
].join(',');

const ARRAY_FIELDS = [
    'actions', 'action_values', 'cost_per_action_type',
    'unique_actions', 'cost_per_unique_action_type',
    'outbound_clicks', 'cost_per_outbound_click', 'outbound_clicks_ctr',
    'video_p25_watched_actions', 'video_p50_watched_actions',
    'video_p75_watched_actions', 'video_p100_watched_actions',
    'video_avg_time_watched_actions',
    'purchase_roas',
].join(',');

const ALL_METRICS = `${SCALAR_FIELDS},${ARRAY_FIELDS}`;

const INSIGHTS_METRICS = [
    'spend', 'impressions', 'clicks', 'reach',
    'actions', 'action_values', 'cost_per_action_type',
    'unique_actions', 'cost_per_unique_action_type',
    'unique_clicks', 'inline_link_clicks',
    'outbound_clicks', 'purchase_roas',
].join(',');

// --- Flatten action arrays ---

function flattenActionArray(arr, prefix) {
    const result = {};
    if (!Array.isArray(arr)) return result;
    for (const item of arr) {
        const key = `${prefix}_${item.action_type}`;
        result[key] = parseFloat(item.value) || 0;
    }
    return result;
}

function extractActions(ins) {
    return {
        ...flattenActionArray(ins.actions, 'actions'),
        ...flattenActionArray(ins.action_values, 'action_values'),
        ...flattenActionArray(ins.cost_per_action_type, 'cost_per_action_type'),
        ...flattenActionArray(ins.unique_actions, 'unique_actions'),
        ...flattenActionArray(ins.cost_per_unique_action_type, 'cost_per_unique_action_type'),
        ...flattenActionArray(ins.purchase_roas, 'purchase_roas'),
    };
}

function extractOutboundClicks(ins) {
    return {
        ...flattenActionArray(ins.outbound_clicks, 'outbound_clicks'),
        ...flattenActionArray(ins.cost_per_outbound_click, 'cost_per_outbound_click'),
        ...flattenActionArray(ins.outbound_clicks_ctr, 'outbound_clicks_ctr'),
    };
}

function extractVideoMetrics(ins) {
    return {
        ...flattenActionArray(ins.video_p25_watched_actions, 'video_p25'),
        ...flattenActionArray(ins.video_p50_watched_actions, 'video_p50'),
        ...flattenActionArray(ins.video_p75_watched_actions, 'video_p75'),
        ...flattenActionArray(ins.video_p100_watched_actions, 'video_p100'),
        ...flattenActionArray(ins.video_avg_time_watched_actions, 'video_avg_time'),
    };
}

// --- Objective → result types ---

export const OBJECTIVE_RESULT_TYPES = {
    OUTCOME_LEADS: ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead', 'onsite_web_lead'],
    LEAD_GENERATION: ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead', 'onsite_web_lead'],
    OUTCOME_SALES: ['purchase', 'offsite_conversion.fb_pixel_purchase', 'onsite_conversion.purchase', 'omni_purchase', 'onsite_web_purchase'],
    CONVERSIONS: ['purchase', 'offsite_conversion.fb_pixel_purchase', 'complete_registration', 'lead'],
    MESSAGES: ['messaging_conversation_started_7d', 'onsite_conversion.messaging_conversation_started_7d'],
    OUTCOME_ENGAGEMENT: ['post_engagement', 'page_engagement'],
    OUTCOME_TRAFFIC: ['link_click', 'landing_page_view'],
    LINK_CLICKS: ['link_click', 'landing_page_view'],
    OUTCOME_AWARENESS: ['impressions'],
    REACH: ['reach'],
};

function computeResults(actionData, objective) {
    const types = objective ? OBJECTIVE_RESULT_TYPES[objective] : null;
    if (!types) {
        const fallbackTypes = ['actions_lead', 'actions_messaging_conversation_started_7d',
            'actions_onsite_conversion.lead_grouped', 'actions_offsite_conversion.fb_pixel_lead'];
        let total = 0;
        for (const k of fallbackTypes) total += actionData[k] || 0;
        return { results: total, cost_per_result: null, result_type: null };
    }
    for (const t of types) {
        const count = actionData[`actions_${t}`] || 0;
        if (count > 0) {
            const cpa = actionData[`cost_per_action_type_${t}`] || null;
            return { results: count, cost_per_result: cpa, result_type: t };
        }
    }
    return { results: 0, cost_per_result: null, result_type: types[0] };
}

function computeRevenue(actionData, ins) {
    const purchaseTypes = ['purchase', 'offsite_conversion.fb_pixel_purchase', 'onsite_conversion.purchase', 'omni_purchase', 'onsite_web_purchase'];
    let revenue = 0;
    for (const t of purchaseTypes) {
        const val = actionData[`action_values_${t}`] || 0;
        if (val > 0) { revenue = val; break; }
    }
    let roas = null;
    const roasTypes = ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'];
    for (const t of roasTypes) {
        const val = actionData[`purchase_roas_${t}`] || 0;
        if (val > 0) { roas = val; break; }
    }
    const spend = parseFloat(ins.spend || 0);
    if (roas === null && revenue > 0 && spend > 0) {
        roas = revenue / spend;
    }
    return { revenue, roas };
}

function buildMetrics(ins, objective) {
    const actionData = extractActions(ins);
    const outboundData = extractOutboundClicks(ins);
    const videoData = extractVideoMetrics(ins);

    const spend = parseFloat(ins.spend || 0);
    const impressions = parseInt(ins.impressions || 0, 10);
    const reach = parseInt(ins.reach || 0, 10);

    // Surface outbound clicks as top-level
    const outbound_clicks = outboundData.outbound_clicks_outbound_click || 0;
    const cost_per_outbound_click = outboundData.cost_per_outbound_click_outbound_click || 0;
    const outbound_clicks_ctr = outboundData.outbound_clicks_ctr_outbound_click || 0;

    // Unique link clicks
    const unique_inline_link_clicks = parseInt(ins.unique_inline_link_clicks || 0, 10);
    const cost_per_unique_inline_link_click = parseFloat(ins.cost_per_unique_inline_link_click || 0);
    const unique_inline_link_click_ctr = parseFloat(ins.unique_inline_link_click_ctr || 0);

    // Funnel action counts
    const landing_page_views = actionData.actions_landing_page_view || 0;
    const view_content = actionData.actions_view_content || actionData['actions_offsite_conversion.fb_pixel_view_content'] || 0;
    const add_to_cart = actionData.actions_add_to_cart || actionData['actions_offsite_conversion.fb_pixel_add_to_cart'] || 0;
    const initiate_checkout = actionData.actions_initiate_checkout || actionData['actions_offsite_conversion.fb_pixel_initiate_checkout'] || 0;
    const purchases = actionData.actions_purchase || actionData['actions_offsite_conversion.fb_pixel_purchase'] || 0;
    const messages = actionData.actions_messaging_conversation_started_7d || actionData['actions_onsite_conversion.messaging_conversation_started_7d'] || 0;
    const leads = actionData.actions_lead || actionData['actions_onsite_conversion.lead_grouped'] || actionData['actions_offsite_conversion.fb_pixel_lead'] || 0;

    // Video hook rate: 3-second views / impressions
    const video_3s_views = actionData.actions_video_view || videoData.video_p25_video_view || 0;
    const hook_rate = impressions > 0 && video_3s_views > 0 ? (video_3s_views / impressions) * 100 : 0;
    const video_avg_time = videoData.video_avg_time_video_view || 0;

    // Funnel per-step costs
    const cost_per_landing_page_view = landing_page_views > 0 ? spend / landing_page_views : 0;
    const cost_per_view_content = view_content > 0 ? spend / view_content : 0;
    const cost_per_add_to_cart = add_to_cart > 0 ? spend / add_to_cart : 0;
    const cost_per_initiate_checkout = initiate_checkout > 0 ? spend / initiate_checkout : 0;

    // Funnel conversion percentages
    const pct_visitas = outbound_clicks > 0 ? (landing_page_views / outbound_clicks) * 100 : 0;
    const pct_ver_contenido = landing_page_views > 0 ? (view_content / landing_page_views) * 100 : 0;
    const pct_carritos = view_content > 0 ? (add_to_cart / view_content) * 100 : 0;
    const pct_checkout = add_to_cart > 0 ? (initiate_checkout / add_to_cart) * 100 : 0;
    const pct_compras = initiate_checkout > 0 ? (purchases / initiate_checkout) * 100 : 0;
    const pct_compras_landing = landing_page_views > 0 ? (purchases / landing_page_views) * 100 : 0;
    const pct_mensajes = unique_inline_link_clicks > 0 ? (messages / unique_inline_link_clicks) * 100 : 0;
    const tasa_conversion_leads = unique_inline_link_clicks > 0 ? (leads / unique_inline_link_clicks) * 100 : 0;
    const tasa_conversion_leads_web = landing_page_views > 0 ? (leads / landing_page_views) * 100 : 0;

    // CPP (cost per 1000 reached)
    const cpp = reach > 0 ? (spend / reach) * 1000 : parseFloat(ins.cpp || 0);

    return {
        impressions,
        clicks: parseInt(ins.clicks || 0, 10),
        ctr: parseFloat(ins.ctr || 0),
        cpc: parseFloat(ins.cpc || 0),
        spend,
        reach,
        frequency: parseFloat(ins.frequency || 0),
        cpm: parseFloat(ins.cpm || 0),
        cpp,
        unique_clicks: parseInt(ins.unique_clicks || 0, 10),
        cost_per_unique_click: parseFloat(ins.cost_per_unique_click || 0),
        inline_link_clicks: parseInt(ins.inline_link_clicks || 0, 10),
        cost_per_inline_link_click: parseFloat(ins.cost_per_inline_link_click || 0),
        inline_link_click_ctr: parseFloat(ins.inline_link_click_ctr || 0),
        // Unique link clicks
        unique_inline_link_clicks,
        cost_per_unique_inline_link_click,
        unique_inline_link_click_ctr,
        // Outbound clicks (top-level)
        outbound_clicks,
        cost_per_outbound_click,
        outbound_clicks_ctr,
        // Funnel counts
        landing_page_views,
        view_content,
        add_to_cart,
        initiate_checkout,
        // Funnel per-step costs
        cost_per_landing_page_view,
        cost_per_view_content,
        cost_per_add_to_cart,
        cost_per_initiate_checkout,
        // Funnel %
        pct_visitas,
        pct_ver_contenido,
        pct_carritos,
        pct_checkout,
        pct_compras,
        pct_compras_landing,
        pct_mensajes,
        tasa_conversion_leads,
        tasa_conversion_leads_web,
        // Video
        hook_rate,
        video_avg_time,
        // Results & revenue
        ...computeResults(actionData, objective),
        ...computeRevenue(actionData, ins),
        // Raw action data (for dynamic discovery)
        ...actionData,
        ...outboundData,
        ...videoData,
    };
}

export function recomputeResults(row, objective) {
    if (!objective) return row;
    return { ...row, ...computeResults(row, objective) };
}

// --- Public API (with cache) ---

export async function fetchMetaCampaigns(token, accountId, dateRange = null) {
    const cleanId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const cacheKey = `campaigns:${cleanId}:${JSON.stringify(dateRange)}`;
    const cached = getCached(cacheKey, token);
    if (cached) return cached;

    let insightsField = `insights.fields(${ALL_METRICS})`;
    if (dateRange) {
        insightsField = `insights.fields(${ALL_METRICS}).time_range(${JSON.stringify(dateRange)})`;
    }
    const fields = ['name', 'objective', 'status', 'start_time', 'stop_time', insightsField].join(',');
    const data = await graphFetch(`/${cleanId}/campaigns?fields=${fields}&limit=50`, token);

    const result = (data.data || []).map(c => {
        const ins = c.insights?.data?.[0] || {};
        const metrics = buildMetrics(ins, c.objective);
        return {
            id: c.id,
            campaign_name: c.name,
            objective: c.objective,
            status: c.status,
            date_start: c.start_time?.split('T')[0] || '',
            date_stop: c.stop_time?.split('T')[0] || '',
            ...metrics,
        };
    });
    setCache(cacheKey, result, token);
    return result;
}

export async function fetchMetaAdSets(token, accountId, dateRange = null) {
    const cleanId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const cacheKey = `adsets:${cleanId}:${JSON.stringify(dateRange)}`;
    const cached = getCached(cacheKey, token);
    if (cached) return cached;

    let insightsField = `insights.fields(${ALL_METRICS})`;
    if (dateRange) {
        insightsField = `insights.fields(${ALL_METRICS}).time_range(${JSON.stringify(dateRange)})`;
    }
    const fields = ['name', 'campaign_id', 'status', 'daily_budget', 'optimization_goal', 'targeting', insightsField].join(',');
    const data = await graphFetch(`/${cleanId}/adsets?fields=${fields}&limit=100`, token);

    const result = (data.data || []).map(a => {
        const ins = a.insights?.data?.[0] || {};
        const metrics = buildMetrics(ins);
        const targeting = a.targeting || {};
        const geo = targeting.geo_locations?.countries?.join(', ') || '';
        const ageMin = targeting.age_min || '';
        const ageMax = targeting.age_max || '';
        const targetingSummary = [geo, ageMin && ageMax ? `${ageMin}-${ageMax}` : ''].filter(Boolean).join(' — ');

        return {
            id: a.id,
            campaign_id: a.campaign_id,
            name: a.name,
            status: a.status,
            daily_budget: parseInt(a.daily_budget || 0, 10),
            optimization_goal: a.optimization_goal,
            targeting_summary: targetingSummary || 'Sin especificar',
            ...metrics,
        };
    });
    setCache(cacheKey, result, token);
    return result;
}

export async function fetchMetaAds(token, accountId, dateRange = null) {
    const cleanId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const cacheKey = `ads:${cleanId}:${JSON.stringify(dateRange)}`;
    const cached = getCached(cacheKey, token);
    if (cached) return cached;

    let insightsField = `insights.fields(${ALL_METRICS})`;
    if (dateRange) {
        insightsField = `insights.fields(${ALL_METRICS}).time_range(${JSON.stringify(dateRange)})`;
    }
    const fields = [
        'name', 'adset_id', 'campaign_id', 'effective_status',
        'creative.fields(title,body,call_to_action_type,object_type,thumbnail_url,video_id,image_url,object_story_spec)',
        insightsField,
    ].join(',');
    const data = await graphFetch(`/${cleanId}/ads?fields=${fields}&limit=100`, token);

    const result = (data.data || []).map(a => {
        const ins = a.insights?.data?.[0] || {};
        const creative = a.creative || {};
        const metrics = buildMetrics(ins);
        // Detect real format from creative fields + video metrics
        const objectType = creative.object_type || '';
        const hasVideoId = !!creative.video_id;
        const storySpec = creative.object_story_spec || {};
        const hasCarousel = !!(storySpec.link_data?.child_attachments?.length > 1);
        // Check video metrics from insights — if the ad has video views, it's a video
        const hasVideoMetrics = !!(metrics.video_p25_video_view || metrics.video_p50_video_view
            || metrics.video_p75_video_view || metrics.video_p100_video_view);

        let detectedFormat;
        if (objectType === 'VIDEO' || objectType === 'SLIDESHOW' || hasVideoId) {
            detectedFormat = 'VIDEO';
        } else if (hasCarousel || objectType === 'CAROUSEL') {
            detectedFormat = 'CAROUSEL';
        } else if (objectType === 'SHARE') {
            // SHARE is ambiguous — use video metrics to distinguish
            // If the ad has significant video views relative to impressions, it's likely a video/reel
            const impressions = parseInt(ins.impressions || 0);
            const videoViews = metrics.video_p25_video_view || 0;
            if (hasVideoMetrics && impressions > 0 && videoViews / impressions > 0.1) {
                detectedFormat = 'VIDEO';
            } else if (hasVideoMetrics) {
                // Has some video views but low ratio — Advantage+ auto-reel on a static ad
                detectedFormat = 'IMAGE';
            } else {
                detectedFormat = 'IMAGE';
            }
        } else if (objectType === 'PHOTO' || creative.image_url) {
            detectedFormat = 'IMAGE';
        } else {
            detectedFormat = objectType || 'UNKNOWN';
        }

        return {
            id: a.id,
            adset_id: a.adset_id,
            campaign_id: a.campaign_id,
            name: a.name,
            format: detectedFormat,
            status: a.effective_status,
            headline: creative.title || '',
            body: creative.body || '',
            cta: creative.call_to_action_type || '',
            thumbnail_url: creative.thumbnail_url || '',
            ...metrics,
        };
    });
    setCache(cacheKey, result, token);
    return result;
}

export async function fetchMetaInsights(token, accountId, dateRange = null) {
    const cleanId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const cacheKey = `insights:${cleanId}:${JSON.stringify(dateRange)}`;
    const cached = getCached(cacheKey, token);
    if (cached) return cached;

    // level=campaign gives us campaign_id per row, so we can filter by objective client-side
    let endpoint;
    if (dateRange) {
        endpoint = `/${cleanId}/insights?fields=campaign_id,campaign_name,${INSIGHTS_METRICS}&time_increment=1&level=campaign&limit=500&time_range=${JSON.stringify(dateRange)}`;
    } else {
        endpoint = `/${cleanId}/insights?fields=campaign_id,campaign_name,${INSIGHTS_METRICS}&time_increment=1&level=campaign&limit=500&date_preset=last_30d`;
    }

    let allData = [];
    let data = await graphFetch(endpoint, token);
    allData.push(...(data.data || []));
    while (data.paging?.next) {
        const res = await fetch(data.paging.next, { cache: 'no-store' });
        data = await res.json();
        if (data.error) break;
        allData.push(...(data.data || []));
    }

    const result = allData.map(d => {
        const actionData = extractActions(d);
        return {
            date: d.date_start,
            campaign_id: d.campaign_id,
            spend: parseFloat(d.spend || 0),
            impressions: parseInt(d.impressions || 0, 10),
            clicks: parseInt(d.clicks || 0, 10),
            reach: parseInt(d.reach || 0, 10),
            ...computeResults(actionData, null),
            ...actionData,
        };
    });
    setCache(cacheKey, result, token);
    return result;
}

/**
 * Fetch insights broken down by region (province/state).
 * Returns [{ region, spend, impressions, clicks, ... }]
 */
export async function fetchMetaInsightsByRegion(token, accountId, dateRange = null) {
    const cleanId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const cacheKey = `insights_region:${cleanId}:${JSON.stringify(dateRange)}`;
    const cached = getCached(cacheKey, token);
    if (cached) return cached;

    // level=campaign so we can filter by objective client-side
    const fields = 'campaign_id,spend,impressions,clicks,reach';
    let endpoint;
    if (dateRange) {
        endpoint = `/${cleanId}/insights?fields=${fields}&breakdowns=region&level=campaign&limit=500&time_range=${JSON.stringify(dateRange)}`;
    } else {
        endpoint = `/${cleanId}/insights?fields=${fields}&breakdowns=region&level=campaign&limit=500&date_preset=last_30d`;
    }

    let allData = [];
    let data = await graphFetch(endpoint, token);
    allData.push(...(data.data || []));
    while (data.paging?.next) {
        const res = await fetch(data.paging.next, { cache: 'no-store' });
        data = await res.json();
        if (data.error) break;
        allData.push(...(data.data || []));
    }

    const result = allData.map(d => ({
        campaign_id: d.campaign_id,
        region: d.region || 'Sin region',
        spend: parseFloat(d.spend || 0),
        impressions: parseInt(d.impressions || 0, 10),
        clicks: parseInt(d.clicks || 0, 10),
        reach: parseInt(d.reach || 0, 10),
    }));

    // Don't aggregate here — let the client filter by campaign first
    const aggregated = result;
    setCache(cacheKey, aggregated, token);
    return aggregated;
}

/**
 * Fetch insights broken down by age range.
 * Returns [{ campaign_id, age, spend, impressions, clicks, reach }]
 */
export async function fetchMetaInsightsByAge(token, accountId, dateRange = null) {
    const cleanId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const cacheKey = `insights_age:${cleanId}:${JSON.stringify(dateRange)}`;
    const cached = getCached(cacheKey, token);
    if (cached) return cached;

    const fields = 'campaign_id,spend,impressions,clicks,reach';
    let endpoint;
    if (dateRange) {
        endpoint = `/${cleanId}/insights?fields=${fields}&breakdowns=age&level=campaign&limit=500&time_range=${JSON.stringify(dateRange)}`;
    } else {
        endpoint = `/${cleanId}/insights?fields=${fields}&breakdowns=age&level=campaign&limit=500&date_preset=last_30d`;
    }

    let allData = [];
    let data = await graphFetch(endpoint, token);
    allData.push(...(data.data || []));
    while (data.paging?.next) {
        const res = await fetch(data.paging.next, { cache: 'no-store' });
        data = await res.json();
        if (data.error) break;
        allData.push(...(data.data || []));
    }

    const result = allData.map(d => ({
        campaign_id: d.campaign_id,
        age: d.age || 'Desconocido',
        spend: parseFloat(d.spend || 0),
        impressions: parseInt(d.impressions || 0, 10),
        clicks: parseInt(d.clicks || 0, 10),
        reach: parseInt(d.reach || 0, 10),
    }));

    setCache(cacheKey, result, token);
    return result;
}

/**
 * Fetch insights broken down by publisher platform (Facebook, Instagram, etc.).
 * Returns [{ campaign_id, platform, spend, impressions, clicks, reach }]
 */
export async function fetchMetaInsightsByPlatform(token, accountId, dateRange = null) {
    const cleanId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const cacheKey = `insights_platform:${cleanId}:${JSON.stringify(dateRange)}`;
    const cached = getCached(cacheKey, token);
    if (cached) return cached;

    const fields = 'campaign_id,spend,impressions,clicks,reach';
    let endpoint;
    if (dateRange) {
        endpoint = `/${cleanId}/insights?fields=${fields}&breakdowns=publisher_platform&level=campaign&limit=500&time_range=${JSON.stringify(dateRange)}`;
    } else {
        endpoint = `/${cleanId}/insights?fields=${fields}&breakdowns=publisher_platform&level=campaign&limit=500&date_preset=last_30d`;
    }

    let allData = [];
    let data = await graphFetch(endpoint, token);
    allData.push(...(data.data || []));
    while (data.paging?.next) {
        const res = await fetch(data.paging.next, { cache: 'no-store' });
        data = await res.json();
        if (data.error) break;
        allData.push(...(data.data || []));
    }

    const result = allData.map(d => ({
        campaign_id: d.campaign_id,
        platform: d.publisher_platform || 'Desconocido',
        spend: parseFloat(d.spend || 0),
        impressions: parseInt(d.impressions || 0, 10),
        clicks: parseInt(d.clicks || 0, 10),
        reach: parseInt(d.reach || 0, 10),
    }));

    setCache(cacheKey, result, token);
    return result;
}

export async function exchangeForLongLivedToken(shortToken, appId, appSecret) {
    const url = `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(shortToken)}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'Error al renovar token');
    return {
        access_token: data.access_token,
        expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
    };
}

export async function fetchMetaAccountInfo(token, accountId) {
    const cleanId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const data = await graphFetch(`/${cleanId}?fields=name,currency,timezone_name,account_status`, token);
    return {
        account_id: cleanId,
        account_name: data.name,
        currency: data.currency,
        timezone: data.timezone_name,
    };
}

/**
 * Fetch a paginated list from a Graph API endpoint.
 * Returns all items across pages.
 */
async function fetchAllPages(endpoint, token) {
    let all = [];
    let data = await graphFetch(endpoint, token);
    all.push(...(data.data || []));
    while (data.paging?.next) {
        const res = await fetch(data.paging.next, { cache: 'no-store' });
        data = await res.json();
        if (data.error) break;
        all.push(...(data.data || []));
    }
    return all;
}

/**
 * Fetch ALL ad accounts the token has access to via /me/adaccounts.
 * Works with User Tokens (Graph Explorer) and System User Tokens.
 * Returns [{ id: 'act_xxx', name, currency, timezone, account_status }]
 */
export async function fetchMyAdAccounts(token) {
    const cacheKey = 'my_ad_accounts';
    const cached = getCached(cacheKey, token);
    if (cached) return cached;

    const fields = 'name,currency,timezone_name,account_status,amount_spent';
    const accounts = await fetchAllPages(`/me/adaccounts?fields=${fields}&limit=100`, token);

    const result = accounts.map(a => ({
        id: a.id,
        name: a.name || a.id,
        currency: a.currency || 'USD',
        timezone: a.timezone_name || '',
        account_status: a.account_status,
        amount_spent: parseInt(a.amount_spent || 0, 10),
    }));
    setCache(cacheKey, result, token);
    return result;
}

/**
 * Fetch ALL ad accounts accessible by a Business Manager / Portfolio.
 * Combines owned_ad_accounts + client_ad_accounts.
 * Fallback if /me/adaccounts doesn't work for a given token type.
 */
export async function fetchBusinessAdAccounts(token, businessId) {
    const cleanId = String(businessId).replace(/\D/g, '');
    const cacheKey = `biz_accounts:${cleanId}`;
    const cached = getCached(cacheKey, token);
    if (cached) return cached;

    const fields = 'name,currency,timezone_name,account_status,amount_spent';

    const [owned, client] = await Promise.all([
        fetchAllPages(`/${cleanId}/owned_ad_accounts?fields=${fields}&limit=100`, token).catch(() => []),
        fetchAllPages(`/${cleanId}/client_ad_accounts?fields=${fields}&limit=100`, token).catch(() => []),
    ]);

    const seen = new Map();
    for (const a of owned) seen.set(a.id, a);
    for (const a of client) if (!seen.has(a.id)) seen.set(a.id, a);

    const result = [...seen.values()].map(a => ({
        id: a.id,
        name: a.name || a.id,
        currency: a.currency || 'USD',
        timezone: a.timezone_name || '',
        account_status: a.account_status,
        amount_spent: parseInt(a.amount_spent || 0, 10),
    }));
    setCache(cacheKey, result, token);
    return result;
}

/**
 * Fetch all Business Portfolios accessible by the user token.
 */
export async function fetchMyBusinesses(token) {
    const cacheKey = 'my_businesses';
    const cached = getCached(cacheKey, token);
    if (cached) return cached;

    const data = await fetchAllPages('/me/businesses?fields=id,name,profile_picture_uri&limit=50', token);
    const result = data.map(b => ({
        id: b.id,
        name: b.name,
        picture: b.profile_picture_uri || null,
    }));
    setCache(cacheKey, result, token);
    return result;
}
