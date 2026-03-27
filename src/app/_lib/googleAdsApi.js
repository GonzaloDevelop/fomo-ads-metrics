/**
 * Google Ads API v18 client — server-only.
 * Uses OAuth2 refresh tokens to get access tokens.
 * All monetary values from Google Ads are in micros (÷ 1,000,000).
 * Includes in-memory cache (15min TTL).
 */

import crypto from 'crypto';

const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v20';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// --- Cache (same pattern as metaApi.js) ---
const CACHE_TTL = 15 * 60 * 1000;
const cache = new Map();

function tokenHash(token) {
    return crypto.createHash('sha256').update(token).digest('hex').slice(0, 12);
}

function getCached(key, token) {
    const fullKey = `g:${tokenHash(token)}:${key}`;
    const entry = cache.get(fullKey);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(fullKey); return null; }
    return entry.data;
}

function setCache(key, data, token) {
    const fullKey = `g:${tokenHash(token)}:${key}`;
    cache.set(fullKey, { data, ts: Date.now() });
    if (cache.size > 500) {
        const now = Date.now();
        for (const [k, v] of cache) {
            if (now - v.ts > CACHE_TTL) cache.delete(k);
        }
    }
}

export function clearGoogleCache() {
    for (const key of cache.keys()) {
        if (key.startsWith('g:')) cache.delete(key);
    }
}

// --- OAuth2 token management ---

/**
 * Exchange authorization code for tokens.
 * Returns { access_token, refresh_token, email }
 */
