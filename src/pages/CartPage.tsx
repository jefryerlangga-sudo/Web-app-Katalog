import React, { useEffect, useState } from 'react';
import { Check, MessageCircle, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { listMyOrders } from '../firebase/ordersService';
import { Order } from '../types/product';

function checkoutErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('permission-denied') || raw.includes('PERMISSION_DENIED') || raw.includes('Missing or insufficient permissions')) {
    return 'Pesanan ditolak. Harga atau stok tidak lagi sesuai katalog, atau rules Firestore belum mengizinkan pesanan ini.';
  }
  return raw;
}

export const CartPage: React.FC = () => {
  const {
    cart,
    cartTotal,
    updateCartQty,
    removeFromCart,
    clearCart,
    checkout,
    user,
    userProfile,
    setShowAuthModal,
    usingPreviewCatalog,
  } = useCatalog();

  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [whatsAppOpened, setWhatsAppOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (userProfile?.phone) setPhone(userProfile.phone);
  }, [userProfile?.phone]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }
    let active = true;
    listMyOrders(user.uid)
      .then((rows) => {
        if (active) setOrders(rows);
      })
      .catch(() => {
        if (active) setOrders([]);
      });
    return () => {
      active = false;
    };
  }, [user, successId]);

  const handleCheckout = async (openWhatsApp: boolean) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await checkout({ customerPhone: phone, note, openWhatsApp });
      setSuccessId(result.order.id || null);
      setWhatsAppOpened(Boolean(result.whatsAppLink));
      setNote('');
    } catch (err: unknown) {
      setError(checkoutErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (successId) {
    return (
      <div className="pb-24 space-y-4">
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/40 p-5 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
            <Check className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-black text-white">Pesanan tercatat</h1>
          <p className="text-xs text-emerald-200/90">
            ID pesanan <span className="font-mono font-bold">{successId}</span> disimpan di Firestore dengan status pending.
            {whatsAppOpened
              ? ' Tautan WhatsApp dibuka di browser. Pesan tidak dikirim otomatis.'
              : ' Tautan WhatsApp tidak dibuka karena nomor bisnis belum diisi atau Anda memilih checkout tanpa WhatsApp.'}
          </p>
          <button
            onClick={() => setSuccessId(null)}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
          >
            Belanja lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-500/30">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-white">Keranjang Belanja</h1>
            <p className="text-xs text-slate-400">{cart.length} jenis item</p>
          </div>
        </div>
        {cart.length > 0 && (
          <button onClick={clearCart} className="text-xs text-rose-300 font-semibold">
            Kosongkan
          </button>
        )}
      </div>

      {usingPreviewCatalog && (
        <p className="text-xs text-amber-200 bg-amber-950/50 border border-amber-500/30 rounded-2xl px-3 py-2">
          Katalog yang tampil masih sampel lokal. Checkout dimatikan sampai produk tersimpan di Firestore.
        </p>
      )}

      {cart.length === 0 ? (
        <div className="rounded-3xl border border-slate-700 bg-slate-800/50 p-6 text-center text-sm text-slate-400">
          Keranjang masih kosong. Tambahkan aksesoris dari katalog.
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {cart.map((item) => (
              <div key={item.productId} className="rounded-2xl border border-slate-700 bg-slate-800/70 p-3 flex gap-3">
                <img src={item.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover bg-slate-900" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{item.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {item.brand} · {item.sku}
                  </p>
                  <p className="text-sm font-extrabold text-blue-300 mt-1">
                    Rp {(item.unitPrice * item.quantity).toLocaleString('id-ID')}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => updateCartQty(item.productId, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQty(item.productId, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="ml-auto w-7 h-7 rounded-lg bg-rose-500/15 text-rose-300 flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-800/80 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 font-semibold">Total eceran</span>
              <span className="text-lg font-black text-white">Rp {cartTotal.toLocaleString('id-ID')}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Total dihitung dari harga eceran katalog. Angka yang diubah di browser tidak menjadi harga pesanan.
            </p>

            {!user && (
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full py-2.5 rounded-xl bg-slate-700 text-white text-xs font-bold"
              >
                Masuk / Daftar untuk checkout
              </button>
            )}

            <label className="block space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">No. WhatsApp / HP *</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Catatan</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Alamat atau catatan (opsional)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white resize-none"
              />
            </label>

            {error && (
              <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              disabled={busy || !user || usingPreviewCatalog}
              onClick={() => handleCheckout(true)}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <MessageCircle className="w-4 h-4" />
              {busy ? 'Memproses...' : 'Checkout & buka tautan WhatsApp'}
            </button>
            <button
              disabled={busy || !user || usingPreviewCatalog}
              onClick={() => handleCheckout(false)}
              className="w-full py-2.5 rounded-2xl bg-slate-700 text-slate-100 font-semibold text-xs disabled:opacity-50"
            >
              Checkout tanpa WhatsApp
            </button>
          </div>
        </>
      )}

      {user && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Pesanan saya</h2>
          {orders.length === 0 ? (
            <p className="text-xs text-slate-500 px-1">Belum ada pesanan, atau rules Firestore belum mengizinkan pembacaan.</p>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-700 bg-slate-800/60 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-slate-300">{order.id}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-200">{order.status}</span>
                </div>
                <p className="mt-1 text-slate-400">
                  {order.itemCount} item · Rp {order.total.toLocaleString('id-ID')}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
