'use client';

import { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getAlerts, createAlert, deleteAlert, toggleAlert } from '../_actions/alerts';
import { fetchAccountList } from '../_actions/meta';
import { METRIC_REGISTRY, getMetricsByCategory } from '../_lib/metrics';
import {
    Bell, Plus, Trash2, ArrowLeft, Search, ChevronDown,
    Mail, ToggleLeft, ToggleRight, AlertTriangle, Loader2,
} from 'lucide-react';

const OPERATORS = [
    { value: '>', label: 'Mayor a' },
    { value: '<', label: 'Menor a' },
    { value: '>=', label: 'Mayor o igual a' },
    { value: '<=', label: 'Menor o igual a' },
];

export default function AlertsClient({ hasToken, userName }) {
    const [alerts, setAlerts] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [isPending, startTransition] = useTransition();
    const [loaded, setLoaded] = useState(false);
    const [showCreate, setShowCreate] = useState(false);

    // Form state
    const [accountId, setAccountId] = useState('');
    const [metricKey, setMetricKey] = useState('cost_per_result');
    const [operator, setOperator] = useState('>');
    const [threshold, setThreshold] = useState('');
    const [alertEmail, setAlertEmail] = useState('');
    const [metricSearch, setMetricSearch] = useState('');
    const [showMetricPicker, setShowMetricPicker] = useState(false);

    useEffect(() => {
        Promise.all([
            getAlerts(),
            hasToken ? fetchAccountList() : Promise.resolve({ ok: false }),
        ]).then(([alertsRes, accountsRes]) => {
            if (alertsRes.ok) setAlerts(alertsRes.alerts);
            if (accountsRes.ok) setAccounts(accountsRes.accounts);
            setLoaded(true);
        });
    }, [hasToken]);

    const selectedAccount = accounts.find(a => a.id === accountId);
    const selectedMetric = METRIC_REGISTRY[metricKey] || { label: metricKey };

    const handleCreate = () => {
        if (!accountId || !metricKey || !operator || !threshold || !alertEmail) {
            toast.error('Completa todos los campos');
            return;
        }
        startTransition(async () => {
            const result = await createAlert({
                accountId,
                accountName: selectedAccount?.name || accountId,
                metricKey,
                metricLabel: selectedMetric.label,
                operator,
                threshold,
                alertEmail,
            });
            if (result.error) toast.error(result.error);
            else {
                toast.success('Alerta creada');
                setAlerts(prev => [result.alert, ...prev]);
                setShowCreate(false);
                setThreshold('');
            }
        });
    };

    const handleDelete = (id) => {
        startTransition(async () => {
            const result = await deleteAlert(id);
            if (result.error) toast.error(result.error);
            else {
                toast.success('Alerta eliminada');
                setAlerts(prev => prev.filter(a => a.id !== id));
            }
        });
    };

    const handleToggle = (id, isActive) => {
        startTransition(async () => {
            const result = await toggleAlert(id, !isActive);
            if (result.error) toast.error(result.error);
            else {
                setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_active: !isActive } : a));
            }
        });
    };

    // Metric picker
    const categories = getMetricsByCategory(METRIC_REGISTRY);
    const filteredCats = {};
    for (const [cat, metrics] of Object.entries(categories)) {
        const matches = metrics.filter(m => !metricSearch || m.label.toLowerCase().includes(metricSearch.toLowerCase()));
        if (matches.length) filteredCats[cat] = matches;
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--border-primary)] px-4 sm:px-6 py-3">
                <div className="max-w-[800px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <a href="/" className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                            <ArrowLeft size={16} /> Dashboard
                        </a>
                        <span className="text-[var(--border-secondary)]">|</span>
                        <h1 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <Bell size={18} /> Alertas
                        </h1>
                    </div>
                    <span className="text-xs text-[var(--text-tertiary)]">{userName}</span>
                </div>
            </header>

            <main className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 space-y-6">
                {!hasToken && (
                    <div className="p-4 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning)]/30 flex items-start gap-3">
                        <AlertTriangle size={20} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-[var(--text-primary)]">Conecta tu token de Meta primero desde el <a href="/" className="text-[var(--accent-primary)] hover:underline">dashboard</a>.</p>
                    </div>
                )}

                {/* Create alert */}
                {!showCreate ? (
                    <button onClick={() => setShowCreate(true)} disabled={!hasToken}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity">
                        <Plus size={16} /> Nueva alerta
                    </button>
                ) : (
                    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Crear alerta</h3>

                        {/* Account */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Cuenta publicitaria</label>
                            <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full">
                                <option value="">Seleccionar cuenta...</option>
                                {accounts.map(a => (
                                    <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                                ))}
                            </select>
                        </div>

                        {/* Metric + operator + threshold */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="relative">
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Metrica</label>
                                <button onClick={() => setShowMetricPicker(!showMetricPicker)}
                                    className="w-full h-9 px-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-sm text-left cursor-pointer truncate text-[var(--text-primary)]">
                                    {selectedMetric.label}
                                    <ChevronDown size={12} className="absolute right-3 top-[34px] text-[var(--text-tertiary)]" />
                                </button>
                                {showMetricPicker && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => { setShowMetricPicker(false); setMetricSearch(''); }} />
                                        <div className="absolute top-full left-0 mt-1 w-[260px] max-h-[300px] overflow-y-auto bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] z-50" style={{ boxShadow: 'var(--shadow-md)' }}>
                                            <div className="sticky top-0 bg-[var(--bg-card)] p-2 border-b border-[var(--border-primary)]">
                                                <div className="relative">
                                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                                                    <input type="text" value={metricSearch} onChange={e => setMetricSearch(e.target.value)} placeholder="Buscar..." autoFocus
                                                        className="w-full h-8 pl-8 pr-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
                                                </div>
                                            </div>
                                            <div className="p-1">
                                                {Object.entries(filteredCats).map(([cat, metrics]) => (
                                                    <div key={cat} className="mb-1">
                                                        <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-2 py-1">{cat}</p>
                                                        {metrics.map(m => (
                                                            <button key={m.key} onClick={() => { setMetricKey(m.key); setShowMetricPicker(false); setMetricSearch(''); }}
                                                                className={cn('w-full px-2 py-1.5 rounded-lg text-left cursor-pointer text-xs',
                                                                    m.key === metricKey ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]' : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]')}>
                                                                {m.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Condicion</label>
                                <select value={operator} onChange={e => setOperator(e.target.value)} className="w-full">
                                    {OPERATORS.map(op => (
                                        <option key={op.value} value={op.value}>{op.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Valor {selectedAccount ? `(${selectedAccount.currency})` : ''}</label>
                                <input type="number" step="0.01" value={threshold} onChange={e => setThreshold(e.target.value)} placeholder={selectedAccount?.currency === 'ARS' ? '7000' : '10'}
                                    className="w-full h-9 px-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Email para la alerta</label>
                            <div className="relative">
                                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                                <input type="email" value={alertEmail} onChange={e => setAlertEmail(e.target.value)} placeholder="tu@email.com"
                                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
                            </div>
                        </div>

                        {/* Preview */}
                        {accountId && threshold && (
                            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-primary)]">
                                <p className="text-xs text-[var(--text-secondary)]">
                                    Si <strong className="text-[var(--text-primary)]">{selectedMetric.label}</strong> es{' '}
                                    <strong className="text-[var(--accent-primary)]">{OPERATORS.find(o => o.value === operator)?.label?.toLowerCase()}</strong>{' '}
                                    <strong className="text-[var(--text-primary)]">${parseFloat(threshold).toLocaleString('es-AR')}</strong>{' '}
                                    en <strong className="text-[var(--text-primary)]">{selectedAccount?.name}</strong>{' '}
                                    → enviar alerta a <strong className="text-[var(--text-primary)]">{alertEmail || '...'}</strong>
                                </p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button onClick={handleCreate} disabled={isPending || !accountId || !threshold || !alertEmail}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium disabled:opacity-40 cursor-pointer transition-opacity">
                                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                Crear
                            </button>
                            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-secondary)] cursor-pointer">
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Alert list */}
                {loaded && alerts.length === 0 && !showCreate && (
                    <div className="text-center py-12">
                        <Bell size={40} className="mx-auto text-[var(--text-tertiary)] mb-3" />
                        <p className="text-sm text-[var(--text-secondary)]">No tenes alertas configuradas</p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">Crea una alerta para recibir notificaciones cuando una metrica supere un umbral</p>
                    </div>
                )}

                {alerts.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tus alertas ({alerts.length})</h3>
                        {alerts.map(alert => (
                            <div key={alert.id} className={cn(
                                'flex items-center gap-3 p-4 rounded-xl border transition-all',
                                alert.is_active
                                    ? 'bg-[var(--bg-card)] border-[var(--border-primary)]'
                                    : 'bg-[var(--bg-elevated)] border-[var(--border-secondary)] opacity-60'
                            )}>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                        {alert.metric_label} {alert.operator} ${parseFloat(alert.threshold).toLocaleString('es-AR')}
                                    </p>
                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                        {alert.account_name} → {alert.alert_email}
                                    </p>
                                    {alert.last_triggered_at && (
                                        <p className="text-xs text-[var(--warning)] mt-0.5">
                                            Ultima alerta: {new Date(alert.last_triggered_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    )}
                                </div>
                                <button onClick={() => handleToggle(alert.id, alert.is_active)} disabled={isPending}
                                    className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title={alert.is_active ? 'Desactivar' : 'Activar'}>
                                    {alert.is_active ? <ToggleRight size={24} className="text-[var(--success)]" /> : <ToggleLeft size={24} />}
                                </button>
                                <button onClick={() => handleDelete(alert.id)} disabled={isPending}
                                    className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] cursor-pointer transition-all" title="Eliminar">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* n8n instructions */}
                <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-4">
                    <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Configuracion n8n</h4>
                    <p className="text-xs text-[var(--text-secondary)]">
                        Configura un workflow en n8n con un <strong>Cron Trigger</strong> (cada 4-6 horas) que llame a:
                    </p>
                    <code className="block mt-2 p-2 rounded-lg bg-[var(--bg-elevated)] text-xs text-[var(--accent-primary)] break-all">
                        GET {typeof window !== 'undefined' ? window.location.origin : ''}/api/alerts/check?secret=TU_CRON_SECRET
                    </code>
                    <p className="text-xs text-[var(--text-tertiary)] mt-2">
                        El endpoint devuelve las alertas disparadas. Usa un nodo de <strong>Resend</strong> o <strong>Email</strong> en n8n para enviar las notificaciones.
                    </p>
                </div>
            </main>
        </div>
    );
}
