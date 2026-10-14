# Uji panel MRG pada HP asli

## Status: menunggu akses atau bukti perangkat

Pemeriksaan akses dilakukan pada 15 Oktober 2026, waktu Asia/Jakarta.
**Belum ada pengujian Android Chrome, iPhone Safari, atau standalone pada
perangkat nyata. Tidak ada hasil native yang dinyatakan lulus.**

- Lingkungan lokal menyediakan Chromium Linux, tanpa `adb`, `idevice_id`,
  `xcrun`, atau direktori perangkat USB `/dev/bus/usb`.
- Pencarian integrasi untuk BrowserStack, Sauce Labs, dan layanan pengujian
  perangkat fisik tidak mengembalikan integrasi yang tersedia.
- Tidak ada sesi perangkat remote, rekaman, atau laporan native yang tersedia.
- Bukti sebelumnya adalah headless Chrome/152.0.7977.64 di Linux dengan emulasi
  390×844, 844×390 dan 390×360; sumbernya
  `generated-artifacts/pwa/checks.json`, bertanggal 14 Oktober 2026 UTC.
  Laporan tersebut berisi 30 pemeriksaan browser, bukan 30 hasil perangkat.
- Mengurangi tinggi viewport, meniru `navigator.standalone`, atau mengganti
  user agent tidak membuktikan keyboard OS, Safari, safe area, atau zoom native.

Dokumen ini menyiapkan pelaksanaan dan pencatatan bukti, bukan menggantikan
pengujian perangkat. Tidak ada perubahan UI, perhitungan, data, atau publish
sebagai akibat pemeriksaan akses ini.

## Lingkungan yang perlu diuji

| Platform/mode | Status | Model, OS, browser, viewport dan bukti |
| --- | --- | --- |
| Android fisik / Chrome | Belum diuji | Belum tersedia |
| Android fisik / standalone yang sudah terpasang | Belum diuji | Belum tersedia |
| iPhone fisik / Safari | Belum diuji | Belum tersedia |
| iPhone fisik / standalone yang sudah terpasang | Belum diuji | Belum tersedia |

Gunakan perangkat langsung atau layanan **real device**, bukan simulator.
Standalone boleh memakai instalasi yang sudah ada; pemasangan PWA bukan
cakupan pemeriksaan ini. Bila mode tidak tersedia, tulis “belum diuji”.
Jangan menyimpulkan mode lain lulus dari satu sesi.

Programmer/penguji mencatat tanggal dan zona waktu, model, versi OS dan browser,
mode browser/standalone, bahasa dan keyboard OS, orientasi, skala teks/zoom,
URL serta identitas build yang diuji. Jangan menebak URL produksi; bila
diperlukan, dapatkan dari metadata deployment melalui alur deployment.
Labeli pengujian preview sebagai preview, bukan produksi. Jangan publish
tanpa persetujuan. Bedakan banner preview milik platform dari UI MRG.

## Persiapan aman

1. Pakai profil/situs pengujian kosong, bukan catatan atau akun pribadi.
   Jangan reset, hapus data situs, atau menimpa portfolio pengguna.
2. Aktifkan rekaman layar yang memperlihatkan keyboard, seluruh panel, dan
   aksi sentuhan. Sembunyikan notifikasi, akun, dan informasi pribadi.
3. Gunakan angka sintetis: lot 0.01; batas lot 0.10; batas layer 5;
   modal 1000; ekuitas 900; target jarak harga 30; jarak layer 20.
   Angka ini hanya fixture, bukan saran transaksi atau batas aman.
   Harga `P` diambil dari harga yang terlihat dan dicatat sebagai input manual.
4. Catat isi portfolio uji sebelum setiap langkah dan setelahnya. Lakukan
   pemeriksaan dalam profil/mode yang sama; jangan mengasumsikan penyimpanan
   Safari, standalone, dan perangkat lain berbagi data.
5. Untuk simulasi yang membutuhkan feed, pastikan status feed memungkinkan
   pembuatan snapshot. Jika tidak, rekam keadaan dijeda dan tandai alur
   simulasi “belum diuji”; jangan memaksa guard atau memalsukan data live.

## Langkah dan kriteria lulus

Jalankan tiap baris pada setiap lingkungan di atas, portrait dan landscape.
Ulangi kasus keyboard dengan bilah browser terlihat dan setelah berubah
karena scroll, serta ukuran teks/zoom yang lazim dipakai perangkat.

