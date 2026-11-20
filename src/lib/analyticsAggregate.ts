/**
 * Quota-cheap analytics and purchase reports.
 * Each approved user writes analyticsHits/{YYYY-MM-DD}_{uid} in Asia/Jakarta.
 * A flush appends at most 8 event strings. The document is not read first.
 * Reports query those documents for the selected dates (capped).
 */
import { accountRoleLabel } from '../config/accountRole.ts';
import { isMasterAdminEmail } from '../config/app.ts';
import type { Order, OrderItem, OrderStatus } from '../types/product.ts';

export const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
export const MAX_RANGE_DAYS = 62;
export const MAX_EVENTS_PER_WRITE = 8;
export const MAX_EVENTS_PER_USER_DAY = 800;
export const MAX_ORDERS_PER_REPORT = 200;

export const PAGE_KEYS = [
  'home',
  'search',
  'categories',
  'focus',
  'bestseller',
  'promo',
  'compare',
  'ai',
  'cart',
  'admin',
  'laporan',
] as const;

export const CLICK_KEYS = [
  'product_view',
  'add_to_cart',
  'whatsapp_checkout',
  'promo_open',
  'search',
  'order',
] as const;

export type PageKey = (typeof PAGE_KEYS)[number];
export type ClickKey = (typeof CLICK_KEYS)[number];
export type ProductMetric = 'views' | 'carts' | 'orders';
export type RangePreset = 'today' | '7d' | '30d' | 'custom';

export const PAGE_LABELS: Record<PageKey, string> = {
  home: 'Beranda',
  search: 'Cari',
  categories: 'Kategori',
  focus: 'Fokus',
  bestseller: 'Terlaris',
  promo: 'Promo',
  compare: 'Bandingkan',
  ai: 'Asisten',
  cart: 'Keranjang',
  admin: 'Kelola katalog',
  laporan: 'Laporan',
};

export const CLICK_LABELS: Record<ClickKey, string> = {
  product_view: 'Produk dibuka',
  add_to_cart: 'Tambah ke keranjang',
  whatsapp_checkout: 'Checkout WhatsApp',
  promo_open: 'Halaman promo dibuka',
  search: 'Pencarian',
  order: 'Pesanan tercatat',
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  cancelled: 'Dibatalkan',
  completed: 'Selesai',
};

export const ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];

/** Checkout stores pending and only opens wa.me. It does not record payment or a sent message. */
export const PURCHASE_GAP_NOTE =
  'Pesanan disimpan sebagai Menunggu, lalu tautan WhatsApp dibuka di browser. Aplikasi tidak tahu apakah pesan terkirim atau pembayaran selesai. Status berubah hanya saat admin menandainya di sini.';

export const EMPTY_ACTIVITY_NOTE =
  'Belum ada kunjungan atau klik di rentang ini. Pencatatan baru berjalan setelah versi laporan ini dipakai dan rules Firestore untuk analyticsDays dipasang. Angka tidak mencakup masa sebelumnya.';

export const TRACKING_FOOTNOTE =
  'Satu kunjungan = satu tab browser per hari (muat ulang tidak menambah). Klik seorang pengguna ditulis ke satu dokumen miliknya per hari, paling banyak 8 kejadian tiap tulis. Membuka laporan membaca dokumen itu (paling banyak 200) dan pesanan di rentang yang sama (paling banyak 200).';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_ID = /^[a-zA-Z0-9_-]{1,128}$/;
const SAFE_UID = /^[A-Za-z0-9_-]{1,128}$/;

export interface ProductRef {
  id: string;
  sku: string;
  name: string;
}

export type AnalyticsEvent =
  | { type: 'visit' }
  | { type: 'page'; page: PageKey }
  | { type: 'click'; click: ClickKey }
  | { type: 'product'; metric: ProductMetric; product: ProductRef };

export interface AnalyticsIdentity {
  uid: string;
  email: string;
  name: string;
  role: string;
}

export interface AnalyticsWriteBody {
  date: string;
  uid: string;
  seen: string;
  email: string;
  name: string;
  role: string;
  pages: string;
  events: string[];
}

export interface DateRange {
  start: string;
  end: string;
  preset: RangePreset;
  capped: boolean;
}

export interface DaySummary {
  date: string;
  visits: number;
  people: number;
  pages: Record<PageKey, number>;
  clicks: Record<ClickKey, number>;
}

