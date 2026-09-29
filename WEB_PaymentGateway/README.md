# WEB_PaymentGateway

Toko karya seni **Goresan**, dibuat dengan Next.js (Page Router), TypeScript, Tailwind CSS, MongoDB (Mongoose) dan dua payment gateway: **Xendit** (utama, dalam Rupiah) dan **PayPal** (sandbox, dalam USD).

## Alur

```
Select Item (/) → Checkout (/checkout) → Payment (/payment/[id]) → Invoice Xendit → Tagihan (/orders/[id])
                                                                         │
                                         Xendit webhook ─────────────────┘  status otomatis LUNAS
```

1. Pengguna memilih produk berdasarkan kategori atau pencarian, lalu memasukkannya ke keranjang.
2. Di Checkout, isi keranjang dikirim ke server. Server menghitung ulang harga dan stok dari database lalu membuat dokumen **Checkout**.
3. Di Payment, pengguna mengisi alamat dan memilih metode. Server membuat dokumen **Payment** (status `PENDING`), lalu membuat **invoice Xendit** dengan `external_id` yang sama dan mengarahkan pengguna ke halaman invoice.
4. Setelah pembayaran berhasil, Xendit memanggil `POST /api/webhooks/xendit`. Token `x-callback-token` diverifikasi, lalu Payment dan Checkout diubah menjadi `PAID` (LUNAS) dan stok dikurangi.
5. Halaman tagihan `/orders/[id]` mengecek status setiap 4 detik, sehingga berubah menjadi **LUNAS** tanpa perlu refresh.

## Payment gateway kedua: PayPal

PayPal tidak bisa menagih dalam Rupiah, jadi total pesanan dikonversi ke **USD** dengan kurs `PAYPAL_IDR_PER_USD` (default 16.500, dibulatkan ke atas dua desimal). Nominal USD itu disimpan di `payments.gatewayAmount`.

1. Pembeli memilih **PayPal** di halaman Payment. Server membuat **PayPal Order** (`POST /v2/checkout/orders`, `custom_id` = `externalId` payment), lalu mengarahkan pembeli ke halaman persetujuan PayPal.
2. Setelah pembeli menyetujui, PayPal mengarahkan kembali ke `/api/paypal/return`. Server melakukan **capture** (`POST /v2/checkout/orders/{id}/capture`), mencocokkan nominal USD, lalu menandai pesanan **LUNAS**.
3. Sebagai cadangan, webhook `PAYMENT.CAPTURE.COMPLETED` ke `/api/webhooks/paypal` diverifikasi lewat `POST /v1/notifications/verify-webhook-signature` (event dikirim balik byte-per-byte) sebelum diproses.

Pelunasan dari Xendit maupun PayPal melewati fungsi yang sama (`src/server/settlement.ts`). Fungsi ini hanya berlaku sekali: retry webhook, callback ganda, atau redirect yang diulang tidak mengubah apa-apa dan tidak memotong stok dua kali. Kalau `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` kosong, opsi PayPal otomatis nonaktif di halaman Payment.

## Halaman

| Route | Halaman | Isi |
|---|---|---|
| `/` | Select Item | Cari produk, filter kategori (Drawing, Painting, Print, Craft, Bundle), tambah ke keranjang |
| `/checkout` | Checkout | Ubah jumlah atau hapus item, subtotal, pajak PPN 11%, total |
| `/payment/[checkoutId]` | Payment | Alamat pengiriman, metode pembayaran, ringkasan pesanan, Confirm & Pay |
| `/orders/[id]` | Tagihan | Status pembayaran (Menunggu Pembayaran / LUNAS / Kedaluwarsa), tombol bayar, ganti metode |
| `/orders` | My orders | Pesanan dari browser ini, plus form **Track an order** (email + kode order) |

## Identitas pembeli

Toko memakai *guest checkout*: tidak ada password, dan **email adalah identitas pembeli**.

- Saat pembayaran dimulai, data pembeli disimpan atau diperbarui di collection `customers` (satu dokumen per email), lalu checkout ditautkan ke customer tersebut.
- Pesanan bisa dilacak dari perangkat mana pun dengan **email + kode order** (misalnya `GRS-260930-K7QM2`). Kode tanpa email yang cocok tidak akan menampilkan apa pun.
- Browser pembeli mengingat pesanan yang pernah dibuat (halaman My orders) dan alamat terakhir (tombol "Use my saved details"). Data ini hanya disimpan di `localStorage` perangkat itu.
- Pesanan yang dibuat sebelum fitur ini ada bisa ditautkan ke customer dengan `npm run backfill-customers`. Script ini aman dijalankan berulang kali dan tidak menimpa data customer yang lebih baru.

## Autofill alamat

