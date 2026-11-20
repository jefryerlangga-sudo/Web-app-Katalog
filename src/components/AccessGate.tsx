import React, { useState } from 'react';
import { Lock, LogIn, LogOut, Mail, User } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '../config/app';
import { useCatalog } from '../context/CatalogContext';
import { BrandMark } from './BrandMark';

export const AccessGate: React.FC = () => {
  const { gate, profileError, login, loginEmail, registerEmail, logout, user } = useCatalog();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await login();
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
        if (password.length < 6) throw new Error('Password minimal 6 karakter');
        await registerEmail(email, password, displayName || email.split('@')[0]);
      }
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 space-y-5">
        <div className="flex flex-col items-center text-center gap-3">
          <BrandMark className="w-16 h-16" />
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">{APP_NAME}</h1>
            <p className="text-sm text-slate-400 mt-1">{APP_TAGLINE}</p>
          </div>
        </div>

        {gate === 'loading' && (
          <p className="text-center text-sm text-blue-300">Memeriksa akun...</p>
        )}

        {gate === 'signed-out' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300 text-center leading-relaxed">
              Masuk untuk melihat katalog, harga, dan daftar promo. Customer masuk dengan Google.
            </p>
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
                {busy ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar'}
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
              {mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
            </button>
          </div>
        )}

        {gate === 'pending' && (
          <StatusCard
            title="Akun menunggu persetujuan"
            body={
              profileError ||
              'Pendaftaran diterima. Admin akan memilih Akun Grosir atau Akun End User. Katalog dan harga terbuka setelah akun disetujui.'
            }
            email={user?.email}
            onLogout={logout}
          />
        )}

        {gate === 'rejected' && (
          <StatusCard
            title="Akun belum disetujui"
            body="Pendaftaran ini ditolak. Hubungi admin Partshop jika Anda merasa ini keliru."
            email={user?.email}
            onLogout={logout}
          />
        )}
      </div>
    </div>
  );
};

function StatusCard({
  title,
  body,
  email,
  onLogout,
}: {
  title: string;
  body: string;
  email?: string | null;
  onLogout: () => void;
}) {
  return (
    <div className="space-y-4 text-center">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <p className="text-sm text-slate-300 leading-relaxed">{body}</p>
      {email && <p className="text-xs text-slate-500 truncate">{email}</p>}
      <button
        type="button"
        onClick={onLogout}
        className="w-full py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        Keluar
      </button>
    </div>
  );
}