export interface VisitorRow {
  uid: string;
  name: string;
  email: string;
  role: string;
  lastSeen: string;
  hits: number;
  pages: PageKey[];
}

export interface ProductStat {
  id: string;
  sku: string;
  name: string;
  views: number;
  carts: number;
  orders: number;
}

export interface VisitClickReport {
  example: boolean;
  start: string;
  end: string;
  days: DaySummary[];
  totals: {
    visits: number;
    people: number;
    pageViews: number;
    clicks: number;
    pages: Record<PageKey, number>;
    clicksByType: Record<ClickKey, number>;
  };
  visitors: VisitorRow[];
  topProducts: ProductStat[];
  productCount: number;
}

export interface PurchaseLine {
  id: string;
  createdAt: string;
  day: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  userId: string;
  role: string | null;
  roleLabel: string;
  status: OrderStatus;
  itemCount: number;
  total: number;
  note: string;
  items: OrderItem[];
}

export interface PurchaseSummary {
  example: boolean;
  orders: PurchaseLine[];
  truncated: boolean;
  scanned: number;
  totals: {
    recorded: number;
    activeOrders: number;
    activeValue: number;
    completedOrders: number;
    completedValue: number;
    pendingOrders: number;
    qty: number;
  };
  byStatus: Record<OrderStatus, { count: number; value: number }>;
  topProducts: Array<{ id: string; sku: string; name: string; qty: number; value: number }>;
  perDay: Array<{ date: string; orders: number; activeValue: number }>;
}

export function isPageKey(value: string): value is PageKey {
  return (PAGE_KEYS as readonly string[]).includes(value);
}

export function isClickKey(value: string): value is ClickKey {
  return (CLICK_KEYS as readonly string[]).includes(value);
}

export function jakartaDate(now: Date = new Date()): string {
  return new Date(now.getTime() + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * 86400000).toISOString().slice(0, 10);
}

export function inclusiveDays(start: string, end: string): number {
  const from = Date.parse(`${start}T00:00:00Z`);
  const to = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86400000) + 1;
}

export function isDayKey(value: string | undefined | null): value is string {
  return typeof value === 'string' && DAY.test(value);
}

export function resolveDateRange(input: {
  preset: RangePreset;
  now?: Date;
  customStart?: string;
  customEnd?: string;
}): DateRange {
  const today = jakartaDate(input.now ?? new Date());
  if (input.preset === 'today') return { start: today, end: today, preset: 'today', capped: false };
  if (input.preset === '7d') return { start: addDays(today, -6), end: today, preset: '7d', capped: false };
  if (input.preset === '30d') return { start: addDays(today, -29), end: today, preset: '30d', capped: false };

  let start = isDayKey(input.customStart) ? input.customStart : today;
  let end = isDayKey(input.customEnd) ? input.customEnd : today;
  if (start > end) {
    const swap = start;
    start = end;
    end = swap;
  }
  let capped = false;
  if (inclusiveDays(start, end) > MAX_RANGE_DAYS) {
    start = addDays(end, -(MAX_RANGE_DAYS - 1));
    capped = true;
  }
  return { start, end, preset: 'custom', capped };
}

/** Inclusive Jakarta-day bounds as UTC ISO strings, for order createdAt filters. */
export function jakartaDayBounds(start: string, end: string): { startIso: string; endIso: string } {
  return {
    startIso: new Date(`${start}T00:00:00+07:00`).toISOString(),
    endIso: new Date(`${end}T23:59:59.999+07:00`).toISOString(),
  };
}

export function formatJakarta(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return iso || '—';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(time));
}

export function formatDayLabel(date: string): string {
  const time = Date.parse(`${date}T12:00:00+07:00`);
  if (Number.isNaN(time)) return date;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(time));
}

export function safeProductId(id: string): string | null {
  const trimmed = id.trim();
  if (SAFE_ID.test(trimmed)) return trimmed;
  const cleaned = trimmed.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 128);
  return SAFE_ID.test(cleaned) ? cleaned : null;
}

export function safeUid(uid: string): boolean {
  return SAFE_UID.test(uid);
}

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function blankPages(): Record<PageKey, number> {
  return Object.fromEntries(PAGE_KEYS.map((key) => [key, 0])) as Record<PageKey, number>;
}

