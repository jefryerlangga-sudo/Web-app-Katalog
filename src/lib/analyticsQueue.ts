/**
 * In-memory queue. One flush becomes one or more sequential day-document writes.
 * The Firestore document is never read here.
 */
import {
  type AnalyticsEvent,
  type AnalyticsIdentity,
  type AnalyticsWriteBody,
  type PageKey,
  buildHitWrites,
  isPageKey,
  jakartaDate,
  safeUid,
} from './analyticsAggregate.ts';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface AnalyticsQueue {
  setIdentity(identity: AnalyticsIdentity | null): void;
  track(event: AnalyticsEvent): void;
  noteSession(): void;
  flush(): Promise<void>;
}

function pageStorageKey(uid: string, date: string): string {
  return `pt-pages:${uid}:${date}`;
}

function visitStorageKey(uid: string, date: string): string {
  return `pt-visit:${uid}:${date}`;
}

function readPages(store: KeyValueStore, uid: string, date: string): PageKey[] {
  const raw = store.getItem(pageStorageKey(uid, date)) || '';
  return raw.split(',').filter(isPageKey);
}

function rememberPage(store: KeyValueStore, uid: string, date: string, page: PageKey) {
  const pages = readPages(store, uid, date);
  if (pages.includes(page)) return;
  pages.push(page);
  store.setItem(pageStorageKey(uid, date), pages.join(','));
}

export function createAnalyticsQueue(deps: {
  commit: (body: AnalyticsWriteBody) => Promise<void>;
  local: KeyValueStore;
  session: KeyValueStore;
  now?: () => Date;
  autoFlush?: boolean;
  onError?: (error: unknown) => void;
}): AnalyticsQueue {
  const now = deps.now ?? (() => new Date());
  const queue: AnalyticsEvent[] = [];
  let identity: AnalyticsIdentity | null = null;
  let chain: Promise<void> = Promise.resolve();
  let visitQueuedFor = '';
  let timer: ReturnType<typeof setTimeout> | null = null;

  const usable = (value: AnalyticsIdentity | null): value is AnalyticsIdentity => {
    if (!value) return false;
    if (!safeUid(value.uid)) return false;
    if (!value.email.includes('@') || value.email.length > 120) return false;
    return true;
  };

  const schedule = () => {
    if (deps.autoFlush === false) return;
    if (timer) clearTimeout(timer);
    const wait = queue.length >= 12 ? 0 : 4000;
    timer = setTimeout(() => {
      timer = null;
      void api.flush();
    }, wait);
  };

  const flushNow = async () => {
    if (!usable(identity) || queue.length === 0) return;
    const profile = identity;
    const events = queue.splice(0, queue.length);
    const date = jakartaDate(now());
    const seen = now().toISOString();
    const bodies = buildHitWrites(events, profile, {
      date,
      seen,
      pagesSeen: readPages(deps.local, profile.uid, date),
    });
    const visitKey = visitStorageKey(profile.uid, date);
    try {
      for (const body of bodies) {
        await deps.commit(body);
        if (body.events.some((event) => event.startsWith('v#'))) deps.session.setItem(visitKey, '1');
      }
    } catch (error) {
      if (deps.session.getItem(visitKey) !== '1' && events.some((event) => event.type === 'visit')) {
        visitQueuedFor = '';
        if (!queue.some((event) => event.type === 'visit')) queue.unshift({ type: 'visit' });
      }
      deps.onError?.(error);
    }
  };

  const api: AnalyticsQueue = {
    setIdentity(next) {
      identity = usable(next) ? next : null;
      if (!identity) {
        queue.length = 0;
        visitQueuedFor = '';
      }
    },
    track(event) {
      if (!usable(identity)) return;
      if (event.type === 'page') rememberPage(deps.local, identity.uid, jakartaDate(now()), event.page);
      queue.push(event);
      schedule();
    },
    noteSession() {
      if (!usable(identity)) return;
      const date = jakartaDate(now());
      const key = visitStorageKey(identity.uid, date);
      if (visitQueuedFor === key || deps.session.getItem(key) === '1') return;
      visitQueuedFor = key;
      queue.push({ type: 'visit' });
      schedule();
    },
    flush() {
      chain = chain.then(flushNow, flushNow);
      return chain;
    },
  };

  return api;
}
