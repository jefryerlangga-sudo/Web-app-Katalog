/**
 * Admin report reads. One query returns at most 200 user-day documents.
 * Order history is a separate capped query. Account roles come from the
 * directory the admin screen already listens to, so this read does not list users again.
 */
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { MAX_ORDERS_PER_REPORT } from '../lib/analyticsAggregate.ts';
import { db, handleFirestoreError, OperationType } from './config';

export interface DayDocument {
  id: string;
  fields: Record<string, unknown>;
}

export async function listAnalyticsDays(start: string, end: string): Promise<DayDocument[]> {
  try {
    const days = query(
      collection(db, 'analyticsHits'),
      where('date', '>=', start),
      where('date', '<=', end),
      limit(MAX_ORDERS_PER_REPORT)
    );
    const snap = await getDocs(days);
    return snap.docs.map((entry) => ({
      id: entry.id,
      fields: entry.data() as Record<string, unknown>,
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'analyticsHits');
  }
}

