# Grafik pasar dan skenario MRG

## Batas implementasi
- Identitas tetap Newsmaker. Referensi TradePilot bukan perubahan merek.
- Pengguna mengisi modal sekali, lalu memilih Buy/Sell setara, tanpa default arah.
- Diagram level adalah skenario edukasi, bukan waktu entry, sinyal, order, atau ramalan harga.
- Chart TradingView OANDA XAUUSD tidak dipakai sebagai feed kalkulasi XUL10.
  Widget hanya diminta ketika panel pasar terlihat; kegagalannya tidak mematikan kalkulator.
- Harga XUL10 diperiksa kesegarannya saat render dan saat tombol hitung ditekan.
- Snapshot tidak ditulis ulang oleh tick baru. Perubahan arah mencabut hasil lama
  sampai hitung ulang, termasuk bila arah dikembalikan ke pilihan sebelumnya.

## Aritmetika
Asumsi pengguna: satu poin = perubahan harga 1,00; US$100/poin untuk 1 lot;
margin US$2.000/lot. Entry pertama memakai harga referensi feed, bukan fill bid/ask.
Spread, biaya, slippage, dan stop-out tidak dihitung. Tidak ada SL buatan.

Lot awal 0,1. Linear 0,1/0,2/0,3; Martingale 0,1/0,2/0,4.
Buy menambah layer pada harga lebih rendah; Sell pada harga lebih tinggi.
Rata-rata basket ditimbang dengan lot. TP berjarak target dari rata-rata,
di atas untuk Buy dan di bawah untuk Sell. Profit TP dihitung dengan semua layer
terisi; bukan hasil yang dijamin pada jalur harga aktual.
Stress satu jarak lagi setelah layer terakhir; bukan kerugian maksimum.
Margin tidak sama dengan kerugian maksimum atau bukti akun sanggup menahan posisi.

Default visual: Linear, 3 layer, target 30, jarak 30 poin, lot awal 0,1.
Kontrol manual menerima kedua strategi dan 1–5 layer. Angka ini tidak otomatis
disesuaikan pivot, Fibonacci, kalender, berita, atau skor studi.

## Yang belum terintegrasi
- Tag dampak redaksi belum ditemukan dalam kontrak berita yang diberikan.
  Saran pasar lengkap tidak dipaksakan dan tidak digantikan AI.
- Pivot Klasik/Woodie/Camarilla dan Fibonacci naik/turun tersedia sebagai acuan
  teknikal dari OHLC D1 tertutup terakhir. Rumus diperiksa pada kalkulator publik
  https://www.newsmaker.id/id/tools/pivot-fibonacci, yang juga menghitung di sisi
  klien dari input OHLC, bukan menerima level siap pakai melalui API.
- Pemilihan candle terakhir sebagai high/low otomatis dinyatakan eksplisit;
  bukan swing pilihan pengguna. LGD Daily bukan seri XUL10 identik. Pemetaan
  level ke perubahan target/jarak/layer belum disepakati dan belum diaktifkan.
