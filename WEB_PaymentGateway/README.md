# WEB_PaymentGateway

Toko karya seni **Goresan**, dibuat dengan Next.js (Page Router), TypeScript dan Tailwind CSS.

## Halaman

| Route | Halaman | Isi |
|---|---|---|
| `/` | Select Item | Cari produk, filter kategori (Drawing, Painting, Print, Craft, Bundle), tambah ke keranjang |
| `/checkout` | Checkout | Ubah jumlah atau hapus item, subtotal, pajak PPN 11%, total |
| `/payment` | Payment | Alamat pengiriman, metode pembayaran, ringkasan pesanan, Confirm & Pay |

Keranjang disimpan di `localStorage` sehingga tetap ada setelah halaman di-refresh.

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000.