function blankClicks(): Record<ClickKey, number> {
  return Object.fromEntries(CLICK_KEYS.map((key) => [key, 0])) as Record<ClickKey, number>;
}

export function encodeAnalyticsEvents(events: AnalyticsEvent[], nonce: string): string[] {
  const encoded: string[] = [];
  events.forEach((event, index) => {
    const id = `${nonce}-${index}`;
    if (event.type === 'visit') {
      encoded.push(`v#${id}`);
      return;
    }
    if (event.type === 'page' && isPageKey(event.page)) {
      encoded.push(`g#${event.page}#${id}`);
      return;
    }
    if (event.type === 'click' && isClickKey(event.click)) {
      encoded.push(`c#${event.click}#${id}`);
      return;
    }
    if (event.type !== 'product') return;
    const productId = safeProductId(event.product.id);
    if (!productId) return;
    const metric = event.metric;
    if (metric !== 'views' && metric !== 'carts' && metric !== 'orders') return;
    const sku = encodeURIComponent(clip(event.product.sku, 64) || productId);
    const name = encodeURIComponent(clip(event.product.name, 150) || productId);
    encoded.push(`m#${metric}#${productId}#${sku}#${name}#${id}`);
  });
  return encoded;
}

export function chunkList<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

export function buildHitWrites(
  events: AnalyticsEvent[],
  profile: AnalyticsIdentity,
  options: { date: string; seen: string; pagesSeen?: PageKey[] }
): AnalyticsWriteBody[] {
  const pagesSeen = new Set((options.pagesSeen ?? []).filter(isPageKey));
  for (const event of events) {
    if (event.type === 'page') pagesSeen.add(event.page);
  }
  const pages = [...pagesSeen].filter(isPageKey).join(',').slice(0, 80);
  const encoded = encodeAnalyticsEvents(events, options.seen.replace(/[^0-9]/g, '').slice(-12) || '0');
  const chunks = encoded.length ? chunkList(encoded, MAX_EVENTS_PER_WRITE) : [];
  return chunks.map((batch) => ({
    date: options.date,
    uid: profile.uid,
    seen: options.seen,
    email: clip(profile.email, 120),
    name: clip(profile.name, 80) || 'Pelanggan',
    role: profile.role === 'admin' ? 'admin' : clip(profile.role, 32),
    pages,
    events: batch,
  }));
}

export function materializeHit(
  events: AnalyticsEvent[],
  profile: AnalyticsIdentity,
  options: { date: string; seen: string; pagesSeen?: PageKey[] }
): Record<string, unknown> {
  const writes = buildHitWrites(events, profile, options);
  const last = writes[writes.length - 1];
  return {
    date: options.date,
    uid: profile.uid,
    email: last?.email || profile.email,
    name: last?.name || profile.name,
    role: last?.role || profile.role,
    seen: options.seen,
    pages: last?.pages || '',
    events: writes.flatMap((write) => write.events),
  };
}

function parsePages(value: unknown): PageKey[] {
  if (typeof value !== 'string') return [];
  const seen = new Set<PageKey>();
  for (const part of value.split(',')) {
    if (isPageKey(part)) seen.add(part);
  }
  return [...seen];
}

function decodePart(value: string | undefined): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value).slice(0, 150);
  } catch {
    return value.slice(0, 150);
  }
}

function tallyEvents(events: unknown): {
  visits: number;
  pages: Record<PageKey, number>;
  clicks: Record<ClickKey, number>;
  products: ProductStat[];
} {
  const pages = blankPages();
  const clicks = blankClicks();
  const products = new Map<string, ProductStat>();
  let visits = 0;
  if (!Array.isArray(events)) return { visits, pages, clicks, products: [] };
  for (const raw of events) {
    if (typeof raw !== 'string') continue;
    const [kind, first, second, skuPart, namePart] = raw.split('#');
    if (kind === 'v') {
      visits += 1;
      continue;
    }
    if (kind === 'g' && isPageKey(first)) {
      pages[first] += 1;
      continue;
    }
    if (kind === 'c' && isClickKey(first)) {
      clicks[first] += 1;
      continue;
    }
    if (kind !== 'm' || (first !== 'views' && first !== 'carts' && first !== 'orders')) continue;
    const id = safeProductId(second || '');
    if (!id) continue;
    const row = products.get(id) ?? { id, sku: decodePart(skuPart) || id, name: decodePart(namePart) || id, views: 0, carts: 0, orders: 0 };
    row[first] += 1;
    if (skuPart) row.sku = decodePart(skuPart) || row.sku;
    if (namePart) row.name = decodePart(namePart) || row.name;
    products.set(id, row);
  }
  return { visits, pages, clicks, products: [...products.values()] };
}

