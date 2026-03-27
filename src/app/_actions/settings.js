'use server';

import { createClient } from '../_lib/supabase-server';

/**
 * Save a user setting (merges into settings JSONB).
 */
export async function saveSetting(key, value) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    // Read current settings
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('settings')
        .eq('id', user.id)
        .single();

    const settings = { ...(profile?.settings || {}), [key]: value };

    const { error } = await supabase
        .from('user_profiles')
        .update({ settings })
        .eq('id', user.id);

    if (error) return { error: error.message };
    return { ok: true };
}

/**
 * Save multiple settings at once.
 */
export async function saveSettings(updates) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('settings')
        .eq('id', user.id)
        .single();

    const settings = { ...(profile?.settings || {}), ...updates };

    const { error } = await supabase
        .from('user_profiles')
        .update({ settings })
        .eq('id', user.id);

    if (error) return { error: error.message };
    return { ok: true };
}
