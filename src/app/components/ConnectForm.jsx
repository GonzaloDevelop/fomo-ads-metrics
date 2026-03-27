'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import {
    KeyRound, ArrowRight, Building2, Loader2,
    Search, DollarSign, ChevronDown,
} from 'lucide-react';

/**
 * Connect flow:
 * Step 1: Paste token (+ optional Business ID) → fetches ad accounts
 * Step 2: Pick an ad account from the list → enters dashboard
 */
export default function ConnectForm({ onConnect, onSelectAccount }) {
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);
    const [token, setToken] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [businessId, setBusinessId] = useState('');
    const [accounts, setAccounts] = useState([]);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');

    const handleStep1 = (e) => {
        e.preventDefault();
        setError('');
        startTransition(async () => {
            const result = await onConnect(token, businessId || null);
            if (result.error) {
                setError(result.error);
            } else {
                setAccounts(result.accounts);
                setStep(2);
            }
        });
    };

    const handleSelectAccount = (accountId) => {
        startTransition(async () => {
            await onSelectAccount(accountId);
        });
    };

    const filteredAccounts = accounts.filter(a =>
        !search ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.id.includes(search)
    );

    const sortedAccounts = [...filteredAccounts].sort((a, b) => {
        if (a.account_status !== b.account_status) return a.account_status - b.account_status;
        return a.name.localeCompare(b.name);
    });

    const STATUS_LABELS = {
        1: { label: 'Activa', className: 'bg-[var(--success-bg)] text-[var(--success)]' },
        2: { label: 'Deshabilitada', className: 'bg-[var(--danger-bg)] text-[var(--danger)]' },
        3: { label: 'Sin configurar', className: 'bg-[var(--warning-bg)] text-[var(--warning)]' },
        7: { label: 'Pendiente', className: 'bg-[var(--warning-bg)] text-[var(--warning)]' },
        100: { label: 'Cerrada', className: 'bg-[var(--danger-bg)] text-[var(--danger)]' },
    };

    return (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
            {/* Step indicator */}
            <div className="flex border-b border-[var(--border-primary)]">
                <div className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium',
                    step === 1 ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'
                )}>
                    <span className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                        step >= 1 ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)]'
                    )}>
                        {step > 1 ? '✓' : '1'}
                    </span>
                    Token
                </div>
                <div className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium',
                    step === 2 ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'
                )}>
                    <span className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                        step === 2 ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)]'
                    )}>
                        2
                    </span>
                    Elegir cuenta
                </div>
            </div>

            <div className="p-6">
                {/* Step 1: Token */}
                {step === 1 && (
                    <form onSubmit={handleStep1} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                                Access Token
                            </label>
                            <input
                                type="password"
                                autoComplete="off"
                                value={token}
                                onChange={e => setToken(e.target.value)}
                                placeholder="Pega tu token de Meta aqui"
                                required
                                className="w-full h-10 px-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]"
                            />
                            <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
                                Genera un token en{' '}
                                <a
                                    href="https://developers.facebook.com/tools/explorer/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[var(--accent-primary)] hover:underline"
                                >
                                    Graph API Explorer
                                </a>
                                {' '}con permiso <strong>ads_read</strong>. Dura ~1-2 horas.
                            </p>
                        </div>

                        {/* Advanced: Business ID (optional) */}
                        <div>
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] cursor-pointer transition-colors"
                            >
                                <ChevronDown size={12} className={cn('transition-transform', showAdvanced && 'rotate-180')} />
                                Opciones avanzadas (System User Token)
                            </button>

                            {showAdvanced && (
                                <div className="mt-3">
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                                        ID de Portfolio Comercial (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={businessId}
                                        onChange={e => setBusinessId(e.target.value)}
                                        placeholder="Ej: 123456789012345"
                                        className="w-full h-9 px-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]"
                                    />
                                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                                        Solo necesario con System User Token. Lo encontras en Business Manager &rarr; Configuracion &rarr; Info del negocio.
                                    </p>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-[var(--danger-bg)] border border-[var(--danger)]/20">
                                <p className="text-xs text-[var(--danger)]">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending || !token}
                            className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Buscando cuentas...
                                </>
                            ) : (
                                <>
                                    <KeyRound size={16} />
                                    Conectar
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Step 2: Account picker */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)] mb-3">
                                Se encontraron <span className="font-semibold text-[var(--text-primary)]">{accounts.length}</span> cuentas publicitarias.
                                Selecciona una:
                            </p>
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
                        </div>

                        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                            {sortedAccounts.map(account => {
                                const status = STATUS_LABELS[account.account_status] || { label: `Estado ${account.account_status}`, className: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]' };
                                const spentDisplay = account.amount_spent > 0
                                    ? `$${(account.amount_spent / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 })} gastado`
                                    : 'Sin gasto';

                                return (
                                    <button
                                        key={account.id}
                                        onClick={() => handleSelectAccount(account.id)}
                                        disabled={isPending}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-all text-left group disabled:opacity-50"
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-muted)] group-hover:text-[var(--accent-primary)]">
                                            <Building2 size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                                {account.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-[var(--text-tertiary)]">{account.id}</span>
                                                <span className="text-xs text-[var(--text-tertiary)]">-</span>
                                                <span className="text-xs text-[var(--text-tertiary)]">{account.currency}</span>
                                                <span className="text-xs text-[var(--text-tertiary)]">-</span>
                                                <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-0.5">
                                                    <DollarSign size={10} />
                                                    {spentDisplay}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap', status.className)}>
                                            {status.label}
                                        </span>
                                        <ArrowRight size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] flex-shrink-0" />
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => { setStep(1); setError(''); }}
                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                        >
                            &larr; Volver
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
