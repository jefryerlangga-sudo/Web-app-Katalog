/**
 * Visit and click writes from the signed-in browser.
 * Trade-off: a Vercel function would still present the caller's ID token, so
 * Firestore rules would have to allow the same write. The function would add a
 * token lookup on every flush and would not remove the rules read of users/{uid}
 * for customers. The browser appends at most 8 events onto the caller's own
 * day document, with no read of that document. Rules read users/{uid} once per
 * flush for a non-admin. The master admin token matches without that read.
 */
import { arrayUnion, doc, setDoc } from 'firebase/firestore';
import {
  type AnalyticsIdentity,
  type AnalyticsWriteBody,
  type PageKey,
  type ProductRef,
  isPageKey,
} from '../lib/analyticsAggregate.ts';
import { createAnalyticsQueue, type AnalyticsQueue } from '../lib/analyticsQueue.ts';
import { db } from './config';

const COLLECTION = 'analyticsHits';

async function commitBody(body: AnalyticsWriteBody): Promise<void> {
  if (body.events.length === 0) return;
  await setDoc(
    doc(db, COLLECTION, `${body.date}_${body.uid}`),
    {
      date: body.date,
      uid: body.uid,
      email: body.email,
      name: body.name,
      role: body.role,
      seen: body.seen,
      pages: body.pages,
      events: arrayUnion(...body.events),
    },
    { merge: true }
  );
}

let queue: AnalyticsQueue | null = null;

function getQueue(): AnalyticsQueue {
  if (!queue) {
    queue = createAnalyticsQueue({
      commit: commitBody,
      local: window.localStorage,
      session: window.sessionStorage,
      onError: (error) => {
        console.warn('Laporan kunjungan tidak tersimpan', error);
      },
    });
  }
  return queue;
}

export function setAnalyticsIdentity(identity: AnalyticsIdentity | null): void {
  getQueue().setIdentity(identity);
}

export function noteAnalyticsSession(): void {
  getQueue().noteSession();
}

export function flushAnalytics(): Promise<void> {
  return getQueue().flush();
}

export function trackAnalyticsPage(tab: string): void {
  if (!isPageKey(tab)) return;
  const current = getQueue();
  current.track({ type: 'page', page: tab as PageKey });
  if (tab === 'promo') current.track({ type: 'click', click: 'promo_open' });
}

export function trackProductOpen(product: ProductRef): void {
  const current = getQueue();
  current.track({ type: 'click', click: 'product_view' });
  current.track({ type: 'product', metric: 'views', product });
}

export function trackAddToCart(product: ProductRef): void {
  const current = getQueue();
  current.track({ type: 'click', click: 'add_to_cart' });
  current.track({ type: 'product', metric: 'carts', product });
}

export function trackSearch(): void {
  getQueue().track({ type: 'click', click: 'search' });
}

export function trackCheckout(items: ProductRef[], openedWhatsApp: boolean): void {
  const current = getQueue();
  current.track({ type: 'click', click: 'order' });
  if (openedWhatsApp) current.track({ type: 'click', click: 'whatsapp_checkout' });
  for (const product of items) current.track({ type: 'product', metric: 'orders', product });
  void current.flush();
}
