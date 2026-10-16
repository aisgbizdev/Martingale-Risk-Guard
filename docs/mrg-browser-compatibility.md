# Pemeriksaan browser kalkulator MRG

## Perintah

Dependency JavaScript tetap memakai `playwright-core` yang sudah ada, tanpa mengganti
versi React atau menambah framework tes.

```sh
pnpm --filter @workspace/scripts exec playwright-core install firefox webkit
pnpm run test:scenario-ui:browser-config
pnpm run test:scenario-ui:cross-browser
```

Perintah terakhir membangun fixture produksi sekali dan mencoba **Firefox lalu
WebKit**, masing-masing 24 kasus, bahkan jika engine pertama gagal. Chromium tetap
memakai perintah lama `pnpm run test:scenario-ui`; tidak diam-diam menjadi pengganti
engine yang tidak tersedia.

Setelah build yang masih sesuai kode aplikasi, satu engine juga dapat dijalankan:

```sh
node scripts/src/test-scenario-ui.mjs --browser=firefox
node scripts/src/test-scenario-ui.mjs --browser=webkit
```

Daftar kasus, waktu tetap dan batas isolasi sama dengan
[regresi skenario](mrg-scenario-ui-regressions.md): input modal, pilihan Buy/Sell,
saran terbatas, pergantian arah yang harus dihitung ulang, manual/default,
modal tidak cukup, serta kalender berdampak tinggi/tidak lengkap. Tidak mencakup
Back/swipe, lintas-tab, pembaruan PWA atau kasus level referensi pasar.

## Bukti dan batas klaim

- Firefox: `generated-artifacts/scenario-ui/firefox/report.json`.
- WebKit: `generated-artifacts/scenario-ui/webkit/report.json`.
- Ringkasan kedua engine: `generated-artifacts/scenario-ui/cross-browser-report.json`.
- Laporan terfokus tetap bernama `report-focused.json` di direktori engine terkait;
  itu **bukan** bukti satu matriks penuh.
- Laporan merekam engine, versi browser yang benar-benar terbuka, OS/arsitektur,
  jumlah kasus, error runtime dan permintaan API. Screenshot dipisah per engine.
- Gagal membuka browser menghasilkan status **unavailable**, nol kasus dijalankan,
  penjelasan lingkungan dan exit nonzero. Itu tidak dianggap lulus atau bug kalkulator.
- Keberhasilan download browser tidak membuktikan dependency sistemnya lengkap.
  Ringkasan juga tidak menerima file hasil lama sebagai keberhasilan child baru.
- Cache unduhan `.cache/ms-playwright` dan hasil generated-artifacts tidak ikut
  Git/deployment. Jangan memasukkan binary browser ke artefak produksi.

**Playwright Firefox** adalah build Firefox yang dikendalikan Playwright.
**Playwright WebKit di Linux bukan Apple Safari**, dan ukuran viewport 390px
bukan perangkat iPhone asli. Tidak ada pergantian user-agent sebagai pengganti
pengujian engine. Semua data sintetis, bukan verifikasi feed nyata.

## Lingkungan

Pada penyiapan awal workspace Linux ini Firefox 157 berhasil dibuka setelah
dependency GTK/X11/audio tersedia lewat pengelolaan paket Nix.
WebKit membutuhkan library tambahan dan versi ABI yang cocok dengan build
Playwright; percobaan menunjukkan kekurangan GTK4, ICU74, libxml2, GStreamer dan
library grafis/audio lainnya. Sebagian dependency percobaan khusus WebKit
dibersihkan kembali karena belum menghasilkan lingkungan WebKit yang berjalan.
Jangan mengganti SONAME dengan symlink atau menonaktifkan pemeriksaan agar terlihat lulus.

Gunakan laporan eksekusi terbaru untuk status sesungguhnya. Pemeriksaan Safari
asli memerlukan lingkungan Apple/Safari yang benar-benar dijalankan; bahkan
hasil WebKit yang lulus tidak boleh dilaporkan sebagai bukti Safari atau HP asli.

Penyiapan ABI tambahan juga terhambat karena beberapa atribut dependency yang
dibutuhkan tidak tersedia di indeks pemasangan paket workspace. Dukungan runner
dan hasil Firefox **tidak menutup pekerjaan verifikasi WebKit/Safari**. Gunakan
lingkungan pengujian yang kompatibel untuk menuntaskan bagian tersebut.

## Catatan verifikasi 16 Oktober 2026

Satu putaran `test:scenario-ui:cross-browser` membangun fixture terbaru:

| Engine / platform | Hasil |
| --- | --- |
| Playwright Firefox 157.0, Linux x64 | **24/24 lulus**, di tiga viewport |
| Playwright WebKit, Linux x64 | **Unavailable**, 0/24 dijalankan |
| Apple Safari / iPhone asli | Tidak diuji |

Semua kasus Firefox mencatat nol error runtime dan hanya dua jenis GET API
fixture yang diizinkan. Perintah gabungan keluar **1** karena WebKit tidak tersedia,
bukan karena assertion kalkulator Firefox gagal. Ini catatan eksekusi bertanggal,
bukan jaminan lulus untuk perubahan kode atau lingkungan sesudahnya.

Pengguna kemudian menetapkan lingkup tahap ini: **“Tunda Safari, cukup Firefox
dulu.”** Dengan keputusan tersebut, verifikasi Firefox selesai; WebKit/Safari
ditunda dan tetap belum terverifikasi. Keputusan ini tidak mengubah hasil gagal
perintah gabungan menjadi lulus dan tidak menjadi klaim kompatibilitas Safari.
