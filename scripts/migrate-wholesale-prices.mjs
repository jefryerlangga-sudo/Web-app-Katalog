/**
 * Owner-only migration. This file does not run in CI and does not run on import.
 *
 * Dry-run (prints planned writes, changes nothing):
 *   npm install --no-save firebase-admin
 *   export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/service-account.json
 *   export FIREBASE_PROJECT_ID=sonic-drummer-br6mz
 *   export FIRESTORE_DATABASE_ID=<firestoreDatabaseId from firebase-applet-config.json>
 *   node scripts/migrate-wholesale-prices.mjs
 *
 * Write mode also requires:
 *   PORTALTECH_MIGRATE_CONFIRM=yes
 *
 * Do not commit the service account JSON.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);

const confirm = process.env.PORTALTECH_MIGRATE_CONFIRM === 'yes';
const projectId = process.env.FIREBASE_PROJECT_ID || '';
let databaseId = process.env.FIRESTORE_DATABASE_ID || '';

if (!databaseId) {
  try {
    const config = JSON.parse(readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));
    databaseId = String(config.firestoreDatabaseId || '');
  } catch {
    databaseId = '';
  }
}

if (!projectId || !databaseId) {
  console.error('Set FIREBASE_PROJECT_ID and FIRESTORE_DATABASE_ID before running.');
  process.exit(1);
}

if (confirm && !process.env.FIRESTORE_DATABASE_ID) {
  console.error('Write mode refuses the config-file default. Set FIRESTORE_DATABASE_ID explicitly.');
  process.exit(1);
}

let admin;
try {
  admin = require('firebase-admin');
} catch {
  console.error('Install the tool first: npm install --no-save firebase-admin');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId,
});

const { getFirestore } = require('firebase-admin/firestore');
const firestore = getFirestore(admin.app(), databaseId);

console.log(
  `${confirm ? 'WRITE' : 'DRY-RUN'} project=${projectId} database=${databaseId}`
);

const products = await firestore.collection('products').get();
let moved = 0;
for (const docSnap of products.docs) {
  const data = docSnap.data();
  if (!Object.prototype.hasOwnProperty.call(data, 'wholesalePrice')) continue;
  const wholesalePrice = data.wholesalePrice;
  if (typeof wholesalePrice !== 'number' || !Number.isFinite(wholesalePrice) || wholesalePrice < 0) {
    console.log(`SKIP ${docSnap.id}: wholesalePrice is not a non-negative number`);
    continue;
  }
  const updatedAt = new Date().toISOString();
  console.log(`${confirm ? 'MOVE' : 'PLAN'} ${docSnap.id} wholesalePrice=${wholesalePrice}`);
  if (confirm) {
    const batch = firestore.batch();
    batch.set(
      firestore.collection('productAdmin').doc(docSnap.id),
      { wholesalePrice, updatedAt },
      { merge: false }
    );
    batch.update(docSnap.ref, { wholesalePrice: admin.firestore.FieldValue.delete() });
    await batch.commit();
  }
  moved += 1;
}

console.log(`${confirm ? 'Moved' : 'Would move'} ${moved} product(s).`);
if (!confirm) {
  console.log('No documents were written. Re-run with PORTALTECH_MIGRATE_CONFIRM=yes to write.');
}
