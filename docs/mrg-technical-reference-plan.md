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
- Buy memilih zona di bawah harga pembanding, terdekat dahulu; Sell mencerminkan
  aturan di atas harga pembanding. Nama yang tampil Buy 1–3 atau Sell 1–3;
  label di Isi Manual tetap.
- Pengguna memilih penyaring **0,20 × ATR14 LGD D1** sebagai aturan awal untuk
  dicoba, bukan parameter optimal/aman yang sudah teruji. Minimum dibulatkan
  ke atas pada dua desimal tampilan (minimal 0,01), bukan klaim tick XUL10.
- Harga wakil setiap zona tetap level rumus asli terdekat. Kandidat berikutnya
  yang jaraknya kurang dari minimum terhadap wakil masuk zona tersebut, bukan
  menjadi entry tambahan. Perbandingan tidak dirantai lewat anggota terakhir:
  rangkaian harga berdekatan tidak boleh menyerap seluruh rentang.
- Pemisahan dinilai pada harga dua desimal yang terlihat. ATR hanya menyaring
  level yang tersedia, tidak membuat grid atau harga sintetis. ATR tidak valid
  menghentikan pembentukan rencana dengan alasan jelas, tanpa jarak cadangan.
- Maksimal tiga entry untuk Linear maupun Martingale, jika struktur teknikal
  menyediakan level dan batas batal. Berita belum dinilai, tren searah,
  ketidakpastian, dan kalender tidak lagi menghapus rencana atau mengunci
  strategi. Tidak ada penambahan layer rekaan demi memenuhi jumlah.
- Satu level teknikal lebih jauh selalu dicadangkan sebagai batas batal
  ilustratif. Tanpa batas tersebut, jangan membuat entry tambahan.
- SL/batas batal adalah wakil zona teknikal berikutnya yang juga memenuhi
  pemisahan minimum dari entry terakhir, tanpa buffer ATR rekaan.
  Ini bukan stop broker, bukan jaminan harga eksekusi, dan bukan kerugian
  maksimum; spread, biaya, slippage, dan gap tidak dihitung.
- Kumpulan target tetap level teknikal pada sisi profit entry pertama; TP
  dipilih dari kumpulan tersebut pada sisi profit rata-rata terisi. TP tidak
  otomatis diperlebar mengikuti penyaring entry. Pemilihan tahap tidak mengubah entry, lot
  yang dialokasikan ke tiap layer, atau batas batal basket penuh.
- Harga menyentuh level bukan konfirmasi entry. Rencana tidak mendeteksi fill
  akun, tidak menyarankan arah, dan tidak melakukan transaksi.

## Modal sesudah geometri

Modal tidak mengubah level harga. Pola relatif tetap Linear 1:2:3 atau
Martingale 1:2:4, dipotong sesuai jumlah zona yang tersedia; konteks tidak
mengunci strategi. Ini bukan penamaan ulang pola manual.
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

Pembentukan rencana tidak lagi memanggil kandidat model modal/ATR lama.
Harga pembanding dan OHLC D1 wajib valid, bertanggal, dan memenuhi pemeriksaan
sumber. Kalender atau berita tidak tersedia tetap menghasilkan peta teknikal
dengan status konteks belum lengkap, bukan penilaian pasar lengkap.
Agenda USD high impact dalam 120 menit sebelum sampai 15 menit sesudah,
serta waktu/dampak agenda yang belum jelas, menghasilkan status tunggu pada
rencana yang tetap terlihat. Setelah jendela lewat perlu evaluasi ulang,
bukan otomatis boleh masuk atau klaim dampak rilis selesai.
Penilaian editorial yang hilang tetap belum dinilai, bukan netral. Analisis
aturan berita/kalender tidak mengklaim memahami arah seluruh berita.
Rencana hanya diganti saat pengguna menghitung ulang. Pergantian modal/data
menandai snapshot lama; pergantian arah meminta perhitungan baru, dan
pergantian mode membuang hasil agar tidak hidup kembali.

## Bukti perbandingan bertanggal

Contoh regresi, **bukan harga live**: OHLC LGD Daily 16 Oktober 2026 =
4164,47 / 4198,45 / 4147,22 / 4168,94; ATR14 D1 81.
Pembanding XUL10 4178,59 pada 19 Oktober 2026 pukul 03:00 UTC.
Minimum penyaring = 16,20 poin. Angka di bawah mengikuti dua desimal tampilan.

| Arah | Entry lama (terdekat tanpa zona) | Entry setelah penyaring | Batas batal lama → baru |
| --- | --- | --- | --- |
| Buy | 4172,84 / 4171,54 / 4166,79 | 4172,84 / 4147,22 / 4120,31 | 4158,18 → 4093,39 |
| Sell | 4178,88 / 4187,49 / 4195,85 | 4178,88 / 4195,85 / 4222,77 | 4198,45 → 4247,08 |

Contoh Buy: 4171,54, 4166,79 dan 4158,18 berada kurang dari minimum
terhadap wakil 4172,84, sehingga tidak menjadi posisi tambahan.
UI memperlihatkan jarak aktual, ATR/faktor, serta rincian zona dan perbandingan
pemilihan lama dari snapshot yang sama. Bagian perbandingan bukan rencana aktif.

Pemisahan lebih lebar dapat memperbesar jarak batas batal dan mengecilkan lot;
seluruh sizing dan tahap terisi dihitung kembali, budget tidak dinaikkan.
Aturan ini berlaku ke semua Saran MRG dengan data valid, termasuk referensi
akhir pekan yang memenuhi syarat, bukan khusus satu modal atau snapshot.
