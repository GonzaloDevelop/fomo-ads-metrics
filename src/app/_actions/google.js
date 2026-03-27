'use server';

import { createClient } from '../_lib/supabase-server';
import { encrypt, decrypt } from '../_lib/encryption';
import {
    refreshAccessToken, fetchAccessibleCustomers,
    fetchGoogleCampaigns, fetchGoogleAdGroups, fetchGoogleAds,
    fetchGoogleInsights, fetchGoogleInsightsByRegion,
    clearGoogleCache, getGoogleOAuthUrl,
} from '../_lib/googleAdsApi';
import { computeDateRange } from '../_lib/dateUtils';

/**
 * Get the current user's Google refresh token from DB (decrypted) + fresh access token.
 */
async function getUserGoogleToken() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { data: conn } = await supabase
        .from('google_connections')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (!conn) return { error: 'No conectado a Google Ads. Conecta tu cuenta.' };

    const refreshToken = decrypt(conn.encrypted_refresh_token);
    if (!refreshToken) return { error: 'Error al desencriptar el token. Vuelve a conectar.' };

    // Get fresh access token
    let accessToken;
    try {
        accessToken = await refreshAccessToken(refreshToken);
    } catch (err) {
        if (err.message.includes('invalid_grant') || err.message.includes('Token has been expired')) {
            return { error: 'GOOGLE_TOKEN_EXPIRED', expired: true };
        }
        return { error: `Error al renovar token: ${err.message}` };
    }

    return {
        accessToken,
        refreshToken,
        customerId: conn.selected_customer_id,
        loginCustomerId: conn.login_customer_id,
        userId: user.id,
    };
}

/**
 * Get the Google OAuth consent URL.
 */
export async function getGoogleAuthUrl() {
    return { url: getGoogleOAuthUrl() };
}

/**
 * Fetch the list of Google Ads accounts accessible by the user.
 */
export async function fetchGoogleAccountList() {
    const result = await getUserGoogleToken();
    if (result.error) return result;

    try {
        const accounts = await fetchAccessibleCustomers(result.accessToken);
        // Filter out manager accounts — users should only select client accounts
        const clientAccounts = accounts.filter(a => !a.manager);
        return { ok: true, accounts: clientAccounts };
    } catch (err) {
        return { error: err.message };
    }
}

/**
 * Select a Google Ads customer account.
 */
export async function selectGoogleAccount(customerId, customerName, customerCurrency) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { error } = await supabase
        .from('google_connections')
        .update({
            selected_customer_id: customerId,
            selected_customer_name: customerName || customerId,
            selected_customer_currency: customerCurrency || 'USD',
        })
        .eq('user_id', user.id);

    if (error) return { error: error.message };
    return { ok: true };
}

/**
 * Disconnect Google Ads.
 */
export async function disconnectGoogle() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    await supabase
        .from('google_connections')
        .delete()
        .eq('user_id', user.id);

    clearGoogleCache();
    return { ok: true };
}

/**
 * Fetch Google Ads data (campaigns, ad groups, ads, insights).
 */
export async function getGoogleData(preset, customFrom, customTo) {
    const result = await getUserGoogleToken();
    if (result.error === 'GOOGLE_TOKEN_EXPIRED') {
        return { error: 'Tu sesion de Google expiro. Vuelve a conectar.', tokenExpired: true };
    }
    if (result.error) return result;

    const { accessToken, customerId, loginCustomerId } = result;
    if (!customerId) return { error: 'No hay cuenta seleccionada' };

    const range = computeDateRange(preset || '30d', customFrom, customTo);
    const dateRange = { since: range.from, until: range.to };

    const fromMs = new Date(range.from + 'T12:00:00').getTime();
    const days = range.days;
    const prevTo = new Date(fromMs - 864e5);
    const prevFrom = new Date(fromMs - days * 864e5);
    const prevDateRange = { since: prevFrom.toISOString().split('T')[0], until: prevTo.toISOString().split('T')[0] };

    try {
        const campaigns = await fetchGoogleCampaigns(accessToken, customerId, dateRange, loginCustomerId);
        const insights = await fetchGoogleInsights(accessToken, customerId, dateRange, loginCustomerId);

        let previousInsights = [];
        try { previousInsights = await fetchGoogleInsights(accessToken, customerId, prevDateRange, loginCustomerId); } catch {}

        let adSets = []; // adGroups mapped to adSets for component compatibility
        let ads = [];
        let regionInsights = [];
        try { adSets = await fetchGoogleAdGroups(accessToken, customerId, dateRange, loginCustomerId); } catch {}
        try { ads = await fetchGoogleAds(accessToken, customerId, dateRange, loginCustomerId); } catch {}
        try { regionInsights = await fetchGoogleInsightsByRegion(accessToken, customerId, dateRange, loginCustomerId); } catch {}

        return {
            campaigns, adSets, ads, insights, previousInsights, regionInsights,
            dateRange: range,
            prevDateRange: { from: prevDateRange.since, to: prevDateRange.until, days },
        };
    } catch (err) {
        const msg = err.message || '';
        if (msg === 'GOOGLE_TOKEN_EXPIRED' || msg.includes('invalid_grant')) {
            return { error: 'Tu sesion de Google expiro. Vuelve a conectar.', tokenExpired: true };
        }
        return { error: msg };
    }
}