export async function exchangeCodeForTokens(code) {
    const res = await fetch(OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_ADS_CLIENT_ID,
            client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_ADS_REDIRECT_URI,
            grant_type: 'authorization_code',
        }),
    });

    const data = await res.json();
    if (data.error) {
        throw new Error(`OAuth error: ${data.error_description || data.error}`);
    }

    // Get user email from id_token or userinfo
    let email = null;
    if (data.id_token) {
        try {
            const payload = JSON.parse(Buffer.from(data.id_token.split('.')[1], 'base64').toString());
            email = payload.email;
        } catch {}
    }
    if (!email && data.access_token) {
        try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${data.access_token}` },
            });
            const userInfo = await userRes.json();
            email = userInfo.email;
        } catch {}
    }

    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        email,
    };
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refreshAccessToken(refreshToken) {
    const res = await fetch(OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: process.env.GOOGLE_ADS_CLIENT_ID,
            client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
            grant_type: 'refresh_token',
        }),
    });

    const data = await res.json();
    if (data.error) {
        throw new Error(`Token refresh error: ${data.error_description || data.error}`);
    }
    return data.access_token;
}

// --- Google Ads API calls ---

async function gaqlQuery(accessToken, customerId, query, loginCustomerId, retries = 2) {
    const cleanId = customerId.replace(/-/g, '');
    const url = `${GOOGLE_ADS_API}/customers/${cleanId}/googleAds:searchStream`;

    const headers = {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        'Content-Type': 'application/json',
    };
    if (loginCustomerId) {
        headers['login-customer-id'] = loginCustomerId.replace(/-/g, '');
    }

    let res;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query }),
            cache: 'no-store',
        });
    } catch (fetchErr) {
        console.error(`[Google Ads] Network error:`, fetchErr.message);
        throw new Error(`Error de red al conectar con Google Ads: ${fetchErr.message}`);
    }

    if (!res.ok) {
        if ((res.status === 429 || res.status === 503) && retries > 0) {
            console.warn(`[Google Ads] HTTP ${res.status}. Retry in 10s...`);
            await new Promise(r => setTimeout(r, 10000));
            return gaqlQuery(accessToken, customerId, query, loginCustomerId, retries - 1);
        }

        const responseText = await res.text();
        let errorBody = {};
        try { errorBody = JSON.parse(responseText); } catch {
            console.error(`[Google Ads] Non-JSON error response (${res.status}):`, responseText.slice(0, 500));
        }
        const errorMsg = errorBody?.error?.message || `HTTP ${res.status}`;
        const errorCode = errorBody?.error?.code;

        // Token expired
        if (res.status === 401) {
            throw new Error('GOOGLE_TOKEN_EXPIRED');
        }

        console.error(`[Google Ads] Error: ${errorMsg} (code ${errorCode})`);
        throw new Error(`[Google Ads] ${errorMsg}`);
    }

    const resContentType = res.headers.get('content-type') || '';
    if (!resContentType.includes('application/json')) {
        const text = await res.text();
        console.error(`[Google Ads] GAQL non-JSON response (${res.status}):`, text.slice(0, 500));
        throw new Error(`Google Ads API devolvio respuesta inesperada (HTTP ${res.status})`);
    }

    const data = await res.json();

    // searchStream returns array of batches
    const allResults = [];
    if (Array.isArray(data)) {
        for (const batch of data) {
            if (batch.results) allResults.push(...batch.results);
        }
    }
    return allResults;
}

// --- Micros conversion ---
function micros(val) {
    return val ? val / 1_000_000 : 0;
}

// --- Public API ---

/**
 * List all accessible customer accounts.
 * Returns [{ customerId, descriptiveName, currencyCode, manager }]
 */
export async function fetchAccessibleCustomers(accessToken) {
    const cacheKey = 'accessible_customers';
    const cached = getCached(cacheKey, accessToken);
    if (cached) return cached;

    // First get list of accessible customer IDs
    const listUrl = `${GOOGLE_ADS_API}/customers:listAccessibleCustomers`;
    const listRes = await fetch(listUrl, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        },
        cache: 'no-store',
    });

    const contentType = listRes.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        const text = await listRes.text();
        console.error('[Google Ads] listAccessibleCustomers returned non-JSON:', listRes.status, text.slice(0, 500));
        throw new Error(`Google Ads API error (HTTP ${listRes.status}). Verifica que la API de Google Ads este habilitada en tu proyecto de Google Cloud.`);
    }

    const listData = await listRes.json();
    if (listData.error) {
        console.error('[Google Ads] listAccessibleCustomers error:', JSON.stringify(listData.error));
        throw new Error(listData.error.message || 'Error listing customers');
    }

    const resourceNames = listData.resourceNames || [];
    const customerIds = resourceNames.map(r => r.split('/').pop());
    console.log(`[Google Ads] Found ${customerIds.length} accessible customers:`, customerIds);

    // Fetch details for each customer
    const accounts = [];
    for (const cid of customerIds) {
        try {
            const results = await gaqlQuery(
                accessToken, cid,
                `SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.manager, customer.status
                 FROM customer
                 LIMIT 1`,
                null
            );
            console.log(`[Google Ads] Customer ${cid} details:`, JSON.stringify(results[0]?.customer));
            if (results.length > 0) {
                const c = results[0].customer;
                accounts.push({
                    customerId: c.id,
                    descriptiveName: c.descriptiveName || c.id,
                    currencyCode: c.currencyCode || 'USD',
                    manager: c.manager || false,
                    status: c.status,
                });
            }
        } catch (err) {
            console.error(`[Google Ads] Failed to fetch customer ${cid}:`, err.message);
        }
    }
    console.log(`[Google Ads] Total accounts: ${accounts.length}, managers: ${accounts.filter(a => a.manager).length}, clients: ${accounts.filter(a => !a.manager).length}`);

    setCache(cacheKey, accounts, accessToken);
    return accounts;
}

/**
 * Fetch campaigns with metrics for a date range.
 */
export async function fetchGoogleCampaigns(accessToken, customerId, dateRange, loginCustomerId) {
    const cacheKey = `g_campaigns:${customerId}:${JSON.stringify(dateRange)}`;
    const cached = getCached(cacheKey, accessToken);
    if (cached) return cached;

    const dateFilter = dateRange
        ? `AND segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'`
        : `AND segments.date DURING LAST_30_DAYS`;

    const query = `
        SELECT
            campaign.id,
            campaign.name,
            campaign.status,
            campaign.advertising_channel_type,
            campaign.bidding_strategy_type,
            campaign.start_date,
            campaign.end_date,
            metrics.cost_micros,
            metrics.impressions,
            metrics.clicks,
            metrics.ctr,
            metrics.average_cpc,
            metrics.conversions,
            metrics.conversions_value,
            metrics.cost_per_conversion,
            metrics.all_conversions,
            metrics.all_conversions_value,
            metrics.search_impression_share,
            metrics.search_budget_lost_impression_share,
            metrics.search_rank_lost_impression_share,
            metrics.video_views,
            metrics.interactions
        FROM campaign
        WHERE campaign.status != 'REMOVED'
        ${dateFilter}
    `;

    const results = await gaqlQuery(accessToken, customerId, query, loginCustomerId);

    // Aggregate by campaign (rows may be split by date segment)
    const campaignMap = {};
    for (const row of results) {
        const c = row.campaign;
        const m = row.metrics;
        const id = c.id;

        if (!campaignMap[id]) {
            campaignMap[id] = {
                id,
                campaign_name: c.name,
                status: c.status,
                campaign_type: c.advertisingChannelType,
                bidding_strategy: c.biddingStrategyType,
                date_start: c.startDate || '',
                date_stop: c.endDate || '',
                spend: 0, impressions: 0, clicks: 0, conversions: 0,
                conversions_value: 0, all_conversions: 0, all_conversions_value: 0,
                video_views: 0, interactions: 0,
                // Will be computed after aggregation
                ctr: 0, cpc: 0, cpm: 0, cost_per_conversion: 0, roas: 0,
                search_impression_share: null,
                search_budget_lost_impression_share: null,
                search_rank_lost_impression_share: null,
            };
        }

        const agg = campaignMap[id];
        agg.spend += micros(m.costMicros);
        agg.impressions += parseInt(m.impressions || 0);
        agg.clicks += parseInt(m.clicks || 0);
        agg.conversions += parseFloat(m.conversions || 0);
        agg.conversions_value += parseFloat(m.conversionsValue || 0);
        agg.all_conversions += parseFloat(m.allConversions || 0);
        agg.all_conversions_value += parseFloat(m.allConversionsValue || 0);
        agg.video_views += parseInt(m.videoViews || 0);
        agg.interactions += parseInt(m.interactions || 0);

        // Keep last non-null IS values
        if (m.searchImpressionShare != null) agg.search_impression_share = m.searchImpressionShare;
        if (m.searchBudgetLostImpressionShare != null) agg.search_budget_lost_impression_share = m.searchBudgetLostImpressionShare;
        if (m.searchRankLostImpressionShare != null) agg.search_rank_lost_impression_share = m.searchRankLostImpressionShare;
    }

    // Compute derived metrics
    const result = Object.values(campaignMap).map(c => {
        if (c.impressions > 0) c.ctr = (c.clicks / c.impressions) * 100;
        if (c.clicks > 0) c.cpc = c.spend / c.clicks;
        if (c.impressions > 0) c.cpm = (c.spend / c.impressions) * 1000;
        if (c.conversions > 0) c.cost_per_conversion = c.spend / c.conversions;
        if (c.spend > 0 && c.conversions_value > 0) c.roas = c.conversions_value / c.spend;
        // Map to unified field names
        c.results = c.conversions;
        c.cost_per_result = c.cost_per_conversion;
        c.revenue = c.conversions_value;
        return c;
    });

    setCache(cacheKey, result, accessToken);
    return result;
}