export function parseDayDocument(id: string, fields: Record<string, unknown>): {
  day: DaySummary;
  visitors: VisitorRow[];
  products: ProductStat[];
} | null {
  const date = typeof fields.date === 'string' && isDayKey(fields.date) ? fields.date : id.slice(0, 10);
  if (!isDayKey(date)) return null;
  const tally = tallyEvents(fields.events);
  const uid = typeof fields.uid === 'string' && safeUid(fields.uid) ? fields.uid : '';
  const visitors: VisitorRow[] = uid
    ? [
        {
          uid,
          name: typeof fields.name === 'string' ? fields.name.slice(0, 80) : '',
          email: typeof fields.email === 'string' ? fields.email.slice(0, 120) : '',
          role: typeof fields.role === 'string' ? fields.role.slice(0, 32) : '',
          lastSeen: typeof fields.seen === 'string' ? fields.seen : '',
          hits: Array.isArray(fields.events) ? fields.events.length : 0,
          pages: parsePages(fields.pages),
        },
      ]
    : [];
  return {
    day: { date, visits: tally.visits, people: visitors.length, pages: tally.pages, clicks: tally.clicks },
    visitors,
    products: tally.products.filter((row) => row.views + row.carts + row.orders > 0),
  };
}

function dayHasActivity(day: DaySummary): boolean {
  const pageTotal = PAGE_KEYS.reduce((sum, key) => sum + day.pages[key], 0);
  const clickTotal = CLICK_KEYS.reduce((sum, key) => sum + day.clicks[key], 0);
  return day.visits > 0 || day.people > 0 || pageTotal > 0 || clickTotal > 0;
}

export function summarizeDays(
  docs: Array<{ id: string; fields: Record<string, unknown> }>,
  range: { start: string; end: string }
): VisitClickReport {
  const pages = blankPages();
  const clicksByType = blankClicks();
  const dayMap = new Map<string, DaySummary>();
  const visitorMap = new Map<string, VisitorRow>();
  const productMap = new Map<string, ProductStat>();
  let visits = 0;

  for (const doc of docs) {
    const parsed = parseDayDocument(doc.id, doc.fields);
    if (!parsed) continue;
    if (parsed.day.date < range.start || parsed.day.date > range.end) continue;
    const bucket = dayMap.get(parsed.day.date);
    if (!bucket) {
      dayMap.set(parsed.day.date, {
        ...parsed.day,
        pages: { ...parsed.day.pages },
        clicks: { ...parsed.day.clicks },
      });
    } else {
      bucket.visits += parsed.day.visits;
      bucket.people += parsed.day.people;
      for (const key of PAGE_KEYS) bucket.pages[key] += parsed.day.pages[key];
      for (const key of CLICK_KEYS) bucket.clicks[key] += parsed.day.clicks[key];
    }
    visits += parsed.day.visits;
    for (const key of PAGE_KEYS) pages[key] += parsed.day.pages[key];
    for (const key of CLICK_KEYS) clicksByType[key] += parsed.day.clicks[key];
    for (const visitor of parsed.visitors) {
      const existing = visitorMap.get(visitor.uid);
      if (!existing) {
        visitorMap.set(visitor.uid, { ...visitor, pages: [...visitor.pages] });
        continue;
      }
      existing.hits += visitor.hits;
      for (const page of visitor.pages) {
        if (!existing.pages.includes(page)) existing.pages.push(page);
      }
      if (visitor.lastSeen >= existing.lastSeen) {
        existing.lastSeen = visitor.lastSeen;
        if (visitor.name) existing.name = visitor.name;
        if (visitor.email) existing.email = visitor.email;
        if (visitor.role) existing.role = visitor.role;
      }
    }
    for (const product of parsed.products) {
      const existing = productMap.get(product.id);
      if (!existing) {
        productMap.set(product.id, { ...product });
        continue;
      }
      existing.views += product.views;
      existing.carts += product.carts;
      existing.orders += product.orders;
      if (product.name) existing.name = product.name;
      if (product.sku) existing.sku = product.sku;
    }
  }

  const days = [...dayMap.values()].sort((left, right) => right.date.localeCompare(left.date));
  const activeDays = days.filter(dayHasActivity);
  const topProducts = [...productMap.values()].sort((left, right) => {
    if (right.views !== left.views) return right.views - left.views;
    if (right.carts !== left.carts) return right.carts - left.carts;
    if (right.orders !== left.orders) return right.orders - left.orders;
    return left.name.localeCompare(right.name, 'id');
  });
  const visitors = [...visitorMap.values()].sort((left, right) => right.lastSeen.localeCompare(left.lastSeen));
  const pageViews = PAGE_KEYS.reduce((sum, key) => sum + pages[key], 0);
  const clickTotal = CLICK_KEYS.reduce((sum, key) => sum + clicksByType[key], 0);

  return {
    example: false,
    start: range.start,
    end: range.end,
    days: activeDays,
    totals: {
      visits,
      people: visitors.length > 0 ? visitors.length : activeDays.reduce((sum, day) => sum + day.people, 0),
      pageViews,
      clicks: clickTotal,
      pages,
      clicksByType,
    },
    visitors,
    topProducts: topProducts.slice(0, 8),
    productCount: topProducts.length,
  };
}