| Kasus | Tindakan | Kriteria lulus |
| --- | --- | --- |
| Entry | Buka Catat posisi, ketik harga `P`, lot 0.01, dan waktu opsional menggunakan keyboard/picker OS. Gulir ke field pertama dan terakhir. | Field terfokus terlihat; panel bisa digulir; tidak overflow horizontal; judul, X, dan peringatan dapat diakses; background tidak ikut bergulir. |
| Simpan dengan keyboard | Dengan keyboard tetap terbuka, ketuk Catat posisi **satu kali**. | Satu catatan saja tersimpan dengan nilai/waktu yang diketik; bukan hanya keyboard tertutup; tidak perlu ketukan kedua karena tombol bergeser. |
| Edit | Ubah lot catatan uji menjadi 0.02; simpan saat keyboard terbuka. Buka edit lagi, ketik nilai lain, lalu Batal. | Edit tidak menggandakan posisi. Batal tidak mengubah catatan tersimpan. Tombol Simpan/Batal/X tidak tertutup keyboard atau bilah OS. |
| Batas | Buka Atur batas, isi fixture; simpan saat keyboard terbuka. Buka lagi, ubah draft lalu batalkan. | Simpan memakai nilai terakhir; modal dan ekuitas tetap terpisah; Batal tidak menimpa batas tersimpan; aksi footer dapat disentuh tanpa harus menutup keyboard dahulu. |
| Validasi | Kosongkan harga/lot, coba nilai tidak valid, atau jumlah layer pecahan. | Pesan kesalahan terlihat/terjangkau, tidak menutupi aksi, dan tidak ada penyimpanan. Jika keyboard lokal memakai koma desimal, rekam nilai yang diterima/ditolak; jangan anggap format lintas OS identik. |
| Bantuan | Ketuk bantuan Lot/batas saat keyboard terbuka, lalu tutup dengan sentuhan di luar atau pemicu. | Tooltip berada dalam area terlihat, teks dapat dibaca, panel tidak tertutup tanpa sengaja, dan nilai draft tidak hilang. Escape dari keyboard fisik adalah pemeriksaan tambahan, bukan pengganti sentuhan. |
| Rotasi/fokus | Saat mengetik di field terakhir, putar perangkat dan kembali; tutup/buka keyboard; coba zoom/ukuran teks OS. | Tidak ada kontrol hilang atau terpotong; fokus/nilai tetap benar; area gulir dan footer menyesuaikan visual viewport, safe area, notch dan home/gesture bar. |
| Simulasi | Buka simulator, buat snapshot dan ketik harga/lot hipotetis. Tunggu setidaknya satu pembaruan feed; putar layar dan buka/tutup keyboard. | Tidak ada order atau catatan otomatis; input serta acuan snapshot tetap beku. Perubahan orientasi tidak mengubah angka atau arah posisi. |
| Pengaturan dari simulasi | Dari snapshot aktif, pilih Atur batas, ubah batas lot menjadi 0.12, simpan, lalu Kembali ke simulasi. | Snapshot tidak diam-diam diperbarui; peringatan usang terlihat dan penyalinan menjadi catatan ditolak sampai snapshot dibuat ulang. |
| Konfirmasi simulasi | Buat ulang snapshot valid, pilih pencatatan manual, batalkan konfirmasi, lalu ulangi dan konfirmasi sekali. | Pembatalan tidak menambah posisi; konfirmasi menambah tepat satu catatan dengan nilai hipotetis yang dipilih; tidak ada eksekusi broker. |
| Penutupan | Tutup setiap panel dengan X/Batal saat keyboard terbuka; buka lagi dan navigasi antarrute. | Keyboard/focus dan scroll lock tidak tertinggal; draft batal tidak tersimpan; halaman tetap bisa digulir setelah panel ditutup; catatan tersimpan utuh. |

Perilaku tombol **Back** ditangani dalam pekerjaan terpisah; jangan mengubah
implementasinya sebagai bagian dari uji ini. Jangan mengubah model risiko,
rumus, storage schema, atau mengakali guard untuk membuat hasil tampak lulus.

## Format laporan perangkat

Untuk setiap kasus, isi:

```text
Perangkat / OS / browser:
Mode, orientasi, bahasa keyboard, skala teks/zoom:
Tanggal / zona waktu / URL / build:
Kasus dan langkah yang benar-benar dilakukan:
Keyboard: terbuka/tertutup; field yang fokus:
Ukuran viewport/visual viewport bila dapat diukur:
Hasil: LULUS / GAGAL / BELUM DIUJI
Nilai dan jumlah catatan sebelum/sesudah:
Bukti: nama rekaman/screenshot dan timestamp aksi:
Masalah dan langkah reproduksi:
```

Nilai “lulus” memerlukan bukti aksi dan hasil, bukan hanya screenshot panel
diam. Bila ditemukan bug, perbaiki hanya masalah teramati lalu ulangi kasus
tersebut serta alur simpan/batal terkait pada perangkat/mode yang sama.
Catat hasil ulang secara terpisah; jangan menghapus bukti kegagalan awal.

Panduan lama [Android](pwa-android-verification.md) dan
[iPhone](pwa-iphone-verification.md) membahas kesiapan/pemasangan PWA;
angka uji di sana merupakan laporan historis, bukan status native panel baru.
