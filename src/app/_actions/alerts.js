'use server';

import { createClient } from '../_lib/supabase-server';

export async function getAlerts() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) return { error: error.message };
    return { ok: true, alerts: data || [] };
}

export async function createAlert({ accountId, accountName, metricKey, metricLabel, operator, threshold, alertEmail }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    if (!accountId || !metricKey || !operator || !threshold || !alertEmail) {
        return { error: 'Todos los campos son requeridos' };
    }

    const { data, error } = await supabase
        .from('alerts')
        .insert({
            user_id: user.id,
            account_id: accountId,
            account_name: accountName || accountId,
            metric_key: metricKey,
            metric_label: metricLabel || metricKey,
            operator,
            threshold: parseFloat(threshold),
            alert_email: alertEmail,
        })
        .select()
        .single();

    if (error) return { error: error.message };
    return { ok: true, alert: data };
}

export async function deleteAlert(alertId) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', alertId)
        .eq('user_id', user.id);

    if (error) return { error: error.message };
    return { ok: true };
}

export async function toggleAlert(alertId, isActive) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { error } = await supabase
        .from('alerts')
        .update({ is_active: isActive })
        .eq('id', alertId)
        .eq('user_id', user.id);

    if (error) return { error: error.message };
    return { ok: true };
}
