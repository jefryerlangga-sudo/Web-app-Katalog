import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  EMPTY_ACTIVITY_NOTE,
  MAX_EVENTS_PER_WRITE,
  MAX_ORDERS_PER_REPORT,
  MAX_RANGE_DAYS,
  PURCHASE_GAP_NOTE,
  addDays,
  buildExamplePurchaseReport,
  buildExampleVisitReport,
  buildHitWrites,
  examplePurchaseOrders,
  formatJakarta,
  inclusiveDays,
  jakartaDate,
  jakartaDayBounds,
  materializeHit,
  purchaseExportSheets,
  resolveDateRange,
  safeProductId,
  summarizeDays,
  summarizePurchases,
} from '../src/lib/analyticsAggregate.ts';
import { createAnalyticsQueue, type KeyValueStore } from '../src/lib/analyticsQueue.ts';
import type { AnalyticsEvent, AnalyticsIdentity, AnalyticsWriteBody } from '../src/lib/analyticsAggregate.ts';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const FIXED = new Date('2026-11-20T02:00:00.000Z');
const person: AnalyticsIdentity = {
  uid: 'user1',
  email: 'toko@example.com',
  name: 'Toko A',
  role: 'grosir',
};

function memory(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

test('Jakarta day rolls at 17:00 UTC and order bounds stay inside that day', () => {
  assert.equal(jakartaDate(new Date('2026-11-20T16:59:00.000Z')), '2026-11-20');
  assert.equal(jakartaDate(new Date('2026-11-20T17:30:00.000Z')), '2026-11-21');
  assert.equal(jakartaDate(FIXED), '2026-11-20');
  const bounds = jakartaDayBounds('2026-11-20', '2026-11-20');
  assert.equal(bounds.startIso, '2026-11-19T17:00:00.000Z');
  assert.equal(bounds.endIso, '2026-11-20T16:59:59.999Z');
  assert.equal(addDays('2026-11-20', -6), '2026-11-14');
  assert.equal(inclusiveDays('2026-11-14', '2026-11-20'), 7);
});

test('date presets are today, 7 days, 30 days, and a 62-day custom cap', () => {
  const today = resolveDateRange({ preset: 'today', now: FIXED });
  assert.deepEqual([today.start, today.end, today.capped], ['2026-11-20', '2026-11-20', false]);
  const week = resolveDateRange({ preset: '7d', now: FIXED });
  assert.equal(inclusiveDays(week.start, week.end), 7);
  const month = resolveDateRange({ preset: '30d', now: FIXED });
  assert.equal(inclusiveDays(month.start, month.end), 30);
  const swapped = resolveDateRange({
    preset: 'custom',
    now: FIXED,
    customStart: '2026-11-20',
    customEnd: '2026-11-18',
  });
  assert.deepEqual([swapped.start, swapped.end], ['2026-11-18', '2026-11-20']);
  const long = resolveDateRange({
    preset: 'custom',
    now: FIXED,
    customStart: '2026-01-01',
    customEnd: '2026-11-20',
  });
  assert.equal(long.capped, true);
  assert.equal(inclusiveDays(long.start, long.end), MAX_RANGE_DAYS);
  assert.equal(long.end, '2026-11-20');
});

test('a burst is split into writes of at most 8 events', () => {
  const events: AnalyticsEvent[] = [
    { type: 'visit' },
    ...Array.from({ length: MAX_EVENTS_PER_WRITE }, () => ({ type: 'page' as const, page: 'home' as const })),
  ];
  const writes = buildHitWrites(events, person, { date: '2026-11-20', seen: '2026-11-20T03:00:00.000Z' });
  assert.equal(writes.length, 2);
  assert.equal(writes[0].events.length, MAX_EVENTS_PER_WRITE);
  assert.equal(writes[1].events.length, 1);
  assert.equal(writes[0].events.filter((event) => event.startsWith('v#')).length, 1);
  assert.equal(writes[1].events.some((event) => event.startsWith('v#')), false);
  assert.equal(safeProductId('sku dengan spasi'), 'sku_dengan_spasi');
});

test('one flush batches a visit, pages, and clicks into a single increment body', async () => {
  const commits: AnalyticsWriteBody[] = [];
  const queue = createAnalyticsQueue({
    commit: async (body) => {
      commits.push(body);
    },
    local: memory(),
    session: memory(),
    now: () => FIXED,
    autoFlush: false,
  });
  queue.setIdentity(person);
  queue.noteSession();
  queue.track({ type: 'page', page: 'home' });
  queue.track({ type: 'page', page: 'promo' });
  queue.track({ type: 'click', click: 'promo_open' });
  queue.track({ type: 'click', click: 'search' });
  queue.track({
    type: 'product',
    metric: 'views',
    product: { id: 'ACC-1', sku: 'ACC-1', name: 'Kabel' },
  });
  await queue.flush();
  assert.equal(commits.length, 1);
  assert.equal(commits[0].date, '2026-11-20');
  assert.equal(commits[0].uid, 'user1');
  assert.equal(commits[0].email, 'toko@example.com');
  assert.equal(commits[0].role, 'grosir');
  assert.equal(commits[0].events.length, 6);
  assert.equal(commits[0].events.some((event) => event.startsWith('v#')), true);
  assert.equal(commits[0].events.some((event) => event.startsWith('g#home#')), true);
  assert.equal(commits[0].events.some((event) => event.startsWith('g#promo#')), true);
  assert.equal(commits[0].events.some((event) => event.startsWith('c#promo_open#')), true);
  assert.equal(commits[0].events.some((event) => event.startsWith('c#search#')), true);
  assert.equal(commits[0].events.some((event) => event.startsWith('m#views#ACC-1#')), true);
  assert.match(commits[0].pages, /home/);
  assert.match(commits[0].pages, /promo/);

  queue.noteSession();
  queue.track({ type: 'page', page: 'cart' });
  await queue.flush();
  assert.equal(commits.length, 2);
  assert.equal(commits[1].events.some((event) => event.startsWith('v#')), false);
  assert.equal(commits[1].events.some((event) => event.startsWith('g#cart#')), true);
  assert.match(commits[1].pages, /home/);
});

test('a failed flush keeps the visit so the next flush can retry it', async () => {
  const commits: AnalyticsWriteBody[] = [];
  let fail = true;
  const queue = createAnalyticsQueue({
    commit: async (body) => {
      if (fail) throw new Error('Missing or insufficient permissions.');
      commits.push(body);
    },
    local: memory(),
    session: memory(),
    now: () => FIXED,
    autoFlush: false,
  });
  queue.setIdentity(person);
  queue.noteSession();
  await queue.flush();
  assert.equal(commits.length, 0);
  fail = false;
  await queue.flush();
  assert.equal(commits.length, 1);
  assert.equal(commits[0].events.some((event) => event.startsWith('v#')), true);
});

test('user-day documents merge visitors, pages, and product clicks', () => {
  const seen = '2026-11-20T03:00:00.000Z';
  const first = materializeHit(
    [
      { type: 'visit' },
      { type: 'page', page: 'home' },
      { type: 'click', click: 'product_view' },
      { type: 'product', metric: 'views', product: { id: 'ACC-1', sku: 'ACC-1', name: 'Kabel' } },
      { type: 'click', click: 'add_to_cart' },
      { type: 'product', metric: 'carts', product: { id: 'ACC-1', sku: 'ACC-1', name: 'Kabel' } },
    ],
    person,
    { date: '2026-11-20', seen }
  );
  const second = materializeHit(
    [
      { type: 'visit' },
      { type: 'page', page: 'search' },
      { type: 'click', click: 'search' },
    ],
    { uid: 'user2', email: 'b@example.com', name: 'Toko B', role: 'end_user' },
    { date: '2026-11-20', seen: '2026-11-20T06:00:00.000Z' }
  );
  const report = summarizeDays(
    [
      { id: '2026-11-20_user1', fields: first },
      { id: '2026-11-20_user2', fields: second },
    ],
    { start: '2026-11-20', end: '2026-11-20' }
  );
  assert.equal(report.example, false);
  assert.equal(report.totals.visits, 2);
  assert.equal(report.totals.people, 2);
  assert.equal(report.totals.pages.home, 1);
  assert.equal(report.totals.pages.search, 1);
  assert.equal(report.totals.clicksByType.product_view, 1);
  assert.equal(report.totals.clicksByType.add_to_cart, 1);
  assert.equal(report.totals.clicksByType.search, 1);
  assert.equal(report.topProducts[0].id, 'ACC-1');
  assert.equal(report.topProducts[0].views, 1);
  assert.equal(report.topProducts[0].carts, 1);
  assert.equal(report.visitors[0].uid, 'user2');
  assert.equal(report.visitors[0].role, 'end_user');
  assert.equal(formatJakarta('2026-11-20T03:00:00.000Z').includes('2026'), true);
});

test('example visit and purchase reports are labeled and keep cancelled orders out of the active total', () => {
  const today = '2026-11-20';
  const visits = buildExampleVisitReport(today);
  assert.equal(visits.example, true);
  assert.equal(visits.totals.visits, 3);
  assert.equal(visits.totals.people, 2);
  assert.equal(visits.totals.clicksByType.whatsapp_checkout, 1);
  assert.equal(visits.totals.clicksByType.order, 1);
  assert.equal(visits.totals.clicksByType.promo_open, 1);
  assert.equal(visits.topProducts.find((product) => product.id === 'ACC-ANK-001')?.orders, 1);
  const todayOnly = buildExampleVisitReport(today, { start: today, end: today });
  assert.equal(todayOnly.totals.visits, 2);

  const purchases = buildExamplePurchaseReport(today);
  assert.equal(purchases.example, true);
  assert.equal(purchases.totals.recorded, 3);
  assert.equal(purchases.totals.activeOrders, 2);
  assert.equal(purchases.totals.activeValue, 443000 + 259000);
  assert.equal(purchases.totals.completedValue, 259000);
  assert.equal(purchases.totals.pendingOrders, 1);
  assert.equal(purchases.totals.qty, 4);
  assert.equal(purchases.byStatus.cancelled.value, 180000);
  assert.equal(purchases.topProducts[0].id, 'ACC-ANK-001');
  assert.equal(purchases.topProducts[0].qty, 3);
  assert.equal(purchases.orders.find((order) => order.id === 'ORD-CONTOH-1')?.roleLabel, 'Akun Grosir');
  assert.equal(purchases.orders.find((order) => order.id === 'ORD-CONTOH-2')?.roleLabel, 'Akun End User');
  assert.match(PURCHASE_GAP_NOTE, /Menunggu/);
  assert.match(EMPTY_ACTIVITY_NOTE, /tidak mencakup masa sebelumnya/);

  const filtered = summarizePurchases(
    examplePurchaseOrders(today).orders,
    examplePurchaseOrders(today).roles,
    { status: 'completed', customer: 'end user' }
  );
  assert.equal(filtered.orders.length, 1);
  assert.equal(filtered.orders[0].id, 'ORD-CONTOH-2');
  const sheets = purchaseExportSheets(purchases);
  assert.equal(sheets.orders[0][0], 'CONTOH — bukan data toko');
  assert.equal(sheets.lines[1][0], 'ID pesanan');
  assert.equal(sheets.orders.length, 1 + 1 + purchases.orders.length);
  assert.equal(MAX_ORDERS_PER_REPORT, 200);
});

test('firestore rules lock analytics to the caller day document and admin reads', () => {
  assert.match(rules, /match \/analyticsHits\/\{hitId\}/);
  assert.match(rules, /allow get, list: if isVerifiedMasterAdmin\(\);/);
  assert.match(rules, /isApprovedBuyer\(\) && analyticsHitOk\(hitId\)/);
  assert.match(rules, /allow read, write: if false/);
  assert.match(rules, /afterEvents\.size\(\) <= beforeEvents\.size\(\) \+ 8/);
  assert.equal(rules.includes('wholesalePrice'), true);
  const analyticsBlock = rules.slice(rules.indexOf('function analyticsRoleOk'), rules.indexOf('match /admins/'));
  assert.equal(analyticsBlock.includes('wholesalePrice'), false);
  const [body] = buildHitWrites([{ type: 'visit' }, { type: 'page', page: 'home' }], person, {
    date: '2026-11-20',
    seen: '2026-11-20T03:00:00.000Z',
  });
  assert.equal(body.events.length, 2);
  assert.equal(body.uid, 'user1');
});
