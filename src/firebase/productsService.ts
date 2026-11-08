import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { isMasterAdminUser } from '../config/app';
import { auth, db, handleFirestoreError, OperationType } from './config';
import { Product } from '../types/product';

const COLLECTION_NAME = 'products';

export const SAMPLE_PRODUCTS: Product[] = [
  // --- KATEGORI AKSESORIS HANDPHONE (SMARTPHONE ACCESSORIES) ---
  {
    sku: 'ACC-ANK-001',
    name: 'Anker 511 Nano GaN 30W Fast Charger Type-C',
    brand: 'Anker',
    category: 'Charger & Adapter',
    subcategory: 'Fast Charger GaN',
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80',
    specification: 'Teknologi GaN III, output 30W Power Delivery 3.0, PPS fast charging support, active temperature shield 2.0, 70% lebih ringkas dari charger standar.',
    compatibility: 'iPhone 13/14/15/16, Samsung Galaxy S23/S24/A55, iPad, Google Pixel, Xiaomi',
    sellingPoint1: 'Merk No.1 charging aksesoris di dunia dengan garansi resmi 18 bulan ganti baru.',
    sellingPoint2: 'Mengisi daya iPhone 50% hanya dalam 25 menit tanpa panas berlebih berkat GaN III.',
    sellingPoint3: 'Produk kelas premium dengan margin konter tebal (Rp 64.000 per unit) dan repeat buyer tinggi.',
    wholesalePrice: 135000,
    suggestedRetailPrice: 199000,
    stockStatus: 'In Stock',
    positioning: 'Best',
    targetCustomer: 'Konter HP mall, toko aksesoris premium, pengguna iPhone & Samsung flagship',
    isProductFocus: true,
    isBestSeller: true,
    crossSellNotes: 'Kabel Ugreen Type-C to C 100W (ACC-UGR-101), Pelindung Kabel Spiral',
    isActive: true,
  },
  {
    sku: 'ACC-BAS-002',
    name: 'Baseus Compact Quick Charger Dual Port 20W PD+QC',
    brand: 'Baseus',
    category: 'Charger & Adapter',
    subcategory: 'Dual Port Charger',
    imageUrl: 'https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=600&auto=format&fit=crop&q=80',
    specification: 'Dual Port (1x Type-C 20W PD + 1x USB-A 18W QC3.0), smart IC chip auto-detect voltage, multiple protection circuitry.',
    compatibility: 'Semua Smartphone (iPhone, Samsung, Xiaomi, Oppo, Vivo, Realme, Infinix)',
    sellingPoint1: 'Bisa charge 2 HP sekaligus (iPhone & Android) hanya dengan satu colokan adaptor.',
    sellingPoint2: 'Harga sangat terjangkau di bawah 100 ribu dengan kualitas sertifikasi multi-proteksi aman.',
    sellingPoint3: 'Item paling laris di konter pinggir jalan, perputaran stok sangat cepat.',
    wholesalePrice: 65000,
    suggestedRetailPrice: 99000,
    stockStatus: 'In Stock',
    positioning: 'Better',
    targetCustomer: 'Konter HP area kampus & perumahan, pengguna 2 device',
    isProductFocus: false,
    isBestSeller: true,
    crossSellNotes: 'Kabel Baseus Cafule Lightning (ACC-BAS-102), Kabel Type-C Robot',
    isActive: true,
  },
  {
    sku: 'ACC-ROB-003',
    name: 'Robot Dual Output Travel Charger RT-K6 2.4A',
    brand: 'Robot',
    category: 'Charger & Adapter',
    subcategory: 'Wall Charger Standar',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    specification: 'Output total 5V/2.4A dual USB-A, bahan PC fireproof casing, smart chip overcharge protection, pin plug standar Indonesia.',
    compatibility: 'Universal semua HP Android entry-level, earphone TWS, kipas portable, smartwatch',
    sellingPoint1: 'Harga modal sangat murah Rp 24.000, konter bisa jual Rp 45.000 (margin untung 47%).',
    sellingPoint2: 'Brand Robot sangat terkenal dan dipercaya konsumen kelas menengah ke bawah.',
    sellingPoint3: 'Garansi resmi 1 tahun ganti baru langsung dari distributor resmi.',
    wholesalePrice: 24000,
    suggestedRetailPrice: 45000,
    stockStatus: 'In Stock',
    positioning: 'Good',
    targetCustomer: 'Konter pulsa & aksesoris retail, warung HP pasar rakyat',
    isProductFocus: false,
    isBestSeller: true,
    crossSellNotes: 'Kabel Data Robot RDC100 (ACC-ROB-103), Micro USB Cable',
    isActive: true,
  },
  {
    sku: 'ACC-UGR-101',
    name: 'Ugreen Braided Nylon USB-C to USB-C 100W PD Cable (1M)',
    brand: 'Ugreen',
    category: 'Kabel Data & Charging',
    subcategory: 'Kabel Type-C Fast',
    imageUrl: 'https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?w=600&auto=format&fit=crop&q=80',
    specification: 'Support Power Delivery 100W (20V/5A), E-Marker intelligent chip, braided nylon high-durability 10.000x bend test, data transfer 480Mbps.',
    compatibility: 'iPhone 15/16 Series, Samsung Galaxy S24/S23, MacBook, iPad Pro, Xiaomi, Laptop Type-C',
    sellingPoint1: 'Support fast charging super cepat hingga 100W, bisa dipakai untuk HP flagship dan laptop.',
    sellingPoint2: 'Bahan braided nylon anti kusut dan anti putus dengan pelindung kepala alloy solid.',
    sellingPoint3: 'Canvasser Focus Item dengan promo bundling charger Anker.',
    wholesalePrice: 48000,
    suggestedRetailPrice: 75000,
    stockStatus: 'In Stock',
    positioning: 'Best',
    targetCustomer: 'Toko aksesoris HP perkotaan, pengguna gadget multi-device',
    isProductFocus: true,
    isBestSeller: true,
    crossSellNotes: 'Anker GaN 30W Charger (ACC-ANK-001), Cable Organizer Strap',
    isActive: true,
  },
  {
    sku: 'ACC-BAS-102',
    name: 'Baseus Cafule Lightning to USB Braided Cable 2.4A (1M)',
    brand: 'Baseus',
    category: 'Kabel Data & Charging',
    subcategory: 'Kabel iPhone Lightning',
    imageUrl: 'https://images.unsplash.com/photo-1596207891399-52e6f477d9c6?w=600&auto=format&fit=crop&q=80',
    specification: 'Kabel lightning 2.4A fast charging, TPE + nylon braided, reinforced joint connector, velcro strap included.',
    compatibility: 'iPhone 6/7/8/X/XS/XR/11/12/13/14 Series, iPad Mini/Air port Lightning',
    sellingPoint1: 'Anti-popup error iOS certified, konektor kepala kuat tidak mudah patah saat ditarik.',
    sellingPoint2: 'Solusi kabel awet pengganti kabel bawaan iPhone yang cepat sobek/kuning.',
    sellingPoint3: 'Item repeat order nomor 1 untuk pemilik iPhone generasi 11 hingga 14.',
    wholesalePrice: 32000,
    suggestedRetailPrice: 55000,
    stockStatus: 'In Stock',
    positioning: 'Better',
    targetCustomer: 'Konter HP dengan demografi pengguna iPhone pelajar & pekerja muda',
    isProductFocus: false,
    isBestSeller: true,
    crossSellNotes: 'Baseus 20W PD Dual Charger (ACC-BAS-002), Pelindung Ujung Kabel',
    isActive: true,
  },
  {
    sku: 'ACC-ROB-103',
    name: 'Robot Fast Charging Cable Type-C RDC100 2.4A (1M)',
    brand: 'Robot',
    category: 'Kabel Data & Charging',
    subcategory: 'Kabel Type-C Standar',
    imageUrl: 'https://images.unsplash.com/photo-1618424181497-157f25b6ddd5?w=600&auto=format&fit=crop&q=80',
    specification: 'Kabel PVC elastis tahan lekukan, tembaga murni oxygen-free, arus stabil 2.4A, transmisi data 480Mbps.',
    compatibility: 'Semua HP Android Type-C (Oppo, Vivo, Xiaomi, Samsung A-series, Infinix, Realme)',
    sellingPoint1: 'Modal super ekonomis cuma Rp 12.000, bisa dijual konter Rp 25.000 (margin di atas 50%!).',
    sellingPoint2: 'Kemasan toples mika display menarik untuk ditaruh langsung di etalase depan kasir konter.',
    sellingPoint3: 'Produk staple harian yang selalu dibeli konsumen saat kabel HP lamanya tertinggal atau rusak.',
    wholesalePrice: 12000,
    suggestedRetailPrice: 25000,
    stockStatus: 'In Stock',
    positioning: 'Good',
    targetCustomer: 'Konter pulsa harian, bengkel & tambal ban dengan etalase aksesoris',
    isProductFocus: false,
    isBestSeller: true,
    crossSellNotes: 'Robot Wall Charger RT-K6 (ACC-ROB-003)',
    isActive: true,
  },
  {
    sku: 'ACC-ANK-201',
    name: 'Anker Soundcore R50i True Wireless Earbuds TWS',
    brand: 'Anker',
    category: 'Audio & TWS Earbuds',
    subcategory: 'TWS Bluetooth Earbuds',
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
    specification: 'Driver 10mm dengan BassUp technology, 30 jam total playtime dengan casing, Bluetooth 5.3 low latency, IPX5 tahan air hujan & keringat, 2 mikrofon dengan AI noise clear call.',
    compatibility: 'Universal semua smartphone Bluetooth (iOS, Android, Windows, Mac)',
    sellingPoint1: 'Kualitas bass paling nendang dan jernih di kelasnya, rating 4.9 di marketplace.',
    sellingPoint2: 'Garansi resmi Anker 18 bulan ganti baru tanpa ribet servis.',
    sellingPoint3: 'Keuntungan margin konter Rp 84.000 per unit, sangat mudah dipasarkan ke anak muda.',
    wholesalePrice: 185000,
    suggestedRetailPrice: 269000,
    stockStatus: 'In Stock',
    positioning: 'Best',
    targetCustomer: 'Pecinta musik, rider ojol, pekerja kantor, gamer mobile',
    isProductFocus: true,
    isBestSeller: true,
    crossSellNotes: 'Silicone Case Cover Soundcore, Kabel Type-C Anker',
    isActive: true,
  },
  {
    sku: 'ACC-ROB-202',
    name: 'Robot Wireless Earbuds TWS Airbuds T10S Extra Bass',
    brand: 'Robot',
    category: 'Audio & TWS Earbuds',
    subcategory: 'TWS Budget Friendly',
    imageUrl: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=600&auto=format&fit=crop&q=80',
    specification: 'Dynamic driver 13mm, Bluetooth 5.3 koneksi stabil, baterai total 24 jam, sentuhan touch control, casing ergonomis semi-in-ear nyaman di telinga.',
    compatibility: 'Universal smartphone Android & iPhone',
    sellingPoint1: 'TWS berkualitas dengan harga eceran konter di bawah 130 ribu rupiah.',
    sellingPoint2: 'Bentuk semi-in-ear sangat nyaman dipakai berjam-jam tanpa sakit telinga.',
    sellingPoint3: 'Modal Rp 78.000 dengan margin laba Rp 47.000 bersih untuk pemilik konter.',
    wholesalePrice: 78000,
    suggestedRetailPrice: 125000,
    stockStatus: 'In Stock',
    positioning: 'Good',
    targetCustomer: 'Pelajar, ojek online, kasir konter HP',
    isProductFocus: false,
    isBestSeller: true,
    crossSellNotes: 'Kabel Charger Type-C Robot, Gantungan TWS',
    isActive: true,
  },
  {
    sku: 'ACC-BAS-301',
    name: 'Baseus Bipow Digital Display Powerbank 10000mAh 20W PD',
    brand: 'Baseus',
    category: 'Powerbank & Baterai',
    subcategory: 'Fast Charge Powerbank',
    imageUrl: 'https://images.unsplash.com/photo-1609592424075-802c6fa524bb?w=600&auto=format&fit=crop&q=80',
    specification: 'Kapasitas riil 10.000mAh (37Wh aman di pesawat/flight safe), LED digital display persentase baterai akurat, input/output Type-C 20W PD + 2x USB-A 18W QC3.0.',
    compatibility: 'iPhone 11/12/13/14/15/16, Samsung, Xiaomi, Oppo, Vivo, dll.',
    sellingPoint1: 'Display LED angka digital menunjukkan sisa baterai secara presisi, bukan lampu titik biasa.',
    sellingPoint2: 'Bodi slim matte anti gores dan tidak meninggalkan sidik jari.',
    sellingPoint3: 'Garansi resmi 12 bulan dari Baseus Indonesia.',
    wholesalePrice: 145000,
    suggestedRetailPrice: 219000,
    stockStatus: 'In Stock',
    positioning: 'Better',
    targetCustomer: 'Traveler, pekerja lapangan, mahasiswa aktif',
    isProductFocus: false,
    isBestSeller: true,
    crossSellNotes: 'Kabel Pendek Type-C 20cm, Pouch Powerbank Beludru',
    isActive: true,
  },
  {
    sku: 'ACC-ACM-302',
    name: 'ACMIC ULTRA Magnetic Magsafe Wireless Powerbank 10000mAh',
    brand: 'ACMIC',
    category: 'Powerbank & Baterai',
    subcategory: 'Magsafe Wireless Powerbank',
    imageUrl: 'https://images.unsplash.com/photo-1596742578443-7682ef5251cd?w=600&auto=format&fit=crop&q=80',
    specification: 'Wireless Qi charging 15W + Magnetic snap n charge kuat, kabel Type-C PD 20W wired input/output, zinc alloy kickstand lipat built-in.',
    compatibility: 'iPhone 12/13/14/15/16 Series (Magsafe snap langsung) & Android Qi wireless',
    sellingPoint1: 'Menempel kuat di belakang iPhone tanpa kabel menjuntai, dilengkapi stand lipat untuk nonton.',
    sellingPoint2: 'Produk lifestyle paling diminati anak muda pengguna iPhone.',
    sellingPoint3: 'Margin penjualan fantastis Rp 100.000 per unit untuk konter gadget.',
    wholesalePrice: 230000,
    suggestedRetailPrice: 330000,
    stockStatus: 'In Stock',
    positioning: 'Best',
    targetCustomer: 'Toko HP premium, pengguna iPhone aktif sosial media & live streaming',
    isProductFocus: true,
    isBestSeller: false,
    crossSellNotes: 'Case Magsafe Transparan (ACC-CAS-601), Adaptor 30W Fast',
    isActive: true,
  },
  {
    sku: 'ACC-HLD-401',
    name: 'Holder HP Motor Waterproof Anti-Getar Stang & Spion',
    brand: 'Motowolf Pro',
    category: 'Holder & Mount HP',
    subcategory: 'Holder HP Motor Stang',
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
    specification: 'Casing keras waterproof IPX6 dengan layar sentuh TPU responsif, ball-head 360 derajat rotasi, bantalan silikon anti-shock peredam getaran kamera HP, braket alloy CNC.',
    compatibility: 'Universal semua stang & spion motor (Honda Beat, Vario, NMAX, Aerox, Scoopy, PCX) untuk HP ukuran 4.7 - 7.0 inch',
    sellingPoint1: 'Sangat aman dari hujan deras dan getaran mesin motor yang sering merusak OIS kamera iPhone.',
    sellingPoint2: 'Target pasar jutaan driver ojol (Grab/Gojek/ShopeeFood) dan kurir motoris harian.',
    sellingPoint3: 'Produk cepat laku di konter HP dan toko aksesoris pinggir jalan.',
    wholesalePrice: 38000,
    suggestedRetailPrice: 65000,
    stockStatus: 'In Stock',
    positioning: 'Better',
    targetCustomer: 'Driver ojol, kurir logistik motor, touring bikers',
    isProductFocus: true,
    isBestSeller: true,
    crossSellNotes: 'Kabel Charger L-Shape 90 Derajat, Rain Cover Tambahan',
    isActive: true,
  },
  {
    sku: 'ACC-TG-501',
    name: '9D Ceramic Matte Anti-Spy Tempered Glass Full Layar',
    brand: 'G-Gorilla',
    category: 'Tempered Glass & Pelindung',
    subcategory: 'Screen Protector Anti-Spy',
    imageUrl: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600&auto=format&fit=crop&q=80',
    specification: 'Lapisan keramik fleksibel tidak bisa pecah, filter privasi anti-spy 28 derajat (orang sebelah tidak bisa mengintip), finishing matte anti minyak dan sidik jari.',
    compatibility: 'iPhone 11/12/13/14/15/16, Samsung A-series, Oppo Reno, Vivo Y-series, Redmi Note',
    sellingPoint1: 'Keuntungan kotor tertinggi bagi konter HP: modal Rp 8.500, pasang di tempat Rp 25.000 (margin 66%!).',
    sellingPoint2: 'Bahan ceramic fleksibel tidak akan retak atau gompal di pinggir saat disimpan di kantong celana.',
    sellingPoint3: 'Fitur anti-spy menjaga privasi chat dan m-banking saat di tempat umum.',
    wholesalePrice: 8500,
    suggestedRetailPrice: 25000,
    stockStatus: 'In Stock',
    positioning: 'Good',
    targetCustomer: 'Semua konter HP dengan layanan pasang tempered glass langsung',
    isProductFocus: true,
    isBestSeller: true,
    crossSellNotes: 'Tisu Alkohol Pembersih Layar, Lens Protector Kamera Belakang',
    isActive: true,
  },
  {
    sku: 'ACC-CAS-601',
    name: 'Magnetic Magsafe Armor Shockproof Hybrid Case',
    brand: 'ArmorShield',
    category: 'Casing & Aksesoris Proteksi',
    subcategory: 'Casing Magsafe Hybrid',
    imageUrl: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    specification: 'Backplate polikarbonat transparan anti-yellowing, bumper TPU lentur dengan airbag corner cushion tahan benturan 2 meter, cincin magnet N52 Magsafe tertanam presisi.',
    compatibility: 'iPhone 13, 14, 15, 16 Series (Reguler, Pro, Pro Max)',
    sellingPoint1: 'Magnet Magsafe nempel kencang ke powerbank wireless, car mount, dan dompet magnetic.',
    sellingPoint2: 'Proteksi sudut berstandar militer namun tetap tipis dan elegan.',
    sellingPoint3: 'Modal Rp 28.000 dijual eceran Rp 55.000 - Rp 65.000 sangat laku di konter.',
    wholesalePrice: 28000,
    suggestedRetailPrice: 55000,
    stockStatus: 'In Stock',
    positioning: 'Better',
    targetCustomer: 'Pengguna iPhone modern yang ingin proteksi maksimal tanpa menutupi warna asli HP',
    isProductFocus: false,
    isBestSeller: true,
    crossSellNotes: 'Magsafe Wallet Card Holder, Tempered Glass Layar Depan',
    isActive: true,
  },
];

