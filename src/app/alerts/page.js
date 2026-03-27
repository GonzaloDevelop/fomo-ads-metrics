import { getSession, isApproved } from '../_lib/session';
import { redirect } from 'next/navigation';
import AlertsClient from './AlertsClient';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
    const session = await getSession();
    if (!session) redirect('/login');
    if (!isApproved(session.profile)) redirect('/');

    // Check alerts permission
    if (!session.profile.can_use_alerts) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
                <div className="text-center max-w-sm">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--danger-bg)] text-[var(--danger)] mb-4">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                    </div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)]">Alertas no habilitadas</h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">
                        Tu cuenta no tiene acceso a alertas. Contacta al administrador para activarlas.
                    </p>
                    <a href="/" className="inline-block mt-4 px-4 py-2 rounded-lg text-sm text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] border border-[var(--accent-primary)]/30">
                        Volver al dashboard
                    </a>
                </div>
            </div>
        );
    }

    const mc = session.metaConnection;
    const hasToken = mc && !mc.isExpired && !!mc.token;

    return <AlertsClient hasToken={hasToken} userName={session.profile.full_name || session.profile.email} />;
}