/**
 * Fetch ad groups with metrics.
 */
export async function fetchGoogleAdGroups(accessToken, customerId, dateRange, loginCustomerId) {
    const cacheKey = `g_adgroups:${customerId}:${JSON.stringify(dateRange)}`;
    const cached = getCached(cacheKey, accessToken);
    if (cached) return cached;

    const dateFilter = dateRange
        ? `AND segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'`
        : `AND segments.date DURING LAST_30_DAYS`;

    const query = `
        SELECT
            ad_group.id,
            ad_group.name,
            ad_group.status,
            ad_group.campaign,
            ad_group.type,
            metrics.cost_micros,
            metrics.impressions,
            metrics.clicks,
            metrics.ctr,
            metrics.average_cpc,
            metrics.conversions,
            metrics.conversions_value,
            metrics.cost_per_conversion
        FROM ad_group
        WHERE ad_group.status != 'REMOVED'
        ${dateFilter}
    `;

    const results = await gaqlQuery(accessToken, customerId, query, loginCustomerId);

    const groupMap = {};
    for (const row of results) {
        const ag = row.adGroup;
        const m = row.metrics;
        const id = ag.id;
        // Extract campaign ID from resource name: customers/123/campaigns/456
        const campaignId = ag.campaign?.split('/')?.pop() || '';

        if (!groupMap[id]) {
            groupMap[id] = {
                id, name: ag.name, status: ag.status,
                campaign_id: campaignId,
                ad_group_type: ag.type,
                spend: 0, impressions: 0, clicks: 0, conversions: 0,
                conversions_value: 0, ctr: 0, cpc: 0, cost_per_conversion: 0, roas: 0,
            };
        }
        const agg = groupMap[id];
        agg.spend += micros(m.costMicros);
        agg.impressions += parseInt(m.impressions || 0);
        agg.clicks += parseInt(m.clicks || 0);
        agg.conversions += parseFloat(m.conversions || 0);
        agg.conversions_value += parseFloat(m.conversionsValue || 0);
    }

    const result = Object.values(groupMap).map(g => {
        if (g.impressions > 0) g.ctr = (g.clicks / g.impressions) * 100;
        if (g.clicks > 0) g.cpc = g.spend / g.clicks;
        if (g.conversions > 0) g.cost_per_conversion = g.spend / g.conversions;
        if (g.spend > 0 && g.conversions_value > 0) g.roas = g.conversions_value / g.spend;
        g.results = g.conversions;
        g.cost_per_result = g.cost_per_conversion;
        g.revenue = g.conversions_value;
        return g;
    });

    setCache(cacheKey, result, accessToken);
    return result;
}

