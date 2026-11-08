import React, { useState } from 'react';
import { Lock, LogIn, Mail, User, X } from 'lucide-react';
import { APP_NAME } from '../config/app';
import { useCatalog } from '../context/CatalogContext';

export const AuthModal: React.FC = () => {
  const { showAuthModal, setShowAuthModal, login, loginEmail, registerEmail, user } = useCatalog();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!showAuthModal || user) return null;

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await login();
      setShowAuthModal(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal masuk dengan Google';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') {
        await loginEmail(email, password);
      } else {
        if (password.length < 6) {
          throw new Error('Password minimal 6 karakter');
        }
        await registerEmail(email, password, displayName || email.split('@')[0]);
      }
      setShowAuthModal(false);
    } catch (err: unknown) {
      const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: string }).code) : '';
      const message = code
        ? code.replace('auth/', '').replace(/-/g, ' ')
        : err instanceof Error
          ? err.message
          : 'Gagal autentikasi';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">
              {mode === 'login' ? 'Masuk' : 'Buat Akun'} — {APP_NAME}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Customer bisa belanja. Kelola katalog hanya untuk master admin yang emailnya sudah terverifikasi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAuthModal(false)}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full py-3 rounded-2xl bg-white text-slate-900 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
        >
          <LogIn className="w-4 h-4" />
          Lanjutkan dengan Google
        </button>

        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <div className="flex-1 h-px bg-slate-700" />
          atau email
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        <form onSubmit={handleEmail} className="space-y-2.5">
          {mode === 'register' && (
            <label className="block space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Nama</span>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white"
                  placeholder="Nama lengkap"
                />
              </div>
            </label>
          )}
          <label className="block space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Email</span>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white"
                placeholder="email@contoh.com"
              />
            </div>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Password</span>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white"
                placeholder="Minimal 6 karakter"
              />
            </div>
          </label>

          {error && (
            <p className="text-xs text-rose-300 bg-rose-950/50 border border-rose-500/30 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm disabled:opacity-60"
          >
            {busy ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar Customer'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
          className="w-full text-xs text-slate-400 hover:text-white"
        >
          {mode === 'login' ? 'Belum punya akun? Daftar sebagai customer' : 'Sudah punya akun? Masuk'}
        </button>
      </div>
    </div>
  );
};
