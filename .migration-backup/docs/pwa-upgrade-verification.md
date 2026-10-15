# Pembaruan PWA dan catatan lokal

## Status

Lulus di fixture build produksi lokal, desktop headless Chromium:

- 30 pemeriksaan upgrade/cache hangat: `npm run test:pwa-upgrade`.
- 30 pemeriksaan PWA yang sudah ada: `npm run test:pwa`.
- Build produksi dan TypeScript berhasil.

Ini **bukan** bukti pemasangan atau pembaruan pada Android/iPhone asli,
Safari, launcher OS, mode standalone nyata, atau deployment produksi.
Tidak ada publish dan tidak ada perubahan schema, model risiko, maupun feed.

## Bukti yang diperiksa

Suite membangun A dari snapshot kode sebelumnya (`HEAD^` saat pengujian)
dan B dari workspace saat ini. Keduanya build Vite produksi dengan probe
versi khusus fixture pada HTML dan JavaScript. A memakai algoritme versi
cache historis; B memakai pembentukan versi cache saat ini.

Satu origin, satu profil Chromium dan satu registrasi service worker dipakai
sepanjang transisi. Cache maupun localStorage tidak dikosongkan.

1. A berjalan dengan shell/aset yang sudah dicache. Catatan sintetis buy
   dan sell, waktu masuk, batas, modal/ekuitas, serta skenario kalkulator
   benar-benar dibaca UI.
2. Unduhan aset B dibuat gagal. B tidak memiliki shell lengkap dan tidak
   menggantikan cadangan A. A tetap dapat dimuat ulang offline.
3. Koneksi dipulihkan; registrasi yang sama mencoba kembali. B aktif,
   HTML dan JavaScript berasal dari B, seluruh aset entry B ada, dan cache
   serta aset unik A tidak tercampur ke cache B.
4. Semua key/nilai localStorage dibandingkan byte-per-byte, termasuk
   catatan, timestamps, pengaturan, studi, serta penanda fitur lain.
   Studi yang sama masih tampil dengan nilai 25/100.
5. Cache fitur lain tetap ada. Cadangan navigasi hanya memakai cache
   milik worker MRG, bukan shell fitur lain pada origin yang sama.
6. Error navigasi 503 memakai shell B yang sudah selesai dicache. Error
   API tetap gagal; indeks yang membutuhkan harga menjadi belum tersedia,
   bukan menampilkan harga lama sebagai data live.
7. Error navigasi 403 tidak ditutupi dengan cadangan shell.
8. B dapat dimuat ulang offline, memberi status offline/jeda harga,
   mempertahankan catatan, lalu kembali meminta API jaringan saat tersambung.
9. Perubahan worker saja, manifest saja, atau ikon ber-URL tetap juga
   mengubah versi cache. Output yang tidak berubah dapat distamp ulang
   tanpa menghasilkan versi baru.

Offline dibuat dengan memutus transport fixture dan CDP offline. Flag OS
`navigator.onLine` dimodelkan secara eksplisit karena CDP tidak konsisten
mempertahankannya setelah navigasi. Ini bukan pengujian airplane mode.

## Perilaku pembaruan

Worker baru mengaktifkan cache setelah seluruh precache berhasil. Versi
cache mencakup HTML, worker, aset entry serta file statis seperti manifest
dan ikon; tidak hanya nama bundle JavaScript.

Halaman yang sudah terbuka **tidak direload otomatis** saat worker baru
aktif. Desain baru dipakai pada pemuatan ulang/navigasi halaman penuh
berikutnya. Catatan yang sudah disimpan tetap ada; draft form dan snapshot
simulasi yang hanya ada di memori bukan catatan persisten. Jangan menjanjikan
draft bertahan setelah pengguna memilih reload.

Cadangan shell adalah cadangan UI, bukan cadangan data pasar. API market
tidak disimpan atau diganti respons sukses lama oleh service worker.
Cache lama milik MRG dibersihkan saat aktivasi berhasil, bukan localStorage.
Cache candidate kosong dari pemasangan gagal dapat tersisa sampai aktivasi
berhasil berikutnya; tidak dianggap sebagai shell yang siap digunakan.

## Menjalankan ulang dan lokasi bukti

Dengan workflow aplikasi berjalan dan development origin tersedia:

```sh
npm run test:pwa-upgrade
```

`generated-artifacts/pwa-upgrade/checks.json` menyimpan versi browser,
snapshot sumber historis, nama cache, aset, hasil, jejak request serta
state HTML/JS/cache. Screenshot tersedia di direktori yang sama.
Build/profil/source fixture berada dalam subdirektori run terisolasi.
Semua dikecualikan dari Git dan deployment. Tidak memakai data pengguna,
secrets, profil pribadi, atau unggahan sebagai fixture.

Suite tidak memindahkan catatan antar-origin/perangkat. Bukti upgrade
desktop ini tidak mengubah status verifikasi perangkat native yang
dicatat di `docs/native-panel-verification.md`.
