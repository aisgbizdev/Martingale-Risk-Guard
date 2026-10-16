# Cek Risiko sederhana — pemeriksaan 16 Oktober 2026

Dasar: pengguna menyetujui rekomendasi D1–D3 dalam `mrg-realtime-review.html`.
Aturan skor di `artifacts/api-server/src/rules.ts` tidak diubah.

## Acuan angka

Modal skenario USD 200.000, target 30, 3 layer, Berpengalaman:

| Strategi | Kondisi | Skor | Enum lama |
| --- | --- | --- | --- |
| Martingale | Trending | 70 | TIDAK LAYAK |
| Linear Averaging | Trending | 25 | AMAN |
| Martingale | Sideways | 55 | BERISIKO |
| Linear Averaging | Sideways | 15 | AMAN |

Keempatnya dicakup tes otomatis. POST melalui proxy ke `/api/calculate-risk`
juga mengonfirmasi contoh 70/TIDAK LAYAK. Ini kecocokan implementasi,
bukan validasi ilmiah, probabilitas kerugian, atau prediksi akun.

## Ketersediaan data

Tes `lib/mrg-shared/src/study-market.test.ts` mencakup referensi naik/turun,
campuran, candle terbuka/usang, data tidak koheren, offline, perubahan kunci
referensi, kalender parsial/usang, agenda tanpa waktu pasti, dan batas jendela
120 menit sebelum–15 menit sesudah. Peringatan ATR/kalender tidak mengubah skor.
Pemeriksaan seri OHLC, minimal 50 candle, dan gap lebih dari 7 hari tetap pada
adapter/tes analisis pasar lama.

Form tidak menganggap campuran atau data hilang sebagai Sideways. Saran D1
memerlukan konfirmasi, dicek ulang saat submit. Snapshot hanya disimpan di
memori selama sesi navigasi, dikaitkan dengan keenam parameter, dan selalu
dilabeli historis. Reload/tautan langsung tetap menghitung dari enam input URL,
tetapi secara eksplisit menyebut konteks/konfirmasi D1 tidak dipertahankan.
Tidak ada perubahan format atau kunci catatan lokal.

## Tampilan dan pemeriksaan kode

- Screenshot form ditinjau pada 390×844, 768×1024, dan 1440×1000: urutan sama,
  satu kolom pada ponsel, dua kolom parameter pada tablet/PC, tanpa bidang
  posisi wajib atau preview skor otomatis.
- Screenshot hasil contoh 70 pada 390×844 menunjukkan label, ringkasan, catatan
  perilaku, keterbatasan konteks tautan langsung, dan detail opsional.
- Ini pemeriksaan tampilan browser, bukan pengujian pengguna pemula nyata,
  perangkat fisik, native Back/swipe, atau PWA.
- `pnpm test`: 56 tes lulus; `pnpm run test:visual:unit`: 8 tes lulus.
- Pemeriksaan tipe MRG, API, deck, dan scripts lulus. Pemeriksaan tipe seluruh
  workspace masih gagal pada komponen bawaan Canvas `artifacts/mockup-sandbox`
  (`command.tsx`, `drawer.tsx`, `input-otp.tsx`, `spinner.tsx`), di luar alur ini.
- Fixture pemeriksaan live lama diarahkan ke `/live`; `/basic` tetap tersedia.
  Baseline screenshot lama tidak ditimpa atau disetujui ulang otomatis.

Rute `/positions`, `/analysis`, `/literasi`, `/privacy`, `/terms` dan fitur lama
tetap tersedia. PWA, performa, konflik antar-tab, kalibrasi tesis/parameter baru,
dan verifikasi perangkat fisik tidak termasuk perubahan ini.
