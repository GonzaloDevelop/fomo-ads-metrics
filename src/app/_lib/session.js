/**
 * Session helper — get authenticated user + role + Meta connection.
 */

import { createClient } from './supabase-server';
import { decrypt } from './encryption';

/**
 * Get the current session. Returns null if not authenticated.
 */
export async function getSession() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return null;

        // Fetch profile (RLS: user can read own profile)
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('id, email, full_name, role, settings, can_use_alerts')
            .eq('id', user.id)
            .maybeSingle();

        // If profile doesn't exist yet (trigger may not have fired), create it
        if (!profile && !profileError) {
            const ownerEmail = process.env.OWNER_EMAIL || '';
            const role = ownerEmail && user.email === ownerEmail ? 'owner' : 'pending';
            const { data: newProfile } = await supabase
                .from('user_profiles')
                .insert({
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || '',
                    role,
                })
                .select('id, email, full_name, role, settings, can_use_alerts')
                .single();

            if (!newProfile) return null;

            return { user, profile: newProfile, metaConnection: null };
        }

        if (!profile) return null;

        // Fetch Meta connection
        const { data: conn } = await supabase
            .from('meta_connections')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        let metaConnection = null;
        if (conn) {
            const token = decrypt(conn.encrypted_token);
            const isExpired = conn.token_expires_at && new Date(conn.token_expires_at) < new Date();
            metaConnection = {
                token: isExpired ? null : token,
                isExpired,
                business_id: conn.business_id,
                selected_account_id: conn.selected_account_id,
                selected_account_name: conn.selected_account_name,
                selected_account_currency: conn.selected_account_currency || 'USD',
                token_connected_at: conn.token_connected_at,
                token_expires_at: conn.token_expires_at,
            };
        }

        // Fetch Google connection
        const { data: gConn } = await supabase
            .from('google_connections')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        let googleConnection = null;
        if (gConn) {
            googleConnection = {
                connected: !!gConn.encrypted_refresh_token,
                selected_customer_id: gConn.selected_customer_id,
                selected_customer_name: gConn.selected_customer_name,
                selected_customer_currency: gConn.selected_customer_currency || 'USD',
                login_customer_id: gConn.login_customer_id,
                google_email: gConn.google_email,
                token_connected_at: gConn.token_connected_at,
            };
        }

        return { user, profile, metaConnection, googleConnection };
    } catch (err) {
        console.error('[session] Error:', err.message);
        return null;
    }
}

export function isApproved(profile) {
    return profile?.role === 'owner' || profile?.role === 'approved';
}

export function isOwner(profile) {
    return profile?.role === 'owner';
}
