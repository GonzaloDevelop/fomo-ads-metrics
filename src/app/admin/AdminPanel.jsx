'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { approveUser, rejectUser, deleteUser, toggleUserAlerts, signOut } from '../_actions/auth';
import { cn } from '@/lib/utils';
import { BarChart3, Check, X, Shield, Clock, UserCheck, UserX, LogOut, ArrowLeft, Trash2, Bell, BellOff } from 'lucide-react';

const ROLE_CONFIG = {
    owner: { label: 'Owner', color: 'bg-purple-100 text-purple-700', icon: Shield },
    approved: { label: 'Aprobado', color: 'bg-[var(--success-bg)] text-[var(--success)]', icon: UserCheck },
    pending: { label: 'Pendiente', color: 'bg-[var(--warning-bg)] text-[var(--warning)]', icon: Clock },
    rejected: { label: 'Rechazado', color: 'bg-[var(--danger-bg)] text-[var(--danger)]', icon: UserX },
};

export default function AdminPanel({ users, currentUserId }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleApprove = (userId) => {
        startTransition(async () => {
            const result = await approveUser(userId);
            if (result.error) toast.error(result.error);
            else { toast.success('Usuario aprobado'); router.refresh(); }
        });
    };

    const handleReject = (userId) => {
        startTransition(async () => {
            const result = await rejectUser(userId);
            if (result.error) toast.error(result.error);
            else { toast.success('Usuario rechazado'); router.refresh(); }
        });
    };

    const handleToggleAlerts = (userId, current) => {
        startTransition(async () => {
            const result = await toggleUserAlerts(userId, !current);
            if (result.error) toast.error(result.error);
            else { toast.success(current ? 'Alertas desactivadas' : 'Alertas activadas'); router.refresh(); }
        });
    };

    const handleDelete = (userId, email) => {
        if (!confirm(`Eliminar a ${email}? Esta accion no se puede deshacer.`)) return;
        startTransition(async () => {
            const result = await deleteUser(userId);
            if (result.error) toast.error(result.error);
            else { toast.success('Usuario eliminado'); router.refresh(); }
        });
    };

    const pending = users.filter(u => u.role === 'pending');
    const others = users.filter(u => u.role !== 'pending');

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--border-primary)] px-4 sm:px-6 py-3">
                <div className="max-w-[800px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <a href="/" className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                            <ArrowLeft size={16} />
                            Dashboard
                        </a>
                        <span className="text-[var(--border-secondary)]">|</span>
                        <h1 className="text-base font-bold text-[var(--text-primary)]">Administracion de Usuarios</h1>
                    </div>
                    <button onClick={() => signOut()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-secondary)] cursor-pointer">
                        <LogOut size={14} />
                        Salir
                    </button>
                </div>
            </header>

            <main className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Pending users */}
                {pending.length > 0 && (
                    <section className="bg-[var(--bg-card)] rounded-xl border border-[var(--warning)]/30 p-4">
                        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                            <Clock size={16} className="text-[var(--warning)]" />
                            Pendientes de aprobacion ({pending.length})
                        </h2>
                        <div className="space-y-2">
                            {pending.map(user => (
                                <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-primary)]">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--text-primary)]">{user.full_name || 'Sin nombre'}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
                                        <p className="text-xs text-[var(--text-tertiary)]">
                                            Registrado: {new Date(user.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApprove(user.id)}
                                            disabled={isPending}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--success)] text-white text-xs font-medium hover:opacity-90 cursor-pointer disabled:opacity-50"
                                        >
                                            <Check size={14} />
                                            Aprobar
                                        </button>
                                        <button
                                            onClick={() => handleReject(user.id)}
                                            disabled={isPending}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--danger)] text-white text-xs font-medium hover:opacity-90 cursor-pointer disabled:opacity-50"
                                        >
                                            <X size={14} />
                                            Rechazar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* All users */}
                <section className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-4">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                        Todos los usuarios ({users.length})
                    </h2>
                    <div className="space-y-1.5">
                        {users.map(user => {
                            const config = ROLE_CONFIG[user.role] || ROLE_CONFIG.pending;
                            const Icon = config.icon;
                            const isMe = user.id === currentUserId;
                            return (
                                <div key={user.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-elevated)]">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                                {user.full_name || 'Sin nombre'}
                                                {isMe && <span className="text-xs text-[var(--text-tertiary)] ml-1">(vos)</span>}
                                            </p>
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
                                    </div>
                                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', config.color)}>
                                        <Icon size={12} />
                                        {config.label}
                                    </span>
                                    {!isMe && (
                                        <>
                                            <button
                                                onClick={() => handleToggleAlerts(user.id, user.can_use_alerts)}
                                                disabled={isPending}
                                                className={cn('p-1.5 rounded-lg cursor-pointer transition-all disabled:opacity-50',
                                                    user.can_use_alerts ? 'text-[var(--success)] hover:bg-[var(--success-bg)]' : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]'
                                                )}
                                                title={user.can_use_alerts ? 'Desactivar alertas' : 'Activar alertas'}
                                            >
                                                {user.can_use_alerts ? <Bell size={14} /> : <BellOff size={14} />}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id, user.email)}
                                                disabled={isPending}
                                                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] cursor-pointer transition-all disabled:opacity-50"
                                                title="Eliminar usuario"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>
        </div>
    );
}
