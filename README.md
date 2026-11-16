# PortalTech — katalog aksesoris HP

Aplikasi etalase dan belanja untuk toko aksesoris handphone PortalTech (pemilik: Jefry). Antarmuka berbahasa Indonesia dan dirancang untuk layar HP.

Yang bisa dilakukan pengunjung dan customer:

- melihat katalog, cari, kategori, produk fokus, terlaris, dan perbandingan (maksimal 3)
- masuk dengan Google atau email/password
- keranjang dan checkout. Harga yang disimpan adalah `suggestedRetailPrice` di Firestore, bukan angka yang diketik di browser
- tautan `wa.me` kalau nomor WhatsApp diisi saat build. Aplikasi tidak mengirim pesan sendiri dan tidak memproses pembayaran
- asisten belanja. Kalau `XAI_API_KEY` ada, server memanggil Grok. Kalau tidak, pencarian kata di katalog

Yang hanya bisa dilakukan master admin `jefryerlangga@gmail.com` dengan email Firebase **terverifikasi**:

- menambah, mengubah, menghapus, dan mengimpor produk
- melihat harga grosir (mode Sales)
- mengisi sampel hanya jika koleksi `products` masih kosong

Customer tidak bisa mengubah `role`. Dokumen `admins/{uid}` tidak memberi hak tulis katalog.

## Menjalankan di komputer (bukan AI Studio)

Perlu Node.js 22.

```bash
npm ci
cp .env.example .env
# isi XAI_API_KEY di .env kalau asisten Grok dipakai. Kosong = pencarian kata.
npm run dev
```

`npm run dev` menyalakan Vite di port 3000. Permintaan `POST /api/ai-assistant` ditangani di proses yang sama dan tidak masuk ke bundle browser.

Produksi lokal, setelah build:

```bash
npm run build
npm start
```

`npm start` menjalankan Express (`server.ts`). Server ini yang menyajikan `dist/` dan endpoint asisten. `npm run preview` hanya menyajikan file statis, jadi asisten tidak menjawab lewat Grok.

Nomor WhatsApp dibaca saat **build**, bukan saat server jalan:

```bash
VITE_WHATSAPP_NUMBER=6281234567890 npm run build
```

Hanya digit, kode negara, tanpa `+`. Nilai ini sengaja masuk ke client dan bukan rahasia. `XAI_API_KEY` tidak boleh diawali `VITE_`.

## Perintah cek

```bash
npm run lint
npm test
npm run build
npm run test:rules:emulator
```

`test:rules:emulator` memakai Firestore emulator proyek `demo-portaltech`. Jangan mengarahkannya ke proyek Firebase yang hidup.

## Deploy di Cloud Run

Dari mesin Anda (perintah ini tidak dijalankan oleh review PR):

```bash
gcloud run deploy portaltech-katalog \
  --source . \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --set-env-vars XAI_MODEL=grok-4.7
```

`XAI_API_KEY` jangan ditaruh di perintah yang masuk ke riwayat shell kalau bisa dihindari. Di Cloud Run → service → Variables & Secrets, simpan `XAI_API_KEY` sebagai secret. `XAI_MODEL` boleh `grok-4.7` (bawaan di kode) atau model teks xAI yang sedang aktif, misalnya `grok-4.6`.

`VITE_WHATSAPP_NUMBER` harus ada **saat image di-build**, karena Vite menempelkannya ke JavaScript. Dengan Docker:

```bash
docker build --build-arg VITE_WHATSAPP_NUMBER=6281234567890 -t portaltech-katalog .
```

Lalu deploy image itu dan set `XAI_API_KEY` / `XAI_MODEL` sebagai env runtime. `PORT` diisi Cloud Run sendiri.

File `firebase-applet-config.json` adalah konfigurasi client Firebase (bukan service account). Jangan meng-commit file service account.

Langkah Auth, rules, migrasi harga grosir, dan WhatsApp ada di [DEPLOY_NOTES.md](DEPLOY_NOTES.md). Merge Git **tidak** memasang rules dan **tidak** mengubah data Firestore yang sedang hidup.
