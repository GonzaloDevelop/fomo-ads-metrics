'use server';

import { createClient } from '../_lib/supabase-server';
import { encrypt, decrypt } from '../_lib/encryption';
import {
    fetchMetaCampaigns, fetchMetaAdSets, fetchMetaAds,
    fetchMetaInsights, fetchMetaInsightsByRegion,
    fetchMetaInsightsByAge, fetchMetaInsightsByPlatform,
    fetchMyAdAccounts, fetchBusinessAdAccounts, clearCache,
} from '../_lib/metaApi';
import { computeDateRange } from '../_lib/dateUtils';

/**
 * Get the current user's Meta token from DB (decrypted).
 */
async function getUserMetaToken() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { data: conn } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (!conn) return { error: 'No conectado a Meta. Conecta tu token.' };

    const token = decrypt(conn.encrypted_token);
    if (!token) return { error: 'Error al desencriptar el token. Vuelve a conectar.' };

    // Check expiry
    if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
        return { error: 'TOKEN_EXPIRED', expired: true };
    }

    return {
        token,
        accountId: conn.selected_account_id,
        businessId: conn.business_id,
        userId: user.id,
    };
}

/**
 * Connect Meta: save encrypted token + fetch account list.
 */
export async function connectWithToken(rawToken, businessId, tokenExpiresInHours) {
    if (!rawToken) return { error: 'Token es requerido' };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    try {
        let accounts;
        if (businessId) {
            accounts = await fetchBusinessAdAccounts(rawToken, businessId);
        } else {
            accounts = await fetchMyAdAccounts(rawToken);
        }

        if (!accounts.length) {
            return { error: 'No se encontraron cuentas publicitarias. Verifica permisos (ads_read).' };
        }

        // Encrypt token before storing
        const encryptedToken = encrypt(rawToken);

        // Calculate expiry (Graph Explorer tokens ~ 1-2 hours)
        const expiresAt = tokenExpiresInHours
            ? new Date(Date.now() + tokenExpiresInHours * 3600000).toISOString()
            : null; // null = permanent (System User Token)

        // Upsert connection
        const { error } = await supabase
            .from('meta_connections')
            .upsert({
                user_id: user.id,
                encrypted_token: encryptedToken,
                business_id: businessId || null,
                selected_account_id: null,
                selected_account_name: null,
                selected_account_currency: null,
                token_connected_at: new Date().toISOString(),
                token_expires_at: expiresAt,
            }, { onConflict: 'user_id' });

        if (error) return { error: `Error al guardar: ${error.message}` };

        return { ok: true, accounts };
    } catch (err) {
        const msg = err.message || '';
        if (msg.includes('Invalid OAuth') || msg.includes('expired')) {
            return { error: 'Token invalido o expirado.' };
        }
        return { error: msg };
    }
}

/**
 * Re-fetch account list from Meta API.
 */
export async function fetchAccountList() {
    const result = await getUserMetaToken();
    if (result.error) return result;

    try {
        let accounts;
        if (result.businessId) {
            accounts = await fetchBusinessAdAccounts(result.token, result.businessId);
        } else {
            accounts = await fetchMyAdAccounts(result.token);
        }
        return { ok: true, accounts };
    } catch (err) {
        return { error: err.message };
    }
}

/**
 * Select ad account — save to DB.
 */
export async function selectAdAccount(accountId, accountName, accountCurrency) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { error } = await supabase
        .from('meta_connections')
        .update({
            selected_account_id: accountId,
            selected_account_name: accountName || accountId,
            selected_account_currency: accountCurrency || 'USD',
        })
        .eq('user_id', user.id);

    if (error) return { error: error.message };
    return { ok: true };
}

/**
 * Disconnect — delete Meta connection from DB.
 */
export async function disconnectMeta() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    await supabase
        .from('meta_connections')
        .delete()
        .eq('user_id', user.id);

    clearCache();
    return { ok: true };
}

/**
 * Fetch metrics data.
 */
export async function getMetaData(preset, customFrom, customTo) {
    const result = await getUserMetaToken();
    if (result.error === 'TOKEN_EXPIRED') {
        return { error: 'Tu token de Meta expiro. Conecta uno nuevo.', tokenExpired: true };
    }
    if (result.error) return result;

    const { token, accountId } = result;
    if (!accountId) return { error: 'No hay cuenta seleccionada' };

    const range = computeDateRange(preset || '30d', customFrom, customTo);
    const dateRange = { since: range.from, until: range.to };

    const fromMs = new Date(range.from + 'T12:00:00').getTime();
    const days = range.days;
    const prevTo = new Date(fromMs - 864e5);
    const prevFrom = new Date(fromMs - days * 864e5);
    const prevDateRange = { since: prevFrom.toISOString().split('T')[0], until: prevTo.toISOString().split('T')[0] };

    try {
        const campaigns = await fetchMetaCampaigns(token, accountId, dateRange);
        const insights = await fetchMetaInsights(token, accountId, dateRange);

        let previousInsights = [];
        try { previousInsights = await fetchMetaInsights(token, accountId, prevDateRange); } catch {}

        let adSets = [];
        let ads = [];
        let regionInsights = [];
        let ageInsights = [];
        let platformInsights = [];
        try { adSets = await fetchMetaAdSets(token, accountId, dateRange); } catch {}
        try { ads = await fetchMetaAds(token, accountId, dateRange); } catch {}
        try { regionInsights = await fetchMetaInsightsByRegion(token, accountId, dateRange); } catch {}
        try { ageInsights = await fetchMetaInsightsByAge(token, accountId, dateRange); } catch {}
        try { platformInsights = await fetchMetaInsightsByPlatform(token, accountId, dateRange); } catch {}

        return {
            campaigns, adSets, ads, insights, previousInsights, regionInsights, ageInsights, platformInsights,
            dateRange: range,
            prevDateRange: { from: prevDateRange.since, to: prevDateRange.until, days },
        };
    } catch (err) {
        const msg = err.message || '';
        if (msg.includes('Invalid OAuth') || msg.includes('expired') || msg.includes('code 190')) {
            // Token expired mid-request
            return { error: 'Tu token de Meta expiro. Conecta uno nuevo.', tokenExpired: true };
        }
        if (msg.includes('temporarily unavailable')) return { error: 'Meta temporalmente no disponible.' };
        if (msg.includes('request limit')) return { error: 'Limite de llamadas alcanzado. Espera unos minutos.' };
        return { error: msg };
    }
}
