'use client';

import { useState, useTransition, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, Building2, Loader2, Search, DollarSign } from 'lucide-react';

const FB_APP_ID = '1222509509662850';
const FB_API_VERSION = 'v21.0';

const STATUS_LABELS = {
    1: { label: 'Activa', className: 'bg-[var(--success-bg)] text-[var(--success)]' },
    2: { label: 'Deshabilitada', className: 'bg-[var(--danger-bg)] text-[var(--danger)]' },
    3: { label: 'Sin configurar', className: 'bg-[var(--warning-bg)] text-[var(--warning)]' },
    7: { label: 'Pendiente', className: 'bg-[var(--warning-bg)] text-[var(--warning)]' },
    100: { label: 'Cerrada', className: 'bg-[var(--danger-bg)] text-[var(--danger)]' },
};

/**
 * Connect flow:
 * Step 1: "Continuar con Facebook" button → FB OAuth popup → get token
 * Step 2: Pick a Business Portfolio
 * Step 3: Pick an Ad Account from that portfolio
 */
export default function ConnectForm({ onFetchBusinesses, onConnect, onSelectAccount }) {
    const [isPending, startTransition] = useTransition();
    const [sdkReady, setSdkReady] = useState(false);
    const [step, setStep] = useState(1);
    const [fbToken, setFbToken] = useState('');
    const [businesses, setBusinesses] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');

    // Load Facebook JS SDK
    useEffect(() => {
        if (window.FB) {
            setSdkReady(true);
            return;
        }
        if (document.getElementById('facebook-jssdk')) return;

        window.fbAsyncInit = function () {
            window.FB.init({
                appId: FB_APP_ID,
                cookie: true,
                xfbml: false,
                version: FB_API_VERSION,
            });
            setSdkReady(true);

            // If already authenticated, skip straight to portfolio picker
            window.FB.getLoginStatus(function (response) {
                if (response.status === 'connected' && response.authResponse?.accessToken) {
                    loadBusinesses(response.authResponse.accessToken);
                }
            });
        };

        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/es_LA/sdk.js';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
    }, []);

    function handleFBLogin() {
        if (!window.FB) return;
        setError('');
        window.FB.login(
            function (response) {
                if (response.authResponse?.accessToken) {
                    loadBusinesses(response.authResponse.accessToken);
                } else {
                    setError('Inicio de sesión cancelado o no autorizado.');
                }
            },
            { scope: 'ads_read,business_management' }
        );
    }

    function loadBusinesses(token) {
        setError('');
        setFbToken(token);
        startTransition(async () => {
            const result = await onFetchBusinesses(token);
            if (result.error) { setError(result.error); return; }
            if (!result.businesses?.length) {
                setError('No se encontraron portfolios comerciales asociados a esta cuenta de Facebook.');
                return;
            }
            setBusinesses(result.businesses);
            setStep(2);
        });
    }

    function handleSelectBusiness(businessId) {
        setError('');
        setSearch('');
        startTransition(async () => {
            const result = await onConnect(fbToken, businessId);
            if (result.error) { setError(result.error); return; }
            setAccounts(result.accounts || []);
            setStep(3);
        });
    }

    function handleSelectAccount(accountId) {
        startTransition(async () => {
            await onSelectAccount(accountId);
        });
    }

    const filteredAccounts = accounts.filter(a =>
        !search ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.id.includes(search)
    );
    const sortedAccounts = [...filteredAccounts].sort((a, b) => {
        if (a.account_status !== b.account_status) return a.account_status - b.account_status;
        return a.name.localeCompare(b.name);
    });

    const STEPS = ['Cuenta Facebook', 'Portfolio comercial', 'Cuenta publicitaria'];

    return (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>

            {/* Step indicator */}
            <div className="flex border-b border-[var(--border-primary)]">
                {STEPS.map((label, i) => {
                    const n = i + 1;
                    const active = step === n;
                    const done = step > n;
                    return (
                        <div key={n} className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium',
                            active ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'
                        )}>
                            <span className={cn(
                                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                                done ? 'bg-[var(--success)] text-white' :
                                active ? 'bg-[var(--accent-primary)] text-white' :
                                'bg-[var(--bg-elevated)] text-[var(--text-tertiary)]'
                            )}>
                                {done ? '✓' : n}
                            </span>
                            <span className="hidden sm:inline">{label}</span>
                        </div>
                    );
                })}
            </div>

            <div className="p-6">

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-[var(--danger-bg)] border border-[var(--danger)]/20">
                        <p className="text-xs text-[var(--danger)]">{error}</p>
                    </div>
                )}

                {/* ── Step 1: Facebook Login ── */}
                {step === 1 && (
                    <div className="flex flex-col items-center gap-5 py-2">
                        <div className="text-center">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Conectá tu cuenta de Facebook</p>
                            <p className="text-xs text-[var(--text-tertiary)] mt-1.5 max-w-xs">
                                Se te pedirá permiso para acceder a tus portfolios comerciales y cuentas publicitarias.
                            </p>
                        </div>

                        <button
                            onClick={handleFBLogin}
                            disabled={isPending || !sdkReady}
                            className="flex items-center gap-3 px-5 py-3 rounded-xl font-semibold text-sm text-white cursor-pointer disabled:opacity-50 transition-opacity hover:opacity-90"
                            style={{ background: '#1877F2' }}
                        >
                            {isPending ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                            )}
                            {isPending ? 'Cargando portfolios...' : !sdkReady ? 'Inicializando...' : 'Continuar con Facebook'}
                        </button>

                        {!sdkReady && (
                            <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                                <Loader2 size={11} className="animate-spin" />
                                Cargando SDK de Facebook...
                            </p>
                        )}
                    </div>
                )}

                {/* ── Step 2: Pick business portfolio ── */}
                {step === 2 && (
                    <div className="space-y-4">
                        <p className="text-sm text-[var(--text-secondary)]">
                            Se encontraron{' '}
                            <span className="font-semibold text-[var(--text-primary)]">{businesses.length}</span>{' '}
                            portfolio{businesses.length !== 1 ? 's' : ''} comercial{businesses.length !== 1 ? 'es' : ''}.
                            Seleccioná uno:
                        </p>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {businesses.map(biz => (
                                <button
                                    key={biz.id}
                                    onClick={() => handleSelectBusiness(biz.id)}
                                    disabled={isPending}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-all text-left group disabled:opacity-50"
                                >
                                    {biz.picture ? (
                                        <img src={biz.picture} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-muted)] group-hover:text-[var(--accent-primary)] flex-shrink-0">
                                            <Building2 size={18} />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{biz.name}</p>
                                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">ID: {biz.id}</p>
                                    </div>
                                    {isPending ? (
                                        <Loader2 size={16} className="text-[var(--text-tertiary)] animate-spin flex-shrink-0" />
                                    ) : (
                                        <ArrowRight size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => { setStep(1); setError(''); setBusinesses([]); setFbToken(''); }}
                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                        >
                            ← Volver
                        </button>
                    </div>
                )}

                {/* ── Step 3: Pick ad account ── */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)] mb-3">
                                Se encontraron{' '}
                                <span className="font-semibold text-[var(--text-primary)]">{accounts.length}</span>{' '}
                                cuenta{accounts.length !== 1 ? 's' : ''} publicitaria{accounts.length !== 1 ? 's' : ''}.
                                Seleccioná una:
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
                                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-muted)] group-hover:text-[var(--accent-primary)] flex-shrink-0">
                                            <Building2 size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{account.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span className="text-xs text-[var(--text-tertiary)]">{account.id}</span>
                                                <span className="text-xs text-[var(--text-tertiary)]">·</span>
                                                <span className="text-xs text-[var(--text-tertiary)]">{account.currency}</span>
                                                <span className="text-xs text-[var(--text-tertiary)]">·</span>
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
                            onClick={() => { setStep(2); setError(''); setSearch(''); }}
                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                        >
                            ← Volver
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
