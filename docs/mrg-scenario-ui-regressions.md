# Regresi interaksi kalkulator MRG

Jalankan dari root proyek: `pnpm test:scenario-ui`.

Perintah membangun aplikasi produksi ke folder output pengujian, kemudian
menjalankan Chromium melalui Playwright yang sudah tersedia di workspace.
Tidak membutuhkan workflow API, token, koneksi vendor, atau data pengguna.
Jika Chromium berada di lokasi lain, tentukan `MRG_CHROMIUM` ke executable itu.

## Cakupan
- PC 1366px, tablet 820px, dan HP 390px sebagai viewport Chromium, bukan perangkat asli.
- Buy/Sell harus dipilih; keduanya menghasilkan dua layer Linear pada saran terbatas.
- Angka entry, rata-rata, TP, stress, margin dan jumlah layer diperiksa terhadap
  ekspektasi tetap, bukan dihitung ulang memakai engine yang sedang diuji.
- Pergantian arah lalu kembali lagi tidak mengaktifkan diagram lama.
- Isi Manual, contoh Martingale tiga layer dan reset Simulasi Default diperiksa.
- Modal tidak valid/tidak mencukupi, kalender high impact dan kalender tidak
  lengkap memberikan alasan; kalender tidak lengkap tidak mematikan mode manual.
- Penanda limited terlihat; saran pasar tidak salah diberi label manual.

## Isolasi dan bukti
Setiap kasus memakai browser context baru tanpa profil pengguna. API diintersep
dengan fixture sintetis dan waktu tetap. Semua koneksi eksternal diblokir dan
panggilan API yang tidak dikenal menyebabkan kegagalan. Tidak ada penghapusan
penyimpanan pengguna atau mutasi backend.

Hasil: `generated-artifacts/scenario-ui/report.json`, beserta screenshot hasil
Buy/Sell dan kasus gagal. Folder generated-artifacts sudah diabaikan Git/deploy.
Ini bukti regresi UI dengan fixture, **bukan bukti integrasi data pasar nyata**.

Untuk melanjutkan hanya kasus tertentu setelah kegagalan pemeriksaan:
`MRG_UI_CASES=buy-limited,sell-limited node scripts/src/test-scenario-ui.mjs`.
Ini memakai build yang sudah ada; hanya gunakan jika kode aplikasi belum berubah.
Laporan terpisahnya `report-focused.json`; jangan menyebut putaran terfokus sebagai
satu putaran penuh. Perintah utama tanpa filter selalu menjalankan seluruh matriks.

Tes ini tidak mencakup Back/swipe, lintas-tab, pembaruan PWA, login, atau browser
selain Chromium. `pnpm test` tetap menjalankan pengujian aturan/perhitungan.
