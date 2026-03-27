'use server';

import { createClient } from '../_lib/supabase-server';

export async function addSale(adId, adName, amount, currency, note) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { data, error } = await supabase
        .from('sales_log')
        .insert({
            user_id: user.id,
            ad_id: adId,
            ad_name: adName || adId,
            amount: parseFloat(amount),
            currency: currency || 'USD',
            note: note || null,
        })
        .select()
        .single();

    if (error) return { error: error.message };
    return { ok: true, sale: data };
}

export async function deleteSale(saleId) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { error } = await supabase
        .from('sales_log')
        .delete()
        .eq('id', saleId)
        .eq('user_id', user.id); // RLS + explicit check

    if (error) return { error: error.message };
    return { ok: true };
}

export async function getSales() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { data, error } = await supabase
        .from('sales_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) return { error: error.message };
    return { ok: true, sales: data || [] };
}
