# Rencana teknikal edukatif LGD

## Batas persetujuan dan sumber

Pengguna menyetujui penggunaan LGD dulu sebagai rencana edukatif, **bukan level
XUL10 presisi**. Hanya Saran MRG berubah; Isi Manual dan Simulasi Default tetap.
OHLC memakai LGD Daily D1 selesai terakhir yang lolos pemeriksaan sumber dan
kesegaran. Harga running XUL10 hanya pembanding pemilihan sisi level; tidak ada
offset, rasio, kalibrasi, atau klaim kesamaan sumber. Chart TradingView OANDA
adalah panduan terpisah, bukan API analisis.

## Aturan versi edukatif

- Pivot Klasik dihitung dari OHLC D1. Retracement Fibonacci memakai high/low
  D1 terakhir, **bukan deteksi swing multihari atau konfirmasi pembalikan**.
- Kandidat berasal dari Pivot Klasik, retracement arah terkait, serta high/low
  D1. Level sama pada ketelitian tampilan dua desimal digabung; tidak ada
  klaim ketelitian tick instrumen.
- Buy memilih level berbeda di bawah harga pembanding, terdekat dahulu;
  Sell mencerminkan aturan ini di atas harga pembanding.
- Maksimal tiga entry, tetapi batas strategi/layer dari konteks lama tetap.
  Dampak berita belum dinilai berarti Linear maksimal dua layer. Tidak ada
  penambahan layer ketiga demi memenuhi jumlah.
- Satu level teknikal lebih jauh selalu dicadangkan sebagai batas batal
  ilustratif. Tanpa batas tersebut, jangan membuat entry tambahan.
- SL/batas batal adalah level teknikal berikutnya, tanpa buffer ATR rekaan.
  Ini bukan stop broker, bukan jaminan harga eksekusi, dan bukan kerugian
  maksimum; spread, biaya, slippage, dan gap tidak dihitung.
- TP adalah level teknikal terdekat yang berada pada sisi profit dari rata-rata
  layer yang diasumsikan terisi. Pemilihan tahap tidak mengubah entry, lot
  yang dialokasikan ke tiap layer, atau batas batal basket penuh.
- Harga menyentuh level bukan konfirmasi entry. Rencana tidak mendeteksi fill
  akun, tidak menyarankan arah, dan tidak melakukan transaksi.

## Modal sesudah geometri

Modal tidak mengubah level harga. Pola relatif tetap Linear 1:2:3 atau
Martingale 1:2:4 sesuai izin konteks, bukan penamaan ulang pola manual.
Sizing memakai asumsi edukatif US$1.000 margin/lot, US$100/poin/lot.
Lot awal adalah bilangan bulat terbesar yang memenuhi kedua budget:
margin basket 20% modal dan kerugian pada batas batal 10% modal.
Budget nominal ini pilihan simulasi, bukan standar keamanan.

Budget stress lama pada jarak ATR tidak lagi menentukan geometri rencana
baru. Nilai 10% kini diterapkan pada kerugian hingga **batas batal teknikal**,
bukan mengklaim kedua ukuran risiko setara.

Jika tidak ada satu lot utuh yang muat, peta harga dan bobot tetap ditampilkan,
tetapi alokasi lot dan angka uang tidak ditampilkan sebagai saran. Tidak ada
pembulatan naik, substitusi lot pecahan, atau penolakan seolah pengguna
dilarang membuka posisi.

## Pemeriksaan konteks dan snapshot

Pemeriksaan harga/sumber, D1, berita tersedia, serta kalender dan jendela
penundaan tetap berlaku; no-fit modal model ATR lama tidak memblokir peta baru.
Penilaian editorial yang hilang tetap belum dinilai, bukan netral. Analisis
aturan berita/kalender tidak mengklaim memahami arah seluruh berita.
Rencana hanya diganti saat pengguna menghitung ulang. Pergantian modal/data
menandai snapshot lama; pergantian arah meminta perhitungan baru, dan
pergantian mode membuang hasil agar tidak hidup kembali.
