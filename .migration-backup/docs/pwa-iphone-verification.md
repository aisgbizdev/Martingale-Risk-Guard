# Kesiapan PWA iPhone — bukan hasil uji Safari

## Status

Pemeriksaan dilakukan pada 14 Oktober 2026. Sesuai permintaan pengguna,
pengujian perangkat nyata dilewati dulu. **Safari, Add to Home Screen, dan
pemakaian pada iPhone belum terverifikasi.** Tidak ada sesi perangkat yang
disetujui atau rekaman/laporan programmer Newsmaker yang digunakan sebagai
bukti iPhone.

Metadata melalui `getDeploymentInfo`: `success: true`, `isDeployed: false`,
`primaryUrl: ""`. Tidak ada URL produksi, tidak ada publish dilakukan.
Preview dan fixture build produksi lokal bukan deployment produksi.

## Lingkungan dan bukti

- Browser yang benar-benar diuji: desktop headless Chromium
  `Chrome/152.0.7977.64`, bukan WebKit/Safari.
- Model iPhone, versi iOS, dan versi Safari: **tidak diuji**.
- Viewport simulasi: 390×844, 844×390, dan 390×360.
- Build produksi lokal dilayani lewat HTTP loopback sementara, dengan profil
  browser terisolasi dan API diteruskan ke pengembangan.
- Prompt pemasangan, `appinstalled`, dan `navigator.standalone` adalah
  simulasi. Tidak ada pemasangan atau peluncuran standalone oleh OS.
- Offline disimulasikan dengan jaringan browser dan transport fixture
  diputus, cache HTTP dimatikan, serta flag offline dokumen disimulasikan.

## Hasil dan batasnya

| Pemeriksaan | Hasil yang didukung bukti | Yang belum diuji |
| --- | --- | --- |
| Pemasangan | Tanpa prompt browser, tombol membuka panduan `iPhone: Safari → Bagikan → Tambahkan ke Layar Utama.` Panduan dapat ditutup tanpa mengubah catatan. Metadata Apple dan ikon tersedia; Chromium tidak melaporkan installability error. | Menu Share Safari, Add to Home Screen, ikon launcher dan nama aplikasi pada iPhone. |
| Standalone | Manifest meminta `standalone` dan orientasi `any`. Properti `navigator.standalone` buatan menyembunyikan tombol install, termasuk setelah navigasi dalam aplikasi. | Peluncuran dari ikon, address bar, status bar, dan lifecycle iOS. |
| Portrait/landscape | Halaman posisi tidak overflow horizontal pada dua viewport; catatan dan pengaturan tidak berubah. | Rotasi iPhone, bilah Safari, dan ukuran layar perangkat lain. |
| Safe area/notch | Peninjauan kode: navigasi bawah memakai inset kiri/kanan/bawah; footer memakai inset bawah. | Inset nyata, notch/Dynamic Island, home indicator, dan keterjangkauan kontrol landscape. Viewport belum meminta `viewport-fit=cover`; ini bukan bukti adanya cacat pada perangkat. |
| Keyboard | Input harga dapat difokuskan dan digulir di atas navigasi pada tinggi simulasi 360px. | Keyboard angka/tanggal iOS, zoom otomatis input, visual viewport, simpan saat keyboard terbuka. |
| Tombol/bantuan istilah | Kontrol form posisi dan bantuan istilah yang diuji setidaknya 44px tinggi. Bantuan Lot terbuka dalam viewport dan ditutup dengan Escape. | Sentuhan hardware, seluruh tombol aplikasi, VoiceOver, dan penutupan dengan sentuhan pada Safari. |
| Offline/reconnect | Shell dan halaman posisi reload offline. Banner menjelaskan live dijeda; API live tidak tersimpan dalam cache. Reconnect menghilangkan banner dan permintaan API jaringan baru berhasil. | Mode pesawat iPhone, pembukaan dari ikon saat offline, dan freshness setiap simbol setelah reconnect. |
| Keutuhan catatan | String portfolio lengkap identik setelah navigasi, perubahan viewport, reload offline, reconnect, serta simulasi standalone/panduan. Suite UI juga menguji tambah/edit/hapus, reload, storage rusak dan ditolak. | Persistensi antara Safari dan PWA terpasang, tutup paksa/restart iOS, eviction storage, dan pembaruan PWA pada iPhone. |