export interface PurchaseQuery {
  status: 'all' | OrderStatus;
  customer: string;
}

function blankStatusTotals(): Record<OrderStatus, { count: number; value: number }> {
  return {
    pending: { count: 0, value: 0 },
    confirmed: { count: 0, value: 0 },
    cancelled: { count: 0, value: 0 },
    completed: { count: 0, value: 0 },
  };
}

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as string[]).includes(value);
}

export function summarizePurchases(
  orders: Order[],
  roles: ReadonlyMap<string, string | null | undefined>,
  filter: PurchaseQuery,
  options: { truncated?: boolean; scanned?: number } = {}
): PurchaseSummary {
  const needle = filter.customer.trim().toLowerCase();
  const lines: PurchaseLine[] = [];
  for (const order of orders) {
    const status = isOrderStatus(order.status) ? order.status : 'pending';
    if (filter.status !== 'all' && status !== filter.status) continue;
    const name = order.customerName || '';
    const email = order.customerEmail || '';
    if (needle && !name.toLowerCase().includes(needle) && !email.toLowerCase().includes(needle)) continue;
    const role = roles.get(order.userId) ?? null;
    const items = Array.isArray(order.items) ? order.items : [];
    lines.push({
      id: order.id || '',
      createdAt: order.createdAt,
      day: orderDay(order.createdAt),
      customerName: name,
      customerEmail: email,
      customerPhone: order.customerPhone || '',
      userId: order.userId,
      role: role ?? null,
      roleLabel: purchaseRoleLabel(email, role),
      status,
      itemCount: typeof order.itemCount === 'number' ? order.itemCount : items.reduce((sum, item) => sum + item.quantity, 0),
      total: typeof order.total === 'number' ? order.total : 0,
      note: order.note || '',
      items,
    });
  }
  lines.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const byStatus = blankStatusTotals();
  const productMap = new Map<string, { id: string; sku: string; name: string; qty: number; value: number }>();
  const dayMap = new Map<string, { date: string; orders: number; activeValue: number }>();
  let activeOrders = 0;
  let activeValue = 0;
  let completedOrders = 0;
  let completedValue = 0;
  let pendingOrders = 0;
  let qty = 0;

  for (const line of lines) {
    byStatus[line.status].count += 1;
    byStatus[line.status].value += line.total;
    if (line.status === 'pending') pendingOrders += 1;
    if (line.status === 'completed') {
      completedOrders += 1;
      completedValue += line.total;
    }
    if (line.status === 'cancelled') continue;
    activeOrders += 1;
    activeValue += line.total;
    qty += line.itemCount;
    const bucket = dayMap.get(line.day) ?? { date: line.day, orders: 0, activeValue: 0 };
    bucket.orders += 1;
    bucket.activeValue += line.total;
    dayMap.set(line.day, bucket);
    for (const item of line.items) {
      const id = item.productId || item.sku;
      const row = productMap.get(id) ?? { id, sku: item.sku, name: item.name, qty: 0, value: 0 };
      row.qty += item.quantity;
      row.value += item.lineTotal;
      if (item.name) row.name = item.name;
      if (item.sku) row.sku = item.sku;
      productMap.set(id, row);
    }
  }

  const topProducts = [...productMap.values()].sort((left, right) => {
    if (right.qty !== left.qty) return right.qty - left.qty;
    return right.value - left.value;
  });

  return {
    example: false,
    orders: lines,
    truncated: Boolean(options.truncated),
    scanned: options.scanned ?? orders.length,
    totals: {
      recorded: lines.length,
      activeOrders,
      activeValue,
      completedOrders,
      completedValue,
      pendingOrders,
      qty,
    },
    byStatus,
    topProducts: topProducts.slice(0, 8),
    perDay: [...dayMap.values()].sort((left, right) => right.date.localeCompare(left.date)),
  };
}

