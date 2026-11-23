import { MAX_ORDER_LINES, MAX_QTY_PER_LINE } from '../config/app';
import { CartItem, Order, OrderItem, Product } from '../types/product';

export interface PricedOrderDraft {
  items: OrderItem[];
  itemCount: number;
  subtotal: number;
  total: number;
}

/**
 * Prices lines from the catalog's suggestedRetailPrice.
 * Cart unit prices and client totals are ignored.
 */
export function priceCart(cart: CartItem[], catalog: Product[]): PricedOrderDraft {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error('Keranjang kosong');
  }
  if (cart.length > MAX_ORDER_LINES) {
    throw new Error(`Maksimal ${MAX_ORDER_LINES} jenis produk per pesanan`);
  }

  const seen = new Set<string>();
  const items: OrderItem[] = [];

  for (const line of cart) {
    if (!line || typeof line.productId !== 'string' || line.productId.length === 0) {
      throw new Error('Item keranjang tidak valid');
    }
    if (seen.has(line.productId)) {
      throw new Error('Produk duplikat di keranjang');
    }
    seen.add(line.productId);

    const product = catalog.find((entry) => entry.id === line.productId);
    if (!product?.id) {
      throw new Error('Produk tidak ada di katalog Firestore');
    }
    if (product.isActive === false) {
      throw new Error(`${product.name} sedang nonaktif`);
    }

    const quantity = line.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
      throw new Error('Jumlah item tidak valid');
    }

    const unitPrice = product.suggestedRetailPrice;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error('Harga katalog tidak valid');
    }

    items.push({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
    });
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return { items, itemCount, subtotal, total: subtotal };
}

/**
 * Older orders store their lines on the order document.
 * Newer orders store lines in orders/{id}/items. Those lines replace a header
 * total so the report shows the prices the rules already checked.
 */
export function presentOrder(order: Order, lines?: OrderItem[] | null): Order {
  if (Array.isArray(order.items) && order.items.length > 0) return order;
  const next = Array.isArray(lines) ? lines : [];
  if (next.length === 0) {
    return { ...order, items: [] };
  }
  const subtotal = next.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = next.reduce((sum, item) => sum + item.quantity, 0);
  return { ...order, items: next, subtotal, total: subtotal, itemCount };
}

export function normalizePhone(input: string): string {
  const digits = String(input || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 20) {
    throw new Error('Nomor HP harus 8–20 digit');
  }
  return digits;
}

export function normalizeNote(note?: string): string {
  return String(note || '').trim().slice(0, 500);
}

export function normalizeCustomerName(name: string): string {
  const trimmed = String(name || '').trim().slice(0, 120);
  if (!trimmed) {
    throw new Error('Nama pelanggan wajib diisi');
  }
  return trimmed;
}

export function normalizeCustomerEmail(email: string): string {
  const trimmed = String(email || '').trim();
  if (!trimmed || trimmed.length > 120 || !trimmed.includes('@')) {
    throw new Error('Email akun tidak valid');
  }
  return trimmed;
}