/**
 * Fetch ads with metrics.
 */
export async function fetchGoogleAds(accessToken, customerId, dateRange, loginCustomerId) {
    const cacheKey = `g_ads:${customerId}:${JSON.stringify(dateRange)}`;
    const cached = getCached(cacheKey, accessToken);
    if (cached) return cached;

    const dateFilter = dateRange
        ? `AND segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'`
        : `AND segments.date DURING LAST_30_DAYS`;

    const query = `
        SELECT
            ad_group_ad.ad.id,
            ad_group_ad.ad.name,
            ad_group_ad.ad.type,
            ad_group_ad.ad.final_urls,
            ad_group_ad.ad.responsive_search_ad.headlines,
            ad_group_ad.ad.responsive_search_ad.descriptions,
            ad_group_ad.status,
            ad_group_ad.ad_strength,
            ad_group_ad.ad_group,
            campaign.id,
            metrics.cost_micros,
            metrics.impressions,
            metrics.clicks,
            metrics.ctr,
            metrics.average_cpc,
            metrics.conversions,
            metrics.conversions_value,
            metrics.cost_per_conversion
        FROM ad_group_ad
        WHERE ad_group_ad.status != 'REMOVED'
        ${dateFilter}
    `;

    const results = await gaqlQuery(accessToken, customerId, query, loginCustomerId);

    const adMap = {};
    for (const row of results) {
        const ad = row.adGroupAd;
        const m = row.metrics;
        const adData = ad.ad || {};
        const id = adData.id;
        const campaignId = row.campaign?.id || '';
        const adGroupId = ad.adGroup?.split('/')?.pop() || '';

        if (!adMap[id]) {
            // Extract RSA headline text
            const headlines = adData.responsiveSearchAd?.headlines?.map(h => h.text) || [];
            const descriptions = adData.responsiveSearchAd?.descriptions?.map(d => d.text) || [];

            adMap[id] = {
                id,
                name: adData.name || headlines.slice(0, 2).join(' | ') || `Ad ${id}`,
                format: adData.type || 'UNKNOWN',
                status: ad.status,
                ad_strength: ad.adStrength || '',
                adset_id: adGroupId,
                campaign_id: campaignId,
                headline: headlines.join(' | '),
                body: descriptions.join(' | '),
                final_url: adData.finalUrls?.[0] || '',
                spend: 0, impressions: 0, clicks: 0, conversions: 0,
                conversions_value: 0, ctr: 0, cpc: 0, cost_per_conversion: 0, roas: 0,
            };
        }
        const agg = adMap[id];
        agg.spend += micros(m.costMicros);
        agg.impressions += parseInt(m.impressions || 0);
        agg.clicks += parseInt(m.clicks || 0);
        agg.conversions += parseFloat(m.conversions || 0);
        agg.conversions_value += parseFloat(m.conversionsValue || 0);
    }

    const result = Object.values(adMap).map(a => {
        if (a.impressions > 0) a.ctr = (a.clicks / a.impressions) * 100;
        if (a.clicks > 0) a.cpc = a.spend / a.clicks;
        if (a.conversions > 0) a.cost_per_conversion = a.spend / a.conversions;
        if (a.spend > 0 && a.conversions_value > 0) a.roas = a.conversions_value / a.spend;
        a.results = a.conversions;
        a.cost_per_result = a.cost_per_conversion;
        a.revenue = a.conversions_value;
        return a;
    });

    setCache(cacheKey, result, accessToken);
    return result;
}

