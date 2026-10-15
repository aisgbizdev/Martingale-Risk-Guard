# Pemeriksaan PWA untuk kesiapan Android

## Status dan batas bukti

Pemeriksaan otomatis dilakukan pada 14 Oktober 2026. Pengujian Android fisik
dilewati dulu sesuai permintaan pengguna. **Belum dapat dinyatakan lulus pada
Android nyata.** Tidak ada rekaman atau laporan Android dari programmer
Newsmaker yang tersedia sebagai pengganti pengujian perangkat.

Metadata deployment diperiksa melalui layanan deployment: `success: true`,
`isDeployed: false`, tanpa URL produksi. Tidak ada publish dilakukan. Build
produksi lokal adalah fixture pengujian, bukan deployment produksi; preview
pengembangan bukan bukti pemasangan PWA.

## Lingkungan yang benar-benar diuji

- Peramban: desktop headless Chromium, `Chrome/152.0.7977.64`.
- OS perangkat Android / model perangkat: **tidak diuji**.
- Emulasi ukuran layar: portrait 390×844, landscape 844×390, dan tinggi
  terbatas 390×360.
- PWA: build dari `npm run build` disajikan pada server HTTP loopback sementara
  dengan profil browser terisolasi. API diteruskan ke aplikasi pengembangan.
- Cache HTTP browser dimatikan selama pengujian PWA.
- Offline: jaringan browser disimulasikan terputus, transport fixture juga
  diputus saat reload, dan flag offline dokumen disimulasikan. Ini bukan mode
  pesawat pada ponsel.
- Prompt pemasangan dan kejadian `appinstalled` adalah kejadian uji buatan,
  bukan pemasangan oleh Android OS.

## Hasil

| Cakupan | Bukti dan hasil | Batas |
| --- | --- | --- |
| Kelayakan pemasangan | Chromium tidak melaporkan installability error; shell JS/CSS dan ikon tersedia dalam cache PWA. Tombol memanggil prompt uji, pembatalan membuka panduan, kejadian pemasangan menyembunyikan tombol hingga navigasi dalam aplikasi. | Belum ada pemasangan OS, ikon launcher, atau peluncuran dari layar utama Android. |
| Standalone | Manifest meminta `display: standalone`, dengan orientasi `any`. | Konfigurasi dibaca, bukan peluncuran standalone OS yang teruji. |
| Portrait / landscape | Halaman posisi tidak overflow horizontal pada 390×844 dan 844×390. Catatan tidak berubah akibat perubahan viewport dan navigasi. | Bukan rotasi sensor Android. |
| Safe area | CSS navigasi bawah dan footer menggunakan `env(safe-area-inset-*)`. | Peninjauan kode saja; inset perangkat, cutout, gesture bar, dan bar sistem nyata belum diuji. |
| Keyboard | Input harga tetap dapat difokuskan dan digulir ke area yang tidak tertutup navigasi bawah pada viewport 390×360. | Tinggi viewport dikurangi; bukan keyboard Android, IME, atau resize visual viewport nyata. |
| Tombol dan bantuan istilah | Input, select, tombol aksi form posisi dan bantuan istilah memiliki tinggi setidaknya 44px. Penjelasan Lot dapat dibuka, tetap di dalam viewport portrait, dan ditutup dengan Escape. | Tidak mengklaim seluruh tombol aplikasi berukuran 44px; interaksi terotomasi bukan sentuhan hardware. |
| Offline | Banner menjelaskan harga dan indeks dijeda. Halaman posisi tetap dapat reload tanpa cache HTTP; tidak ada respons API live dalam cache PWA, dan fetch API offline gagal alih-alih memakai sukses lama. | Pada fixture lokal dengan service worker; belum pada deployment atau perangkat. |
| Reconnect | Banner offline hilang dan permintaan API jaringan baru berhasil. | Tidak menyatakan semua harga atau indeks pasti segar; keberhasilan HTTP bukan bukti freshness setiap simbol. |
| Keutuhan catatan | Seluruh string portfolio lokal dibandingkan sebelum/sesudah navigasi, perubahan viewport, reload offline, dan reconnect; identik, termasuk dua arah buy/sell, lot, harga, waktu, dan pengaturan. | Profil browser uji yang sama; belum restart OS/browser Android atau update PWA pada perangkat. |
| Tambah/ubah/hapus | Suite UI menguji pencatatan manual, edit tanpa duplikasi, waktu masuk, pembatalan/konfirmasi hapus, reload, storage rusak dan storage ditolak. Semua lulus. | Suite UI menggunakan browser terisolasi pada pengembangan, bukan Android nyata. |

