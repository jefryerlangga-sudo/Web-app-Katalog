import { configuredWhatsAppNumber } from '../config/app';
import { Order } from '../types/product';

/** User-opened wa.me link only. Returns null when no business number is configured. */
export function formatWhatsAppLink(number: string, order: Order): string | null {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return null;

  const lines = [
    `Halo PortalTech, saya ingin menindaklanjuti pesanan ${order.id}`,
    '',
    `Nama: ${order.customerName}`,
    `Email: ${order.customerEmail}`,
    `HP: ${order.customerPhone}`,
    '',
    'Item:',
    ...order.items.map(
      (item) =>
        `- ${item.name} (${item.sku}) x${item.quantity} = Rp ${item.lineTotal.toLocaleString('id-ID')}`
    ),
    '',
    `Total: Rp ${order.total.toLocaleString('id-ID')}`,
    order.note ? `Catatan: ${order.note}` : '',
  ].filter((line) => line !== '');

  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function buildWhatsAppOrderLink(order: Order): string | null {
  return formatWhatsAppLink(configuredWhatsAppNumber(), order);
}