export async function subscribeToProducts(
  onSuccess: (products: Product[]) => void,
  onError?: (err: Error) => void
): Promise<Unsubscribe> {
  const productsCol = collection(db, COLLECTION_NAME);
  return onSnapshot(
    productsCol,
    (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          id: docSnap.id,
          ...(docSnap.data() as Product),
        });
      });
      onSuccess(items);
    },
    (error) => {
      console.warn('Snapshot listener warning:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}

export async function getProductsOnce(): Promise<Product[]> {
  try {
    const productsCol = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(productsCol);
    const items: Product[] = [];
    snapshot.forEach((docSnap) => {
      items.push({
        id: docSnap.id,
        ...(docSnap.data() as Product),
      });
    });
    return items;
  } catch (error) {
    console.warn('getProductsOnce failed:', error);
    return [];
  }
}

export async function saveProduct(product: Product): Promise<string> {
  const id = product.id || `PRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const cleanData: Product = {
    sku: product.sku.trim(),
    name: product.name.trim(),
    brand: product.brand.trim(),
    category: product.category.trim(),
    subcategory: product.subcategory.trim(),
    imageUrl: product.imageUrl.trim() || 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600',
    specification: product.specification.trim(),
    compatibility: product.compatibility.trim(),
    sellingPoint1: product.sellingPoint1.trim(),
    sellingPoint2: product.sellingPoint2.trim(),
    sellingPoint3: product.sellingPoint3.trim(),
    wholesalePrice: Number(product.wholesalePrice) || 0,
    suggestedRetailPrice: Number(product.suggestedRetailPrice) || 0,
    stockStatus: product.stockStatus || 'In Stock',
    positioning: product.positioning || 'Better',
    targetCustomer: product.targetCustomer.trim(),
    isProductFocus: Boolean(product.isProductFocus),
    isBestSeller: Boolean(product.isBestSeller),
    crossSellNotes: product.crossSellNotes.trim(),
    isActive: Boolean(product.isActive),
    updatedAt: new Date().toISOString(),
    createdAt: product.createdAt || new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, COLLECTION_NAME, id), cleanData, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${id}`);
  }
}