function purchaseRoleLabel(email: string, role: string | null): string {
  if (isMasterAdminEmail(email)) return 'Master Admin';
  if (!role) return 'Peran saat pembelian tidak tersimpan';
  return accountRoleLabel(role, role === 'admin');
}

function orderDay(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '';
  return jakartaDate(new Date(time));
}

export function purchaseExportSheets(summary: PurchaseSummary): { orders: string[][]; lines: string[][] } {
  const banner = summary.example ? ['CONTOH — bukan data toko'] : [];
  const orders: string[][] = [
    ...(banner.length ? [banner] : []),
    ['Tanggal', 'ID', 'Nama', 'Email', 'Peran saat ini', 'Telepon', 'Status', 'Jumlah item', 'Total', 'Catatan', 'Item'],
  ];
  const lines: string[][] = [
    ...(banner.length ? [banner] : []),
    ['ID pesanan', 'SKU', 'Nama produk', 'Qty', 'Harga satuan', 'Total baris'],
  ];
  for (const order of summary.orders) {
    orders.push([
      order.createdAt,
      order.id,
      order.customerName,
      order.customerEmail,
      order.roleLabel,
      order.customerPhone,
      ORDER_STATUS_LABEL[order.status],
      String(order.itemCount),
      String(order.total),
      order.note,
      order.items.map((item) => `${item.sku} x${item.quantity}`).join(', '),
    ]);
    for (const item of order.items) {
      lines.push([
        order.id,
        item.sku,
        item.name,
        String(item.quantity),
        String(item.unitPrice),
        String(item.lineTotal),
      ]);
    }
  }
  return { orders, lines };
}

export function buildExampleVisitReport(
  today: string,
  range?: { start: string; end: string }
): VisitClickReport {
  const yesterday = addDays(today, -1);
  const grosir: AnalyticsIdentity = {
    uid: 'contohGrosir',
    email: 'contoh.grosir@example.com',
    name: 'Contoh Toko Maju',
    role: 'grosir',
  };
  const endUser: AnalyticsIdentity = {
    uid: 'contohEndUser',
    email: 'contoh.enduser@example.com',
    name: 'Contoh End User',
    role: 'end_user',
  };
  const seenToday = new Date(`${today}T09:30:00+07:00`).toISOString();
  const seenYesterday = new Date(`${yesterday}T16:10:00+07:00`).toISOString();
  const grosirToday = materializeHit(
    [
      { type: 'visit' },
      { type: 'page', page: 'home' },
      { type: 'page', page: 'search' },
      { type: 'click', click: 'search' },
      { type: 'page', page: 'promo' },
      { type: 'click', click: 'promo_open' },
      { type: 'click', click: 'product_view' },
      { type: 'product', metric: 'views', product: { id: 'ACC-ANK-001', sku: 'ACC-ANK-001', name: 'Anker 511 Nano' } },
      { type: 'click', click: 'add_to_cart' },
      { type: 'product', metric: 'carts', product: { id: 'ACC-ANK-001', sku: 'ACC-ANK-001', name: 'Anker 511 Nano' } },
    ],
    grosir,
    { date: today, seen: seenToday }
  );
  const endToday = materializeHit(
    [
      { type: 'visit' },
      { type: 'page', page: 'home' },
      { type: 'page', page: 'focus' },
      { type: 'click', click: 'product_view' },
      { type: 'product', metric: 'views', product: { id: 'ACC-BAS-014', sku: 'ACC-BAS-014', name: 'Baseus Kabel Type-C' } },
      { type: 'click', click: 'whatsapp_checkout' },
      { type: 'click', click: 'order' },
      { type: 'product', metric: 'orders', product: { id: 'ACC-ANK-001', sku: 'ACC-ANK-001', name: 'Anker 511 Nano' } },
    ],
    endUser,
    { date: today, seen: new Date(`${today}T11:05:00+07:00`).toISOString() }
  );
  const grosirYesterday = materializeHit(
    [
      { type: 'visit' },
      { type: 'page', page: 'home' },
      { type: 'page', page: 'bestseller' },
      { type: 'click', click: 'product_view' },
      { type: 'product', metric: 'views', product: { id: 'ACC-BAS-014', sku: 'ACC-BAS-014', name: 'Baseus Kabel Type-C' } },
    ],
    grosir,
    { date: yesterday, seen: seenYesterday, pagesSeen: ['home'] }
  );
  const report = summarizeDays(
    [
      { id: `${today}_contohGrosir`, fields: grosirToday },
      { id: `${today}_contohEndUser`, fields: endToday },
      { id: `${yesterday}_contohGrosir`, fields: grosirYesterday },
    ],
    range ?? { start: addDays(today, -6), end: today }
  );
  return { ...report, example: true };
}

