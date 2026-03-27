'use server';

import { createClient, createServiceClient } from '../_lib/supabase-server';
import { redirect } from 'next/navigation';

export async function signUp(formData) {
    const email = formData.get('email');
    const password = formData.get('password');
    const fullName = formData.get('fullName');

    if (!email || !password) return { error: 'Email y contraseña son requeridos' };
    if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres' };

    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName || '' },
        },
    });

    if (error) {
        if (error.message.includes('already registered')) {
            return { error: 'Este email ya esta registrado. Intenta iniciar sesion.' };
        }
        return { error: error.message };
    }

    return { ok: true, message: 'Cuenta creada. Espera la aprobacion del administrador para acceder.' };
}

export async function signIn(formData) {
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) return { error: 'Email y contraseña son requeridos' };

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        if (error.message.includes('Invalid login')) {
            return { error: 'Email o contraseña incorrectos' };
        }
        return { error: error.message };
    }

    return { ok: true };
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: 'local' }); // only this browser, not all devices
    redirect('/login');
}

/**
 * Owner action: approve a pending user.
 */
export async function approveUser(userId) {
    const supabase = await createClient();

    // Verify caller is owner
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { data: callerProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (callerProfile?.role !== 'owner') return { error: 'Sin permisos' };

    const { error } = await supabase
        .from('user_profiles')
        .update({ role: 'approved' })
        .eq('id', userId);

    if (error) return { error: error.message };

    // Auto-confirm email using service role (admin API)
    const serviceClient = createServiceClient();
    await serviceClient.auth.admin.updateUserById(userId, {
        email_confirm: true,
    });

    return { ok: true };
}

/**
 * Owner action: reject a pending user.
 */
export async function rejectUser(userId) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { data: callerProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (callerProfile?.role !== 'owner') return { error: 'Sin permisos' };

    const { error } = await supabase
        .from('user_profiles')
        .update({ role: 'rejected' })
        .eq('id', userId);

    if (error) return { error: error.message };
    return { ok: true };
}

/**
 * Owner action: delete a user completely (auth + profile + meta connection).
 */
export async function deleteUser(userId) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { data: callerProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (callerProfile?.role !== 'owner') return { error: 'Sin permisos' };

    // Can't delete yourself
    if (userId === user.id) return { error: 'No podes eliminarte a vos mismo' };

    // Delete from auth (cascades to user_profiles and meta_connections)
    const serviceClient = createServiceClient();
    const { error } = await serviceClient.auth.admin.deleteUser(userId);

    if (error) return { error: error.message };
    return { ok: true };
}

/**
 * Owner action: toggle alerts permission for a user.
 */
export async function toggleUserAlerts(userId, canUseAlerts) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { data: callerProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (callerProfile?.role !== 'owner') return { error: 'Sin permisos' };

    const { error } = await supabase
        .from('user_profiles')
        .update({ can_use_alerts: canUseAlerts })
        .eq('id', userId);

    if (error) return { error: error.message };
    return { ok: true };
}
