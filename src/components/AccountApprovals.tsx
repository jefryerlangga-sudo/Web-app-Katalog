import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';
import { accountRoleLabel, type AssignableAccountRole } from '../config/accountRole';
import { useCatalog } from '../context/CatalogContext';
import type { UserProfile } from '../types/product';

const ROLE_ORDER = ['pending', 'rejected', 'grosir', 'customer', 'end_user'];

export const AccountApprovals: React.FC = () => {
  const { accountDirectory, pendingCount, setAccountRole } = useCatalog();
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const people = [...accountDirectory].sort((left, right) => {
    const rank = ROLE_ORDER.indexOf(left.role) - ROLE_ORDER.indexOf(right.role);
    if (rank !== 0) return rank;
    return left.email.localeCompare(right.email, 'id');
  });

  const assign = async (uid: string, role: AssignableAccountRole) => {
    setBusyUid(uid);
    setError(null);
    try {
      await setAccountRole(uid, role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui akun');
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <section className="bg-slate-800/90 border border-amber-500/30 p-4 rounded-3xl shadow-lg space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-white">Persetujuan akun</h2>
            <p className="text-[11px] text-slate-400">Pilih Akun Grosir atau Akun End User. Tier bisa diubah lagi nanti.</p>
          </div>
        </div>
        <span className="shrink-0 min-w-7 h-7 px-2 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center">
          {pendingCount}
        </span>
      </div>

      {error && (
        <p className="text-xs text-rose-300 bg-rose-950/50 border border-rose-500/30 rounded-xl px-3 py-2">{error}</p>
      )}

      {people.length === 0 ? (
        <p className="text-xs text-slate-400">Belum ada akun customer.</p>
      ) : (
        <ul className="space-y-2">
          {people.map((person) => (
            <li key={person.uid} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3 space-y-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{person.displayName || person.email}</p>
                <p className="text-[11px] text-slate-400 truncate">{person.email}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200 mt-1">
                  {accountRoleLabel(person.role)}
                </p>
              </div>
              <RoleActions person={person} busy={busyUid === person.uid} onAssign={assign} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

function RoleActions({
  person,
  busy,
  onAssign,
}: {
  person: UserProfile;
  busy: boolean;
  onAssign: (uid: string, role: AssignableAccountRole) => void;
}) {
  const actions: Array<{ role: AssignableAccountRole; label: string; className: string }> = [
    { role: 'grosir', label: person.role === 'pending' ? 'Akun Grosir' : 'Jadikan Grosir', className: 'bg-emerald-600 text-white' },
    { role: 'end_user', label: person.role === 'pending' ? 'Akun End User' : 'Jadikan End User', className: 'bg-blue-600 text-white' },
    { role: 'rejected', label: 'Tolak', className: 'bg-slate-700 text-slate-200' },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {actions
        .filter((action) => action.role !== person.role)
        .map((action) => (
          <button
            key={action.role}
            type="button"
            disabled={busy}
            onClick={() => onAssign(person.uid, action.role)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold disabled:opacity-50 ${action.className}`}
          >
            {busy ? '...' : action.label}
          </button>
        ))}
    </div>
  );
}