Tidak ada cacat aplikasi yang terbukti oleh pemeriksaan ini. Karena itu tidak
ada perubahan perilaku aplikasi, CSS, model risiko, atau integrasi broker.
Perubahan hanya menambah pemeriksaan dan laporan batas bukti.
Pemindahan/cadangan antarperangkat tidak termasuk.

## Pemeriksaan yang dapat diulang

- `npm run check`: lulus.
- `npm run build`: lulus, dengan peringatan nonfatal Browserslist, PostCSS,
  dan ukuran bundle.
- `npm run test:pwa`: 29 pemeriksaan lulus.
- `npm run test:ui`: 76 pemeriksaan lulus.
- Screenshot preview `/positions` 390×844: halaman tampil tanpa exception
  aplikasi. Ini bukan screenshot Safari; profilnya berbeda dari suite uji.

Dengan workflow aplikasi berjalan dan Chromium tersedia:
`npm run build && npm run test:pwa`.

Bukti regenerasi berada di direktori yang dikecualikan dari Git/deployment:

- `generated-artifacts/pwa/checks.json`: waktu, versi browser, viewport,
  pemeriksaan lulus, serta daftar yang belum diverifikasi.
- `generated-artifacts/pwa/iphone-install-guide.jpg`
- `generated-artifacts/pwa/positions-portrait.jpg`
- `generated-artifacts/pwa/positions-landscape.jpg`
- `generated-artifacts/pwa/term-help.jpg`
- `generated-artifacts/pwa/positions-offline.jpg`
- `generated-artifacts/live-ui-checks.json`

## Bila pengujian iPhone dilanjutkan

Dapatkan URL produksi saat itu melalui `getDeploymentInfo`; jangan memakai
preview atau menganggap fixture sebagai produksi. Gunakan iPhone fisik,
layanan perangkat yang disetujui, atau rekaman/laporan programmer Newsmaker.
Catat model perangkat, versi iOS/Safari, tanggal, URL/build, rekaman dan hasil
per langkah. Gunakan catatan sintetis, bukan data pengguna.

1. Buka di Safari, tampilkan panduan, pasang melalui Share → Add to Home
   Screen, periksa ikon/nama, lalu buka dari ikon dan pastikan standalone.
2. Uji portrait/landscape, notch dan home indicator, bilah Safari, scroll,
   navigasi, semua aksi utama, serta bantuan istilah dengan sentuhan.
3. Buka keyboard harga, lot, dan waktu; periksa zoom, fokus, scroll, serta
   tombol simpan/tutup. Perbaiki hanya masalah yang benar-benar terlihat.
4. Buat buy/sell, ubah satu catatan tanpa duplikasi, batalkan lalu konfirmasi
   hapus catatan uji, dan catat pengaturan. Periksa apakah catatan yang dibuat
   di Safari terlihat saat peluncuran PWA; jangan menjanjikan storage bersama.
5. Aktifkan mode pesawat, reload dan buka kembali dari ikon. Catatan harus
   utuh; live harus dijeda tanpa sukses API lama dari cache.
6. Reconnect, periksa banner, sumber dan freshness live, serta catatan.
7. Tutup paksa/buka kembali dan restart iPhone. Bila build baru tersedia,
   uji pembaruan PWA tanpa kehilangan catatan/pengaturan. Jangan menghapus
   data situs untuk menguji persistensi.

Berikan hasil tiap langkah sebagai lulus/gagal/belum diuji dengan bukti,
bukan menyimpulkan seluruh iPhone lulus dari emulasi Chromium.
