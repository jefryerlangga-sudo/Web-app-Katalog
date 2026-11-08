import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './config';
import { UserProfile } from '../types/product';
import { isMasterAdminUser } from '../config/app';

const COLLECTION = 'users';

function clip(value: string | null | undefined, max: number): string {
  return String(value || '').trim().slice(0, max);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    if (!snap.exists()) return null;
    return { uid, ...(snap.data() as Omit<UserProfile, 'uid'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${uid}`);
  }
}

/**
 * Creates users/{uid} as role customer, or refreshes display fields.
 * Never writes role admin. Master access is the verified email in rules, not this field.
 */
export async function ensureUserProfile(user: User): Promise<UserProfile> {
  if (!user.email) {
    throw new Error('Akun tanpa email tidak didukung');
  }

  const ref = doc(db, COLLECTION, user.uid);
  const now = new Date().toISOString();
  const email = clip(user.email, 120);
  const displayName = clip(user.displayName || email.split('@')[0] || 'Pelanggan', 120) || 'Pelanggan';
  const photoURL = clip(user.photoURL, 500);

  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      const data = existing.data() as Partial<UserProfile>;
      await updateDoc(ref, {
        email,
        displayName,
        photoURL,
        updatedAt: now,
      });
      return {
        uid: user.uid,
        email,
        displayName,
        photoURL,
        role: 'customer',
        phone: typeof data.phone === 'string' ? data.phone : '',
        createdAt: typeof data.createdAt === 'string' ? data.createdAt : now,
        updatedAt: now,
      };
    }

    const created: UserProfile = {
      uid: user.uid,
      email,
      displayName,
      photoURL,
      role: 'customer',
      phone: '',
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(ref, created);
    return created;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTION}/${user.uid}`);
  }
}

export async function updateCustomerPhone(uid: string, phone: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, uid), {
      phone,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${uid}`);
  }
}

export function resolveIsAdmin(user: User | null): boolean {
  return isMasterAdminUser(user);
}
