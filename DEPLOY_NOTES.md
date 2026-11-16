# PortalTech — langkah manual (belum dijalankan)

Merge atau push GitHub **tidak** mengaktifkan Auth, **tidak** memasang Firestore rules, **tidak** mengisi WhatsApp, **tidak** mengisi `XAI_API_KEY`, dan **tidak** mengubah data Firestore yang sedang hidup.

Database Firestore aplikasi ini bukan `(default)`. ID-nya ada di `firebase-applet-config.json` pada field `firestoreDatabaseId` (saat catatan ini ditulis: `ai-studio-400fb96f-6af3-4b11-9e77-a5d8cecb82f9`). Semua langkah di bawah harus memakai database itu di proyek `sonic-drummer-br6mz`.

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

## 2. Kunci Grok (xAI), hanya di server

1. Buat API key di [console.x.ai](https://console.x.ai).
2. Simpan sebagai environment `XAI_API_KEY` pada proses Express (Cloud Run Variables & Secrets, atau file `.env` lokal yang tidak di-commit).
3. Opsional: `XAI_MODEL`. Kosong memakai `grok-4.7`. Contoh lain yang masih dilayani API: `grok-4.6`.
4. Opsional: `XAI_API_BASE_URL`. Kosong memakai `https://api.x.ai/v1/chat/completions` (endpoint chat OpenAI-compatible).

Jangan menaruh kunci ini di `VITE_*`. Vite hanya menempel variabel `VITE_` ke browser. Endpoint `POST /api/ai-assistant` membaca kunci di server. Respons JSON ke browser hanya berisi teks jawaban.

Kalau `XAI_API_KEY` kosong atau panggilan Grok gagal, asisten memakai pencarian kata pada katalog yang dikirim halaman (harga eceran saja).

Asisten **tidak** menerima harga grosir, meskipun pemanggil mengirim field itu. Endpoint ini tidak memeriksa bahwa pemanggil adalah admin.

## 3. Firestore rules

File yang harus dipasang: `firestore.rules`.

Rules di repo baru berlaku setelah dipublish ke project Firebase (Console → Firestore → Rules, pilih database di atas, atau CLI yang Anda jalankan sendiri). Sampai saat itu, rules yang sedang hidup tetap yang lama.

Yang diubah rules ini, setelah terpasang:

- Tamu dan customer tidak bisa create/update/delete `products`.
- Hanya master admin dengan email terverifikasi yang bisa mengubah produk.
- Dokumen `products` tidak boleh lagi berisi field `wholesalePrice`.
- Harga grosir ada di `productAdmin/{productId}` (`wholesalePrice`, `updatedAt`). Hanya master admin terverifikasi yang bisa baca dan tulis. Tamu dan customer ditolak.
- Dokumen `admins/{uid}` tidak lagi memberi hak tulis katalog.
- Customer membuat `orders` hanya untuk `userId` sendiri, status awal `pending`, dan harga baris harus sama dengan `suggestedRetailPrice` produk di Firestore. Total client tidak dipakai.
- Customer tidak bisa mengubah status, harga, atau pemilik pesanan. Master admin hanya bisa mengubah `status` dan `updatedAt`.
- Customer tidak bisa menulis role selain `customer`.

Rules **tidak menghapus** field yang sudah tersimpan. Dokumen lama yang masih punya `wholesalePrice` tetap bisa dibaca publik sampai field itu dihapus (langkah 4). Setelah rules baru terpasang, simpan produk yang masih membawa field itu akan ditolak sampai field-nya dihapus.

## 4. Pindahkan harga grosir (migrasi data)

Lakukan setelah rules baru terpasang, dan hanya pada database di catatan atas. Jangan jalankan ini dari CI.

Untuk setiap dokumen `products/{id}` yang masih punya `wholesalePrice`:

1. Buat `productAdmin/{id}` dengan isi persis:
   - `wholesalePrice`: angka yang sama (bukan string)
   - `updatedAt`: waktu ISO, contoh `2026-11-16T00:00:00.000Z`
2. Hapus field `wholesalePrice` dari `products/{id}`. Jangan menghapus dokumen produknya. `suggestedRetailPrice` tetap di dokumen publik karena itu harga checkout.

Urutan di dalam satu batch: tulis `productAdmin` dulu, baru hapus field di `products`, supaya angkanya tidak hilang kalau langkah kedua gagal.

Skrip lokal (dry-run kecuali Anda mengirim konfirmasi) ada di `scripts/migrate-wholesale-prices.mjs`. Ia butuh `firebase-admin` yang Anda pasang sendiri dan service account yang tidak di-commit:

```bash
npm install --no-save firebase-admin
export GOOGLE_APPLICATION_CREDENTIALS=/path/rahasia-service-account.json
export FIREBASE_PROJECT_ID=sonic-drummer-br6mz
export FIRESTORE_DATABASE_ID=ai-studio-400fb96f-6af3-4b11-9e77-a5d8cecb82f9
node scripts/migrate-wholesale-prices.mjs
```

Itu hanya mencetak rencana. Menulis butuh tambahan `PORTALTECH_MIGRATE_CONFIRM=yes` dan `FIRESTORE_DATABASE_ID` yang di-set eksplisit. Baca ulang ID database di `firebase-applet-config.json` sebelum menulis.

Dari aplikasi, master admin yang menyimpan produk (termasuk impor Excel) menulis harga grosir ke `productAdmin` dan menimpa dokumen publik tanpa field itu. Tombol aktif/nonaktif, sebelum menghapus `wholesalePrice` yang masih menempel di dokumen publik, menyalin angka itu ke `productAdmin/{id}` bila koleksi admin belum punya harga grosir. Tetap jalankan migrasi untuk dokumen yang tidak pernah di-toggle.

## 5. Data katalog yang sudah ada

Aplikasi **tidak** menghapus dokumen `products`, termasuk sparepart motor yang mungkin sudah tersimpan.

- Etalase customer menyembunyikan kategori `Braking System`, `Drivetrain`, dan `Engine & Electrical`.
- Tombol sampel di panel admin hanya menulis sampel aksesoris HP jika collection `products` **kosong**, dan hanya untuk master admin terverifikasi. Jika sudah ada dokumen, tidak ada yang ditulis atau dihapus. Sampel hanya menulis dokumen publik (harga eceran). Harga grosir tidak ikut di sampel dan tidak ada di berkas JavaScript pelanggan.
- Hapus atau nonaktifkan dokumen lama hanya manual, dari Console atau panel Admin, jika Anda memang menginginkannya.

## 6. WhatsApp

Set `VITE_WHATSAPP_NUMBER` saat **build** (kode negara, hanya digit, contoh bentuk `62812...`). Nilai ini masuk ke client dan bukan secret.

- Jika kosong, checkout tetap menyimpan pesanan dan **tidak** membuka WhatsApp.
- Jika diisi, tombol checkout hanya membuka tautan `https://wa.me/...` di browser. Aplikasi tidak memanggil API WhatsApp dan tidak mengirim pesan sendiri.
- Tidak ada pembayaran di aplikasi ini.

Build Cloud Run / Docker harus menerima angka ini sebagai build arg, bukan sebagai env runtime saja. Lihat `README.md`.

## 7. Menjalankan di luar AI Studio

Di komputer: `npm ci`, isi `.env` dari `.env.example`, `npm run dev`. Produksi: `npm run build` lalu `npm start` (Express). Jangan mengandalkan `vite preview` untuk asisten.

Cloud Run (Anda yang menjalankan, bukan merge git):

```bash
gcloud run deploy portaltech-katalog \
  --source . \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --set-env-vars XAI_MODEL=grok-4.7
```

Tambahkan secret `XAI_API_KEY` di halaman service. `Dockerfile` di repo memakai `npm ci`, `npm run build`, lalu `npx tsx server.ts`.

## 8. Cek setelah rules dan migrasi terpasang

Ini belum diuji terhadap Firestore produksi:

- Tamu bisa membaca katalog, tidak bisa menyimpan produk, dan tidak bisa membaca `productAdmin`.
- Dokumen `products` yang sudah dimigrasi tidak lagi memuat `wholesalePrice`.
- Customer bisa daftar, login, keranjang, dan checkout.
- Customer tidak melihat tab kelola katalog, tidak bisa mengubah produk, dan tidak bisa membaca harga grosir.
- Master admin terverifikasi bisa menambah produk dan melihat modal di mode Sales.
- Pesanan dengan harga yang tidak sama dengan katalog ditolak.
- `POST /api/ai-assistant` tidak mengembalikan `XAI_API_KEY`.
