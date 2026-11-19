import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './config';
import {
  AssignableAccountRole,
  isStoredAccountRole,
} from '../config/accountRole';
import { UserProfile, UserRole } from '../types/product';
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

function storedRole(value: unknown): UserRole {
  return isStoredAccountRole(value) ? value : 'pending';
}

/**
 * Creates users/{uid} as pending, or refreshes display fields.
 * Never writes role admin and never changes an existing role.
 * Master access is the verified email in rules, not this field.
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
        role: storedRole(data.role),
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
      role: 'pending',
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

export async function setUserRole(uid: string, role: AssignableAccountRole): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, uid), {
      role,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${uid}`);
  }
}

export function subscribeToUsers(
  onData: (users: UserProfile[]) => void,
  onError: (error: Error) => void
): () => void {
  return onSnapshot(
    collection(db, COLLECTION),
    (snapshot) => {
      const users = snapshot.docs.map((entry) => {
        const data = entry.data() as Partial<UserProfile>;
        return {
          uid: entry.id,
          email: typeof data.email === 'string' ? data.email : '',
          displayName: typeof data.displayName === 'string' ? data.displayName : '',
          photoURL: typeof data.photoURL === 'string' ? data.photoURL : '',
          role: storedRole(data.role),
          phone: typeof data.phone === 'string' ? data.phone : '',
          createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
        };
      });
      onData(users);
    },
    (error) => onError(error)
  );
}

export function resolveIsAdmin(user: User | null): boolean {
  return isMasterAdminUser(user);
}
