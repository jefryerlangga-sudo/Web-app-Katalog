import { collection, doc, getDocs, limit, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import { CartItem, Order, OrderStatus, Product } from '../types/product';
import {
  normalizeCustomerEmail,
  normalizeCustomerName,
  normalizeNote,
  normalizePhone,
  priceCart,
} from './orderPricing';

const COLLECTION = 'orders';

export async function createOrder(input: {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  cart: CartItem[];
  catalog: Product[];
  note?: string;
}): Promise<Order> {
  const priced = priceCart(input.cart, input.catalog);
  const now = new Date().toISOString();
  const id = `ORD-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const order: Order = {
    id,
    userId: input.userId,
    customerName: normalizeCustomerName(input.customerName),
    customerEmail: normalizeCustomerEmail(input.customerEmail),
    customerPhone: normalizePhone(input.customerPhone),
    items: priced.items,
    itemCount: priced.itemCount,
    subtotal: priced.subtotal,
    total: priced.total,
    status: 'pending',
    note: normalizeNote(input.note),
    createdAt: now,
    updatedAt: now,
  };

  const { id: _omit, ...payload } = order;
  try {
    await setDoc(doc(db, COLLECTION, id), payload);
    return order;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTION}/${id}`);
  }
}

export async function listMyOrders(userId: string): Promise<Order[]> {
  try {
    const q = query(collection(db, COLLECTION), where('userId', '==', userId), limit(50));
    const snap = await getDocs(q);
    return snap.docs
      .map((entry) => ({ id: entry.id, ...(entry.data() as Omit<Order, 'id'>) }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
}

/** Admin history. One range query, capped so a report cannot read the whole collection. */
export async function listOrdersBetween(
  startIso: string,
  endIso: string,
  max = 201
): Promise<{ orders: Order[]; truncated: boolean }> {
  try {
    const rows = query(
      collection(db, COLLECTION),
      where('createdAt', '>=', startIso),
      where('createdAt', '<=', endIso),
      orderBy('createdAt', 'desc'),
      limit(max)
    );
    const snap = await getDocs(rows);
    const orders = snap.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<Order, 'id'>) }));
    const truncated = orders.length > 200;
    return { orders: truncated ? orders.slice(0, 200) : orders, truncated };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, orderId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${orderId}`);
  }
}

export { buildWhatsAppOrderLink, formatWhatsAppLink } from './whatsappLink';