export async function toggleProductActive(id: string, currentStatus: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, id), {
      isActive: !currentStatus,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
  }
}

export async function deleteProductById(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}

export async function seedInitialCatalogIfEmpty(): Promise<{ seeded: number; existing: number }> {
  if (!isMasterAdminUser(auth.currentUser)) {
    throw new Error('Hanya master admin dengan email terverifikasi yang dapat mengisi sampel');
  }

  const productsCol = collection(db, COLLECTION_NAME);
  const snapshot = await getDocs(productsCol);
  if (!snapshot.empty) {
    return { seeded: 0, existing: snapshot.size };
  }

  const now = new Date().toISOString();
  const batch = writeBatch(db);
  for (const sample of SAMPLE_PRODUCTS) {
    const id = sample.sku.replace(/[^a-zA-Z0-9_-]/g, '_');
    batch.set(doc(db, COLLECTION_NAME, id), {
      ...sample,
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();
  return { seeded: SAMPLE_PRODUCTS.length, existing: 0 };
}

export async function batchSaveProducts(productList: Product[]): Promise<number> {
  try {
    const batch = writeBatch(db);
    let count = 0;
    for (const prod of productList) {
      if (!prod.sku || !prod.name) continue;
      const id = (prod.id || prod.sku).replace(/[^a-zA-Z0-9_-]/g, '_');
      const docRef = doc(db, COLLECTION_NAME, id);
      const cleanData: Product = {
        sku: prod.sku.trim(),
        name: prod.name.trim(),
        brand: prod.brand?.trim() || 'Generic',
        category: prod.category?.trim() || 'Charger & Adapter',
        subcategory: prod.subcategory?.trim() || 'Lainnya',
        imageUrl:
          prod.imageUrl?.trim() ||
          'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600',
        specification: prod.specification?.trim() || 'Spesifikasi standar pabrik',
        compatibility: prod.compatibility?.trim() || 'Universal Smartphone',
        sellingPoint1: prod.sellingPoint1?.trim() || 'Kualitas terjamin',
        sellingPoint2: prod.sellingPoint2?.trim() || 'Garansi resmi terpercaya',
        sellingPoint3: prod.sellingPoint3?.trim() || 'Margin konter menguntungkan',
        wholesalePrice: Number(prod.wholesalePrice) || 0,
        suggestedRetailPrice: Number(prod.suggestedRetailPrice) || 0,
        stockStatus: (prod.stockStatus as any) || 'In Stock',
        positioning: (prod.positioning as any) || 'Better',
        targetCustomer: prod.targetCustomer?.trim() || 'Konter HP dan toko retail',
        isProductFocus: Boolean(prod.isProductFocus),
        isBestSeller: Boolean(prod.isBestSeller),
        crossSellNotes: prod.crossSellNotes?.trim() || '',
        isActive: prod.isActive !== false,
        createdAt: prod.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      batch.set(docRef, cleanData, { merge: true });
      count++;
    }
    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

