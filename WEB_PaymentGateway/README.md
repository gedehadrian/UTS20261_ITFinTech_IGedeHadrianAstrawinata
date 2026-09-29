# WEB_PaymentGateway

Toko karya seni **Goresan**, dibuat dengan Next.js (Page Router), TypeScript, Tailwind CSS dan MongoDB (Mongoose).

## Halaman

| Route | Halaman | Isi |
|---|---|---|
| `/` | Select Item | Cari produk, filter kategori (Drawing, Painting, Print, Craft, Bundle), tambah ke keranjang |
| `/checkout` | Checkout | Ubah jumlah atau hapus item, subtotal, pajak PPN 11%, total |
| `/payment/[checkoutId]` | Payment | Alamat pengiriman, metode pembayaran, ringkasan pesanan, Confirm & Pay |
| `/orders/[id]` | Tagihan | Status pembayaran pesanan |
| `/orders` | Daftar pesanan | Pesanan terbaru beserta statusnya |

Keranjang disimpan di `localStorage`. Harga dan stok selalu dihitung ulang di server dari database saat checkout dibuat.

## Database (MongoDB)

| Collection | Isi |
|---|---|
| `products` | Katalog: nama, kategori, seniman, medium, ukuran, harga, stok, gambar |
| `checkouts` | Snapshot item dan harga, subtotal, pajak, ongkir, total, alamat, metode, status (`OPEN` → `PENDING_PAYMENT` → `PAID` / `EXPIRED`) |
| `payments` | Tagihan per checkout: `externalId`, metode, jumlah, status (`PENDING` / `PAID` / `EXPIRED`), batas waktu |

Relasi: `checkouts.items[].product` → `products`, `payments.checkout` → `checkouts`, `checkouts.payment` → tagihan terakhir di `payments`.

Collection `products` terisi otomatis dari `src/data/products.json` saat database masih kosong. Untuk mereset harga dan stok jalankan `npm run seed`.

## API

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/products?category=&q=` | Daftar produk |
| POST | `/api/checkouts` | Buat checkout dari isi keranjang `{ items: [{ slug, quantity }] }` |
| GET | `/api/checkouts/:id` | Detail checkout dan tagihan terakhir |
| POST | `/api/payments` | Simpan alamat dan metode, buat tagihan `{ checkoutId, shipping, method }` |
| GET | `/api/orders` | Pesanan terbaru |

## Menjalankan

```bash
cp .env.example .env.local   # isi MONGODB_URI
npm install
npm run dev
```

Buka http://localhost:3000.
