# WEB_PaymentGateway

Toko karya seni **Goresan**, dibuat dengan Next.js (Page Router), TypeScript, Tailwind CSS, MongoDB (Mongoose) dan payment gateway **Xendit**.

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

## Halaman

| Route | Halaman | Isi |
|---|---|---|
| `/` | Select Item | Cari produk, filter kategori (Drawing, Painting, Print, Craft, Bundle), tambah ke keranjang |
| `/checkout` | Checkout | Ubah jumlah atau hapus item, subtotal, pajak PPN 11%, total |
| `/payment/[checkoutId]` | Payment | Alamat pengiriman, metode pembayaran, ringkasan pesanan, Confirm & Pay |
| `/orders/[id]` | Tagihan | Status pembayaran (Menunggu Pembayaran / LUNAS / Kedaluwarsa), tombol bayar |
| `/orders` | Daftar pesanan | Pesanan terbaru beserta statusnya |

## Database (MongoDB)

| Collection | Isi |
|---|---|
| `products` | Katalog: nama, kategori, seniman, medium, ukuran, harga, stok, gambar |
| `checkouts` | Snapshot item dan harga, subtotal, pajak, ongkir, total, alamat, metode, status (`OPEN` → `PENDING_PAYMENT` → `PAID` / `EXPIRED`) |
| `payments` | Tagihan per checkout: `externalId`, id dan URL invoice Xendit, jumlah, status (`PENDING` / `PAID` / `EXPIRED` / `FAILED`), channel pembayaran, waktu bayar |
| `webhooklogs` | Setiap callback Xendit yang lolos verifikasi beserta hasil pemrosesannya |

Relasi: `checkouts.items[].product` → `products`, `payments.checkout` → `checkouts`, `checkouts.payment` → tagihan terakhir di `payments`.

Collection `products` terisi otomatis dari `src/data/products.json` saat database masih kosong. Untuk mereset harga dan stok jalankan `npm run seed`.

## API

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/products?category=&q=` | Daftar produk |
| POST | `/api/checkouts` | Buat checkout dari isi keranjang `{ items: [{ slug, quantity }] }` |
| GET | `/api/checkouts/:id` | Detail checkout dan tagihan terakhir |
| POST | `/api/payments` | Simpan alamat dan metode, buat invoice Xendit `{ checkoutId, shipping, method }` |
| POST | `/api/webhooks/xendit` | Callback invoice Xendit (`PAID` / `SETTLED` / `EXPIRED`) |
| GET | `/api/orders` | Pesanan terbaru |

## Environment variables

Salin `.env.example` ke `.env.local` lalu isi:

| Variable | Keterangan |
|---|---|
| `MONGODB_URI` | Connection string MongoDB (misalnya MongoDB Atlas) |
| `MONGODB_DB` | Nama database (default `web_payment_gateway`) |
| `XENDIT_SECRET_KEY` | Secret key mode **test** dari Dashboard Xendit → Settings → API Keys |
| `XENDIT_WEBHOOK_TOKEN` | Webhook verification token dari Dashboard Xendit → Settings → Webhooks |
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
