'use client';

import { useState } from 'react';
import { createClient } from '../_lib/supabase-browser';
import { BarChart3, Loader2, Mail, Lock, User } from 'lucide-react';

export default function AuthForm() {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const supabase = createClient();

        if (mode === 'signup') {
            if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); setLoading(false); return; }
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName || '' } },
            });
            setLoading(false);
            if (error) {
                setError(error.message.includes('already registered') ? 'Este email ya esta registrado.' : error.message);
            } else {
                setSuccess('Cuenta creada. Espera la aprobacion del administrador.');
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            setLoading(false);
            if (error) {
                setError(error.message.includes('Invalid login') ? 'Email o contraseña incorrectos' : error.message);
            } else {
                // Client-side login sets the cookie directly — full reload picks it up
                window.location.href = '/';
            }
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent-primary)] text-white mb-4">
                        <BarChart3 size={28} />
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Fomo Ads Metrics</h1>
                    <p className="text-[var(--text-secondary)] mt-2">
                        {mode === 'login' ? 'Inicia sesion para acceder' : 'Crea tu cuenta'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-md)' }}>
                    {mode === 'signup' && (
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Nombre</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Tu nombre"
                                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Email</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required autoComplete="email"
                                className="w-full h-10 pl-10 pr-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Contraseña</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimo 8 caracteres" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                className="w-full h-10 pl-10 pr-3 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-[var(--danger-bg)] border border-[var(--danger)]/20">
                            <p className="text-xs text-[var(--danger)]">{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="p-3 rounded-lg bg-[var(--success-bg)] border border-[var(--success)]/20">
                            <p className="text-xs text-[var(--success)]">{success}</p>
                        </div>
                    )}

                    <button type="submit" disabled={loading}
                        className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : mode === 'login' ? 'Iniciar Sesion' : 'Crear Cuenta'}
                    </button>

                    <p className="text-center text-xs text-[var(--text-secondary)]">
                        {mode === 'login' ? (
                            <>No tenes cuenta? <button type="button" onClick={() => { setMode('signup'); setError(''); setSuccess(''); }} className="text-[var(--accent-primary)] hover:underline cursor-pointer">Registrate</button></>
                        ) : (
                            <>Ya tenes cuenta? <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="text-[var(--accent-primary)] hover:underline cursor-pointer">Inicia sesion</button></>
                        )}
                    </p>
                </form>
            </div>
        </div>
    );
}
