'use client';

import { useState, useEffect, useTransition } from 'react';
import { cn } from '@/lib/utils';
import {
    ArrowRight, Building2, Loader2,
    Search, RefreshCw,
} from 'lucide-react';

/**
 * Google Ads connect flow:
 * Step 1: Click "Conectar con Google" → redirects to Google OAuth
 * Step 2: After OAuth callback, pick a customer account from the list
 *
 * If already connected (isConnected=true), auto-fetches accounts on mount.
 */
export default function GoogleConnectForm({ onAuthUrl, onSelectAccount, onFetchAccounts, accounts: initialAccounts, isConnected }) {
    const [isPending, startTransition] = useTransition();
    const [accounts, setAccounts] = useState(initialAccounts || []);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Auto-fetch accounts when already connected but no accounts loaded yet
    useEffect(() => {
        if (isConnected && accounts.length === 0 && onFetchAccounts) {
            setLoading(true);
            setError('');
            onFetchAccounts().then(result => {
                setLoading(false);
                if (result.ok && result.accounts) {
                    setAccounts(result.accounts);
                } else if (result.error) {
                    setError(result.error);
                }
            }).catch(err => {
                setLoading(false);
                setError(err.message || 'Error al buscar cuentas');
            });
        }
    }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleGoogleAuth = () => {
        startTransition(async () => {
            const result = await onAuthUrl();
            if (result?.url) {
                window.location.href = result.url;
            }
        });
    };

    const handleSelectAccount = (customerId) => {
        startTransition(async () => {
            await onSelectAccount(customerId);
        });
    };

    const handleRetryFetch = () => {
        if (!onFetchAccounts) return;
        setLoading(true);
        setError('');
        onFetchAccounts().then(result => {
            setLoading(false);
            if (result.ok && result.accounts) {
                setAccounts(result.accounts);
            } else if (result.error) {
                setError(result.error);
            }
        }).catch(err => {
            setLoading(false);
            setError(err.message || 'Error al buscar cuentas');
        });
    };

    const filteredAccounts = accounts.filter(a =>
        !search ||
        a.descriptiveName?.toLowerCase().includes(search.toLowerCase()) ||
        a.customerId?.includes(search)
    );

    const sortedAccounts = [...filteredAccounts].sort((a, b) =>
        a.descriptiveName.localeCompare(b.descriptiveName)
    );

    // Step 1: OAuth button (not connected yet)
    if (!isConnected) {
        return (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
                <div className="flex border-b border-[var(--border-primary)]">
                    <div className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-[var(--accent-primary)] text-white">1</span>
                        Conectar Google
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium text-[var(--text-tertiary)]">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-[var(--bg-elevated)] text-[var(--text-tertiary)]">2</span>
                        Elegir cuenta
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-[var(--text-secondary)]">
                        Inicia sesion con tu cuenta de Google para acceder a tus datos de Google Ads.
                    </p>
                    <button
                        onClick={handleGoogleAuth}
                        disabled={isPending}
                        className="w-full flex items-center justify-center gap-3 h-11 rounded-lg bg-white text-[#1f1f1f] font-medium text-sm border border-[#dadce0] hover:bg-[#f8f9fa] disabled:opacity-50 cursor-pointer transition-all"
                    >
                        {isPending ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                <svg width="18" height="18" viewBox="0 0 48 48">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                                </svg>
                                Conectar con Google
                            </>
                        )}
                    </button>
                    <p className="text-xs text-[var(--text-tertiary)] text-center">
                        Se pedira permiso para leer datos de Google Ads (solo lectura).
                    </p>
                </div>
            </div>
        );
    }

    // Step 2: Loading accounts
    if (loading) {
        return (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
                <div className="flex border-b border-[var(--border-primary)]">
                    <div className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium text-[var(--text-tertiary)]">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-[var(--accent-primary)] text-white">✓</span>
                        Conectar Google
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-[var(--accent-primary)] text-white">2</span>
                        Elegir cuenta
                    </div>
                </div>
                <div className="p-6 flex items-center justify-center py-12">
                    <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-sm">Buscando cuentas de Google Ads...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Step 2: Error fetching accounts
    if (error) {
        return (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
                <div className="flex border-b border-[var(--border-primary)]">
                    <div className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium text-[var(--text-tertiary)]">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-[var(--accent-primary)] text-white">✓</span>
                        Conectar Google
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-[var(--accent-primary)] text-white">2</span>
                        Elegir cuenta
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    <div className="p-3 rounded-lg bg-[var(--danger-bg)] border border-[var(--danger)]/20">
                        <p className="text-xs text-[var(--danger)]">{error}</p>
                    </div>
                    <button
                        onClick={handleRetryFetch}
                        className="w-full flex items-center justify-center gap-2 h-10 rounded-lg border border-[var(--border-secondary)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-hover)] cursor-pointer transition-all"
                    >
                        <RefreshCw size={14} />
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    // Step 2: Account picker
    return (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
            <div className="flex border-b border-[var(--border-primary)]">
                <div className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium text-[var(--text-tertiary)]">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-[var(--accent-primary)] text-white">✓</span>
                    Conectar Google
                </div>
                <div className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-[var(--accent-primary)] text-white">2</span>
                    Elegir cuenta
                </div>
            </div>
            <div className="p-6 space-y-4">
                <div>
                    <p className="text-sm text-[var(--text-secondary)] mb-3">
                        Se encontraron <span className="font-semibold text-[var(--text-primary)]">{accounts.length}</span> cuentas de Google Ads.
                        Selecciona una:
                    </p>
                    {accounts.length > 3 && (
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar cuenta..."
                                className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]"
                            />
                        </div>
                    )}
                </div>

                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                    {sortedAccounts.map(account => (
                        <button
                            key={account.customerId}
                            onClick={() => handleSelectAccount(account.customerId)}
                            disabled={isPending}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-all text-left group disabled:opacity-50"
                        >
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-muted)] group-hover:text-[var(--accent-primary)]">
                                <Building2 size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                    {account.descriptiveName}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-[var(--text-tertiary)]">{account.customerId}</span>
                                    <span className="text-xs text-[var(--text-tertiary)]">-</span>
                                    <span className="text-xs text-[var(--text-tertiary)]">{account.currencyCode}</span>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] flex-shrink-0" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