export function examplePurchaseOrders(today: string): { orders: Order[]; roles: Map<string, string> } {
  const yesterday = addDays(today, -1);
  const orders: Order[] = [
    {
      id: 'ORD-CONTOH-1',
      userId: 'contohGrosir',
      customerName: 'Contoh Toko Maju',
      customerEmail: 'contoh.grosir@example.com',
      customerPhone: '081200000001',
      items: [
        { productId: 'ACC-ANK-001', sku: 'ACC-ANK-001', name: 'Anker 511 Nano', unitPrice: 199000, quantity: 2, lineTotal: 398000 },
        { productId: 'ACC-BAS-014', sku: 'ACC-BAS-014', name: 'Baseus Kabel Type-C', unitPrice: 45000, quantity: 1, lineTotal: 45000 },
      ],
      itemCount: 3,
      subtotal: 443000,
      total: 443000,
      status: 'pending',
      note: 'CONTOH — checkout WhatsApp, belum tentu dibayar',
      createdAt: new Date(`${today}T10:15:00+07:00`).toISOString(),
      updatedAt: new Date(`${today}T10:15:00+07:00`).toISOString(),
    },
    {
      id: 'ORD-CONTOH-2',
      userId: 'contohEndUser',
      customerName: 'Contoh End User',
      customerEmail: 'contoh.enduser@example.com',
      customerPhone: '081200000002',
      items: [
        { productId: 'ACC-ANK-001', sku: 'ACC-ANK-001', name: 'Anker 511 Nano', unitPrice: 259000, quantity: 1, lineTotal: 259000 },
      ],
      itemCount: 1,
      subtotal: 259000,
      total: 259000,
      status: 'completed',
      note: 'CONTOH — ditandai selesai oleh admin',
      createdAt: new Date(`${today}T11:20:00+07:00`).toISOString(),
      updatedAt: new Date(`${today}T12:00:00+07:00`).toISOString(),
    },
    {
      id: 'ORD-CONTOH-3',
      userId: 'contohGrosir',
      customerName: 'Contoh Toko Maju',
      customerEmail: 'contoh.grosir@example.com',
      customerPhone: '081200000001',
      items: [
        { productId: 'ACC-BAS-014', sku: 'ACC-BAS-014', name: 'Baseus Kabel Type-C', unitPrice: 45000, quantity: 4, lineTotal: 180000 },
      ],
      itemCount: 4,
      subtotal: 180000,
      total: 180000,
      status: 'cancelled',
      note: 'CONTOH — dibatalkan',
      createdAt: new Date(`${yesterday}T15:00:00+07:00`).toISOString(),
      updatedAt: new Date(`${yesterday}T18:00:00+07:00`).toISOString(),
    },
  ];
  const roles = new Map<string, string>([
    ['contohGrosir', 'grosir'],
    ['contohEndUser', 'end_user'],
  ]);
  return { orders, roles };
}

export function buildExamplePurchaseReport(today: string): PurchaseSummary {
  const { orders, roles } = examplePurchaseOrders(today);
  const summary = summarizePurchases(orders, roles, { status: 'all', customer: '' });
  return { ...summary, example: true };
}
