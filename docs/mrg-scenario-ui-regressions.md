# Regresi interaksi kalkulator MRG

Dukungan engine Firefox/WebKit dan batas klaim Safari dijelaskan di
[pemeriksaan browser](mrg-browser-compatibility.md).

Jalankan dari root proyek: `pnpm test:scenario-ui`.

Perintah membangun aplikasi produksi ke folder output pengujian, kemudian
menjalankan Chromium melalui Playwright yang sudah tersedia di workspace.
Tidak membutuhkan workflow API, token, koneksi vendor, atau data pengguna.
Jika Chromium berada di lokasi lain, tentukan `MRG_CHROMIUM` ke executable itu.


## Pemeriksaan rilis tercatat

`pnpm test:release` memeriksa bahwa Chromium dapat diluncurkan, menjalankan
`pnpm test`, lalu `pnpm test:scenario-ui` (build baru dan semua 27 kasus).
Perintah berhenti dengan exit nonzero jika salah satu tahap gagal, matriks tidak
lengkap, atau laporan bukan hasil putaran tersebut. `MRG_UI_CASES` tidak boleh
diisi pada pemeriksaan rilis. Tidak perlu memasang browser melalui unduhan saat
tes: workspace menyediakan `chromium` di PATH; lingkungan lain harus menyediakan
executable kompatibel atau menentukan `MRG_CHROMIUM`.

Validasi bernama `mrg-release` menjalankan perintah ini; `mrg-core` tetap memeriksa
aturan dan safeguard visual. Workflow artifact tidak diubah. Sebelum rilis,
pastikan kedua validasi lulus pada revisi yang akan dirilis dan periksa laporannya.
Ini pemeriksaan yang tercatat, **bukan klaim bahwa platform otomatis memblokir
publishing**. Perintah ini tidak melakukan publish.

## Cakupan
- PC 1366px, tablet 820px, dan HP 390px sebagai viewport Chromium, bukan perangkat asli.
- Buy/Sell harus dipilih; keduanya menghasilkan dua layer Linear pada saran terbatas.
- Angka entry, rata-rata, TP, stress, margin dan jumlah layer diperiksa terhadap
  ekspektasi tetap, bukan dihitung ulang memakai engine yang sedang diuji.
- Pergantian arah lalu kembali lagi tidak mengaktifkan diagram lama.
- Isi Manual, contoh Martingale tiga layer dan reset Simulasi Default diperiksa.
- Form manual kini memakai satu set kontrol studi untuk strategi, target dan layer.
  Perhitungan studi tanpa harga live serta reset default tanpa mengubah modal dan
  kondisi pasar ditambahkan sebagai kasus kesembilan (9 × 3 viewport = 27).
- Modal tidak valid/tidak mencukupi, kalender high impact dan kalender tidak
  lengkap memberikan alasan; kalender tidak lengkap tidak mematikan mode manual.
- Penanda limited terlihat; saran pasar tidak salah diberi label manual.

Perubahan penyatuan kalkulator dan perluasan menjadi 27 kasus belum memiliki hasil
putaran browser baru. Bukti 24 kasus di bawah adalah hasil sebelum perubahan ini,
bukan kelulusan desain atau alur baru.

## Isolasi dan bukti
Setiap kasus memakai browser context baru tanpa profil pengguna. API diintersep
dengan fixture sintetis dan waktu tetap. Semua koneksi eksternal diblokir dan
panggilan API yang tidak dikenal menyebabkan kegagalan. Tidak ada penghapusan
penyimpanan pengguna atau mutasi backend.

Hasil terbaru: `generated-artifacts/scenario-ui/report.json`. Setiap putaran
menyimpan salinan report dan screenshot Buy/Sell atau kasus gagal di
`generated-artifacts/scenario-ui/runs/<waktu-mulai>/`, sehingga bukti putaran
berbeda tidak tercampur. Report mencatat waktu mulai/selesai nyata (berbeda dari
waktu fixture tetap), scope, jumlah diharapkan, kelengkapan, versi Chromium dan
hasil tiap kasus. Report terbaru ditandai belum lengkap sejak awal putaran agar
interupsi tidak meninggalkan status lulus lama. Folder generated-artifacts sudah diabaikan Git/deploy.
Ini bukti regresi UI dengan fixture, **bukan bukti integrasi data pasar nyata**.

Untuk melanjutkan hanya kasus tertentu setelah kegagalan pemeriksaan:
`MRG_UI_CASES=buy-limited,sell-limited node scripts/src/test-scenario-ui.mjs`.
Ini memakai build yang sudah ada; hanya gunakan jika kode aplikasi belum berubah.
Laporan terpisahnya `report-focused.json`; jangan menyebut putaran terfokus sebagai
satu putaran penuh. Perintah utama tanpa filter selalu menjalankan seluruh matriks.

Tes ini tidak mencakup Back/swipe, lintas-tab, pembaruan PWA, login, atau browser
selain Chromium. `pnpm test` tetap menjalankan pengujian aturan/perhitungan.

### Hasil penuh yang dicatat pada 16 Oktober 2026

- Validasi `mrg-release`: **PASSED**, exit 0.
- `pnpm test`: **101 lulus**, 0 gagal, 0 dilewati.
- Putaran browser baru: **24/24 lulus**, 0 gagal; delapan kasus pada masing-masing
  viewport 1366px, 820px, dan 390px, Chromium **152.0.7977.64**.
- Waktu nyata browser: **2026-10-16 12:59:49.818–13:00:08.761 UTC**.
- Bukti khusus putaran:
  `generated-artifacts/scenario-ui/runs/2026-10-16T12-59-49.818Z/report.json`
  dan enam screenshot Buy/Sell di folder yang sama (semuanya ignored).

Ini putaran penuh setelah koreksi ekspektasi fixture, bukan gabungan putaran
sebagian terdahulu. Angka 18 kasus selesai sebelumnya bukan dasar hasil ini.
Hasil ini terbatas pada fixture sintetis/viewport emulasi, bukan perangkat asli,
Safari/Firefox atau integrasi pasar nyata. Build juga mengeluarkan peringatan
PostCSS dan bundle besar yang tidak menggagalkan pemeriksaan.