Di halaman Payment ada kolom **Find your area**. Pembeli mengetik kelurahan, kecamatan, atau kode pos, lalu memilih salah satu saran. Kolom **City**, **Postal code**, dan keterangan wilayah (kelurahan, kecamatan, provinsi) terisi otomatis. Nama jalan tetap diisi manual.

Saran diambil dari direktori kode pos Indonesia [kodepos.vercel.app](https://kodepos.vercel.app) (tanpa API key) melalui proxy `/api/address/search`, dengan cache CDN 1 hari. Kalau layanan itu sedang tidak bisa diakses, form tetap bisa diisi manual.

## Database (MongoDB)

| Collection | Isi |
|---|---|
| `products` | Katalog: nama, kategori, seniman, medium, ukuran, harga, stok, gambar |
| `customers` | Pembeli per email: nama, telepon, alamat dan wilayah terakhir, waktu order terakhir |
| `checkouts` | Snapshot item dan harga, subtotal, pajak, ongkir, total, pembeli, alamat, metode, status (`OPEN` → `PENDING_PAYMENT` → `PAID` / `EXPIRED`) |
| `payments` | Tagihan per checkout: `externalId`, id dan URL invoice Xendit, jumlah, status (`PENDING` / `PAID` / `EXPIRED` / `FAILED`), channel pembayaran, waktu bayar |
| `webhooklogs` | Setiap webhook Xendit dan PayPal yang lolos verifikasi, beserta hasil pemrosesannya |

Relasi: `checkouts.items[].product` → `products`, `checkouts.customer` → `customers`, `payments.checkout` → `checkouts`, `checkouts.payment` → tagihan terakhir di `payments`.

Collection `products` terisi otomatis dari `src/data/products.json` saat database masih kosong. Untuk mereset harga dan stok jalankan `npm run seed`.

## API

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/products?category=&q=` | Daftar produk |
| POST | `/api/checkouts` | Buat checkout dari isi keranjang `{ items: [{ slug, quantity }] }` |
| GET | `/api/checkouts/:id` | Detail checkout dan tagihan terakhir |
| POST | `/api/payments` | Simpan alamat dan metode, buat invoice Xendit `{ checkoutId, shipping, method }` |
| POST | `/api/webhooks/xendit` | Callback invoice Xendit (`PAID` / `SETTLED` / `EXPIRED`) |
| GET | `/api/paypal/return` | Tujuan redirect PayPal setelah pembeli menyetujui, lalu capture pembayaran |
| POST | `/api/webhooks/paypal` | Webhook PayPal `PAYMENT.CAPTURE.COMPLETED` (dengan verifikasi tanda tangan) |
| GET | `/api/orders?ids=` | Ringkasan status pesanan milik browser ini |
| POST | `/api/orders/lookup` | Cari pesanan dengan `{ email, code }` |
| GET | `/api/address/search?q=` | Saran wilayah (kelurahan, kecamatan, kota, provinsi, kode pos) untuk autofill alamat |

## Environment variables

Salin `.env.example` ke `.env.local` lalu isi:

| Variable | Keterangan |
|---|---|
| `MONGODB_URI` | Connection string MongoDB (misalnya MongoDB Atlas) |
| `MONGODB_DB` | Nama database (default `web_payment_gateway`) |
| `XENDIT_SECRET_KEY` | Secret key mode **test** dari Dashboard Xendit → Settings → API Keys |
| `XENDIT_WEBHOOK_TOKEN` | Webhook verification token dari Dashboard Xendit → Settings → Webhooks |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Opsional. Kredensial app **sandbox** dari developer.paypal.com → Apps & Credentials |
| `PAYPAL_WEBHOOK_ID` | Opsional. ID webhook dari app yang sama (event `PAYMENT.CAPTURE.COMPLETED`) |
| `PAYPAL_IDR_PER_USD` | Opsional. Kurs Rupiah per 1 USD untuk PayPal (default 16500) |
| `APP_BASE_URL` | Opsional, URL publik aplikasi untuk redirect setelah bayar |

## Setup webhook Xendit

1. Deploy aplikasi (misalnya ke Vercel) atau buka tunnel lokal dengan `ngrok http 3000`.
2. Di Dashboard Xendit (mode test) → Settings → Webhooks, isi URL **Invoices paid** dengan `https://<domain>/api/webhooks/xendit`.
3. Salin *verification token* ke `XENDIT_WEBHOOK_TOKEN`.
4. Tombol "Test and save" di dashboard akan mendapat respons `200` dengan hasil `unknown_payment` (karena `external_id` contoh tidak ada di database), yang menandakan endpoint sudah terhubung.

## Menjalankan

```bash
cp .env.example .env.local   # isi variabel di atas
npm install
npm run dev
```

Buka http://localhost:3000.
