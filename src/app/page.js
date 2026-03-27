import { getSession, isApproved, isOwner } from './_lib/session';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
    const session = await getSession();

    // Not logged in → login page
    if (!session) redirect('/login');

    // Pending/rejected → show status
    if (!isApproved(session.profile)) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
                <div className="text-center max-w-sm">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--warning-bg)] text-[var(--warning)] mb-4">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)]">
                        {session.profile.role === 'rejected' ? 'Acceso denegado' : 'Cuenta pendiente de aprobacion'}
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">
                        {session.profile.role === 'rejected'
                            ? 'Tu cuenta fue rechazada por el administrador.'
                            : 'Tu cuenta esta pendiente de aprobacion. El administrador revisara tu solicitud.'}
                    </p>
                    <form action={async () => { 'use server'; const { createClient } = await import('./_lib/supabase-server'); const supabase = await createClient(); await supabase.auth.signOut(); redirect('/login'); }}>
                        <button type="submit" className="mt-4 px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-secondary)] cursor-pointer">
                            Cerrar sesion
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Build connection info for client
    const mc = session.metaConnection;
    const metaConnection = mc ? {
        connected: !mc.isExpired && !!mc.token,
        tokenExpired: mc.isExpired,
        selected_account_id: mc.selected_account_id,
        selected_account_name: mc.selected_account_name,
        selected_account_currency: mc.selected_account_currency,
    } : null;

    const gc = session.googleConnection;
    const googleConnection = gc ? {
        connected: gc.connected,
        selected_customer_id: gc.selected_customer_id,
        selected_customer_name: gc.selected_customer_name,
        selected_customer_currency: gc.selected_customer_currency,
        google_email: gc.google_email,
    } : null;

    return (
        <DashboardClient
            connection={metaConnection}
            googleConnection={googleConnection}
            initialData={null}
            isOwner={isOwner(session.profile)}
            userName={session.profile.full_name || session.profile.email}
            userSettings={session.profile.settings || {}}
        />
    );
}
