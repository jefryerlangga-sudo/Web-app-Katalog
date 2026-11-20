import { useEffect, useRef } from 'react';
import { isApprovedAccountRole } from '../config/accountRole';
import { useCatalog } from '../context/CatalogContext';
import {
  flushAnalytics,
  noteAnalyticsSession,
  setAnalyticsIdentity,
  trackAnalyticsPage,
  trackSearch,
} from '../firebase/analyticsClient';

/** Records the signed-in session, tab views, and searches. Checkout and cart clicks are recorded at the action. */
export function AnalyticsBinder() {
  const { user, userProfile, isAdmin, currentTab, filters, gate } = useCatalog();
  const searches = useRef(new Set<string>());

  useEffect(() => {
    if (gate !== 'ready' || !user?.email) {
      setAnalyticsIdentity(null);
      return;
    }
    const role = isAdmin ? 'admin' : userProfile?.role;
    if (!role || (!isAdmin && !isApprovedAccountRole(role))) {
      setAnalyticsIdentity(null);
      return;
    }
    setAnalyticsIdentity({
      uid: user.uid,
      email: user.email,
      name: user.displayName || userProfile?.displayName || 'Pelanggan',
      role,
    });
    noteAnalyticsSession();
  }, [gate, user, userProfile, isAdmin]);

  useEffect(() => {
    if (gate !== 'ready') return;
    trackAnalyticsPage(currentTab);
  }, [currentTab, gate]);

  useEffect(() => {
    if (gate !== 'ready') return;
    const query = filters.searchQuery.trim().toLowerCase();
    if (query.length < 2) return;
    const handle = window.setTimeout(() => {
      if (searches.current.has(query)) return;
      searches.current.add(query);
      trackSearch();
    }, 800);
    return () => window.clearTimeout(handle);
  }, [filters.searchQuery, gate]);

  useEffect(() => {
    const flush = () => {
      void flushAnalytics();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  return null;
}
