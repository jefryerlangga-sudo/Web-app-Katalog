import { collection, doc, getDocs, limit, orderBy, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { ORDER_ITEM_BATCH } from '../config/app';
import { db, handleFirestoreError, OperationType } from './config';
import { CartItem, Order, OrderItem, OrderStatus, Product } from '../types/product';
import {
  normalizeCustomerEmail,
  normalizeCustomerName,
  normalizeNote,
  normalizePhone,
  presentOrder,
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
  const items = priced.items;
  const header = {
    userId: input.userId,
    customerName: normalizeCustomerName(input.customerName),
    customerEmail: normalizeCustomerEmail(input.customerEmail),
    customerPhone: normalizePhone(input.customerPhone),
    lineCount: items.length,
    productIds: items.map((item) => item.productId),
    itemCount: priced.itemCount,
    subtotal: priced.subtotal,
    total: priced.total,
    status: 'pending' as const,
    note: normalizeNote(input.note),
    createdAt: now,
    updatedAt: now,
  };
  const order: Order = { id, ...header, items };

  try {
    await setDoc(doc(db, COLLECTION, id), header);
    for (let index = 0; index < items.length; index += ORDER_ITEM_BATCH) {
      const batch = writeBatch(db);
      items.slice(index, index + ORDER_ITEM_BATCH).forEach((item, offset) => {
        batch.set(doc(db, COLLECTION, id, 'items', String(index + offset)), linePayload(input.userId, item));
      });
      await batch.commit();
    }
    return order;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTION}/${id}`);
  }
}

function linePayload(userId: string, item: OrderItem) {
  return {
    userId,
    productId: item.productId,
    sku: item.sku,
    name: item.name,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
  };
}

function orderFromDoc(id: string, data: Omit<Order, 'id'>): Order {
  return {
    id,
    ...data,
    items: Array.isArray(data.items) ? data.items : [],
  };
}

async function withOrderLines(order: Order, reader: 'owner' | 'admin'): Promise<Order> {
  if (order.items.length > 0) return order;
  const items = collection(db, COLLECTION, order.id || '', 'items');
  // A customer query has to filter by userId. Rules are not a filter.
  const snap = await getDocs(reader === 'owner' ? query(items, where('userId', '==', order.userId)) : items);
  const lines = snap.docs
    .slice()
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map((entry) => {
      const data = entry.data();
      return {
        productId: String(data.productId || entry.id),
        sku: String(data.sku ?? ''),
        name: String(data.name ?? ''),
        unitPrice: Number(data.unitPrice ?? 0),
        quantity: Number(data.quantity ?? 0),
        lineTotal: Number(data.lineTotal ?? 0),
      };
    });
  return presentOrder(order, lines);
}

export async function listMyOrders(userId: string): Promise<Order[]> {
  try {
    const q = query(collection(db, COLLECTION), where('userId', '==', userId), limit(50));
    const snap = await getDocs(q);
    const orders = snap.docs
      .map((entry) => orderFromDoc(entry.id, entry.data() as Omit<Order, 'id'>))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return Promise.all(orders.map((order) => withOrderLines(order, 'owner')));
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
    const orders = snap.docs.map((entry) => orderFromDoc(entry.id, entry.data() as Omit<Order, 'id'>));
    const page = orders.length > 200 ? orders.slice(0, 200) : orders;
    return { orders: await Promise.all(page.map((order) => withOrderLines(order, 'admin'))), truncated: orders.length > 200 };
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