/**
 * Fetch daily insights (time series) for charts.
 */
export async function fetchGoogleInsights(accessToken, customerId, dateRange, loginCustomerId) {
    const cacheKey = `g_insights:${customerId}:${JSON.stringify(dateRange)}`;
    const cached = getCached(cacheKey, accessToken);
    if (cached) return cached;

    const dateFilter = dateRange
        ? `segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'`
        : `segments.date DURING LAST_30_DAYS`;

    const query = `
        SELECT
            segments.date,
            campaign.id,
            metrics.cost_micros,
            metrics.impressions,
            metrics.clicks,
            metrics.conversions,
            metrics.conversions_value,
            metrics.all_conversions,
            metrics.all_conversions_value
        FROM campaign
        WHERE campaign.status != 'REMOVED'
        AND ${dateFilter}
    `;

    const results = await gaqlQuery(accessToken, customerId, query, loginCustomerId);

    const result = results.map(row => {
        const m = row.metrics;
        const spend = micros(m.costMicros);
        const clicks = parseInt(m.clicks || 0);
        const conversions = parseFloat(m.conversions || 0);
        const conversions_value = parseFloat(m.conversionsValue || 0);
        return {
            date: row.segments.date,
            campaign_id: row.campaign?.id || '',
            spend,
            impressions: parseInt(m.impressions || 0),
            clicks,
            conversions,
            conversions_value,
            results: conversions,
            revenue: conversions_value,
            ctr: parseInt(m.impressions || 0) > 0 ? (clicks / parseInt(m.impressions)) * 100 : 0,
            cost_per_result: conversions > 0 ? spend / conversions : 0,
            roas: spend > 0 ? conversions_value / spend : 0,
        };
    });

    setCache(cacheKey, result, accessToken);
    return result;
}

/**
 * Fetch insights by geographic region.
 */
export async function fetchGoogleInsightsByRegion(accessToken, customerId, dateRange, loginCustomerId) {
    const cacheKey = `g_region:${customerId}:${JSON.stringify(dateRange)}`;
    const cached = getCached(cacheKey, accessToken);
    if (cached) return cached;

    const dateFilter = dateRange
        ? `AND segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'`
        : `AND segments.date DURING LAST_30_DAYS`;

    const query = `
        SELECT
            campaign.id,
            geographic_view.country_criterion_id,
            geographic_view.location_type,
            metrics.cost_micros,
            metrics.impressions,
            metrics.clicks,
            metrics.conversions
        FROM geographic_view
        WHERE campaign.status != 'REMOVED'
        ${dateFilter}
    `;

    let results;
    try {
        results = await gaqlQuery(accessToken, customerId, query, loginCustomerId);
    } catch {
        // Geographic view may not be available for all campaign types
        setCache(cacheKey, [], accessToken);
        return [];
    }

    const result = results.map(row => {
        const m = row.metrics;
        const geo = row.geographicView || {};
        return {
            campaign_id: row.campaign?.id || '',
            region: geo.countryCriterionId || 'Sin region',
            spend: micros(m.costMicros),
            impressions: parseInt(m.impressions || 0),
            clicks: parseInt(m.clicks || 0),
            reach: 0, // Google Ads doesn't have reach in the same way as Meta
        };
    });

    setCache(cacheKey, result, accessToken);
    return result;
}

/**
 * Build the OAuth2 consent URL.
 */
export function getGoogleOAuthUrl(state) {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_ADS_REDIRECT_URI,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/adwords openid email',
        access_type: 'offline',
        prompt: 'consent',
        state: state || '',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}