## Pemeriksaan dan bukti yang dapat diulang

- `npm run check`: lulus.
- `npm run build`: lulus; peringatan Browserslist lama, metadata PostCSS, dan
  ukuran bundle tidak menggagalkan build.
- `npm run test:pwa`: **23 pemeriksaan lulus**.
- `npm run test:ui`: **72 pemeriksaan lulus**.
- `npm test`: **47 uji lulus**.
- Screenshot preview `/positions` pada 390×844 diperiksa; halaman tampil
  tanpa error aplikasi di console. Profil preview berbeda dari profil uji.

Dengan workflow aplikasi berjalan dan Chromium tersedia, jalankan
`npm run build && npm run test:pwa` untuk membuat ulang bukti:

- `generated-artifacts/pwa/checks.json`: versi browser, waktu, daftar hasil,
  viewport, dan cakupan yang belum diverifikasi.
- `generated-artifacts/pwa/positions-portrait.jpg`
- `generated-artifacts/pwa/positions-landscape.jpg`
- `generated-artifacts/pwa/term-help.jpg`
- `generated-artifacts/pwa/positions-offline.jpg`
- `generated-artifacts/live-ui-checks.json`: hasil suite UI.

File bukti hasil pengujian tidak dimasukkan ke Git atau deployment.
Tidak ada model risiko, fitur broker, atau perilaku aplikasi yang diubah.
Perubahan hanya memperkuat pemeriksaan otomatis dan melaporkan hasilnya.
Pemindahan/cadangan antarperangkat dan iPhone di luar cakupan.

## Pemeriksaan perangkat yang masih diperlukan bila dilanjutkan

Gunakan URL produksi yang diperoleh saat itu dari layanan deployment, bukan
alamat preview. Tanpa URL produksi, jangan memberi status lulus produksi.

Programmer Newsmaker atau penguji perangkat yang disetujui perlu mencatat:
model perangkat, versi Android, versi browser, tanggal, URL/build, serta rekaman
dan hasil tiap langkah berikut. Gunakan catatan sintetis, bukan data pribadi.

1. Pasang dari browser Android, pastikan ikon launcher, lalu buka dari ikon
   dan pastikan tampilan standalone tanpa address bar.
2. Coba portrait dan landscape, cutout/safe area, gesture bar atau navigasi
   tiga tombol. Pastikan aksi utama dan navigasi dapat dijangkau.
3. Buka keyboard angka dan tanggal, ubah input, gulir form, simpan, tutup
   keyboard, serta buka/tutup bantuan istilah dengan sentuhan.
4. Buat catatan buy/sell dengan waktu masuk, ubah satu catatan, batalkan lalu
   konfirmasi hapus catatan uji; catat semua pengaturan.
5. Aktifkan mode pesawat, reload dan buka kembali aplikasi dari launcher.
   Pastikan catatan/pengaturan utuh dan indeks live dijeda.
6. Sambungkan kembali jaringan, periksa banner, status sumber dan freshness
   live; pastikan catatan tidak berubah.
7. Tutup paksa lalu buka browser/PWA kembali; periksa isi catatan dan
   pengaturan. Bila build baru tersedia, uji pembaruan PWA tanpa kehilangan
   data. Jangan menghapus data situs sebagai bagian dari pengujian persistensi.

Hanya perbaiki masalah yang terbukti dari hasil tersebut. Jangan mengubah
model risiko atau menambahkan hubungan ke broker.
