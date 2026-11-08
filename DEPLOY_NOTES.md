# PortalTech — langkah manual (belum dijalankan)

Merge atau push GitHub **tidak** mengaktifkan Auth, **tidak** memasang Firestore rules, **tidak** mengisi WhatsApp, dan **tidak** mengubah data Firestore yang sedang hidup.

## 1. Firebase Authentication

Di Firebase Console → Authentication → Sign-in method:

- Aktifkan **Google**.
- Aktifkan **Email/Password**.

Master admin tetap `jefryerlangga@gmail.com` (sama dengan `src/config/app.ts` dan `firestore.rules`).

Akses kelola katalog hanya given jika token Firebase punya email itu **dan** `email_verified == true`.

- Login Google pada email tersebut biasanya sudah terverifikasi.
- Login email/password belum terverifikasi **bukan** admin, meskipun alamatnya sama. Selesaikan verifikasi email di Firebase sebelum memakai tab Admin.
- Jangan membuat akun baru untuk agent atau bot.

Customer yang daftar lewat aplikasi selalu menulis `users/{uid}.role = customer`. Mereka tidak bisa mengubah role itu lewat client.

## 2. Firestore rules

File yang harus dipasang: `firestore.rules`.

Rules di repo baru berlaku setelah dipublish ke project Firebase (Console → Firestore → Rules, atau CLI yang Anda jalankan sendiri). Sampai saat itu, rules yang sedang hidup tetap yang lama.

Yang diubah rules ini, setelah terpasang:

- Tamu dan customer tidak bisa create/update/delete `products`.
- Hanya master admin dengan email terverifikasi yang bisa mengubah produk.
- Dokumen `admins/{uid}` tidak lagi memberi hak tulis katalog.
- Customer membuat `orders` hanya untuk `userId` sendiri, status awal `pending`, dan harga baris harus sama dengan `suggestedRetailPrice` produk di Firestore. Total client tidak dipakai.
- Customer tidak bisa mengubah status, harga, atau pemilik pesanan. Master admin hanya bisa mengubah `status` dan `updatedAt`.
- Customer tidak bisa menulis role selain `customer`.

## 3. Data katalog yang sudah ada

Aplikasi **tidak** menghapus dokumen `products`, termasuk sparepart motor yang mungkin sudah tersimpan.

- Etalase customer menyembunyikan kategori `Braking System`, `Drivetrain`, dan `Engine & Electrical`.
- Tombol sampel di panel admin hanya menulis sampel aksesoris HP jika collection `products` **kosong**, dan hanya untuk master admin terverifikasi. Jika sudah ada dokumen, tidak ada yang ditulis atau dihapus.
- Hapus atau nonaktifkan dokumen lama hanya manual, dari Console atau panel Admin, jika Anda memang menginginkannya.

## 4. WhatsApp

Set `VITE_WHATSAPP_NUMBER` saat **build** (kode negara, hanya digit, contoh bentuk `62812...`). Nilai ini masuk ke client dan bukan secret.

- Jika kosong, checkout tetap menyimpan pesanan dan **tidak** membuka WhatsApp.
- Jika diisi, tombol checkout hanya membuka tautan `https://wa.me/...` di browser. Aplikasi tidak memanggil API WhatsApp dan tidak mengirim pesan sendiri.
- Tidak ada pembayaran di aplikasi ini.

## 5. Cek setelah rules terpasang

Ini belum diuji terhadap Firestore produksi:

- Tamu bisa membaca katalog, tidak bisa menyimpan produk.
- Customer bisa daftar, login, keranjang, dan checkout.
- Customer tidak melihat tab kelola katalog dan tidak bisa mengubah produk.
- Master admin terverifikasi bisa menambah produk.
- Pesanan dengan harga yang tidak sama dengan katalog ditolak.
