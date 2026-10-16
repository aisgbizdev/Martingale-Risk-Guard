# MRG: kalkulator, bukan dashboard

## Yang diserahkan dalam koreksi ini

- Satu alur enam parameter → Cek Risiko → hasil inline; tidak ada mode baru.
- Navigasi Ringkasan, Posisi, Analisis, dan tautan menuju halaman hasil terpisah dilepas dari kalkulator.
- Halaman lama tidak dihapus/di-redirect. Catatan lokal dan draft tidak direset.
- Skor studi, default saat ini, konfirmasi penggunaan D1, dan bukti snapshot tidak diubah.
- Hasil studi tidak diklaim sebagai analisis fundamental atau risiko akun realtime.

## Pemeriksaan versi yang disajikan

Pada 16 Oktober 2026, request ke domain development yang disediakan lingkungan menunjukkan HTML Vite dan modul router yang memetakan `/` ke Home, `/live` ke LiveOverview, dan `/positions` ke PositionsPage. Sebelum koreksi ini, modul LiveShell yang benar-benar dilayani masih memiliki menu Opsional; homepage juga masih memiliki tautan dashboard di footer. Ini merupakan kerumitan nyata dalam sumber yang disajikan, bukan alasan menyalahkan pengguna.

Screenshot pengguna dengan tiga tab penuh tidak cocok dengan modul yang diambil dalam pemeriksaan ini. Penyebab pasti perbedaan sesi/screenshot itu belum terbukti. Service worker hanya diregistrasikan oleh build production; navigasi worker memakai network-first dan fallback shell ketika transport/server gagal. Tidak dilakukan penghapusan cache, storage, atau perubahan production.

## Contoh konkret untuk persetujuan pengaruh analisis pasar

**Ini bahan diskusi, bukan rumus baru yang sudah diaktifkan.**

### Input yang sama seperti MRG dasar

Modal skenario USD 200.000; Linear Averaging; target 30 poin; maksimal 3 layer; Pemula; kondisi Sideways. Ini contoh pengujian, bukan anjuran modal/setoran atau parameter trading.

Endpoint kalkulator yang ada menghasilkan skor studi **25/100**, label internal AMAN (ditampilkan sebagai risiko relatif rendah). Jika hanya kondisi input diganti menjadi Trending, aturan yang sama menghasilkan **35/100**. Angka ini terverifikasi dari endpoint dalam koreksi ini; bukan kalibrasi risiko akun atau hasil prediksi.

### Data teramati dari sumber yang sudah terhubung

Snapshot Newsmaker yang diambil 16 Oktober 2026:

- LGD Daily D1 diterima 08:12:10 UTC / 15:12:10 WIB, candle terakhir tertutup 15 Oktober 2026.
- Close 4.170,27 < MA20 4.201,7785 < MA50 4.334,3842, sehingga referensi tren turun.
- ATR14 81,7438 dibanding median pembanding 91,8921: rentang referensi lebih kecil. Tidak berarti posisi aman.
- Kalender berstatus ready/lengkap, 122 agenda; waktu pembuatan 08:12:11 UTC. Jumlah agenda bukan jumlah rilis berisiko di dekat waktu simulasi.
- Feed berita berstatus ready, 5 item tersedia. Ini hanya bukti ketersediaan feed, bukan bukti bahwa fundamental sudah ditafsirkan.

LGD adalah referensi emas, bukan harga/kontrak XUL10 identik. Angka snapshot di atas adalah historis pada waktu pemeriksaan, bukan harga sekarang.

### Aturan yang sudah ada, tetap berlaku

Referensi close/MA searah dapat menawarkan Trending dengan konfirmasi pengguna. Tidak otomatis mengganti kondisi yang dipilih. Bila diterapkan pada contoh ini, perubahan 25 → 35 datang dari penggantian input Sideways → Trending menurut aturan lama; bukan tambahan bobot volatilitas/berita.

ATR dan kalender memberi peringatan tersendiri tanpa mengubah skor. Tidak ada interpretasi teks berita ke skor saat ini.

### Usulan pengayaan yang perlu disepakati dahulu

Pengguna tetap mengisi skenario lalu sekali menekan Cek Risiko. Di belakang, penilaian menggabungkan aturan skenario dan bukti pasar yang bisa ditelusuri:

| Bahan | Pengaruh yang diusulkan terhadap alasan hasil | Batas |
|---|---|---|
| Referensi tren D1 | Jelaskan bahwa asumsi Sideways pada contoh tidak sejalan dengan referensi yang sedang trending. | Tidak menyatakan tren pasti melawan pengguna karena kalkulator belum punya arah buy/sell. |
| ATR | Jelaskan perubahan lebar pergerakan referensi dibanding baseline, untuk kehati-hatian menambah layer. | Tidak menghitung jarak layer/margin akun atau menurunkan risiko hanya karena ATR lebih kecil. |
| Agenda USD high impact dekat waktu evaluasi | Beri peringatan ketidakpastian di sekitar rilis, dengan judul, jam, dan sumber yang jelas. | Bukan prediksi arah; contoh kondisi rilis ini hipotetis, tidak diklaim ada di snapshot di atas. |
| Berita fundamental Newsmaker | Kaitkan fakta/konteks artikel yang relevan dengan alasan kehati-hatian, menyertakan artikel dan waktu publikasi. | Definisi relevansi, aturan interpretasi, dan masa berlaku belum disetujui. Judul artikel saja tidak membuktikan sentimen atau risiko. |

**Hasil contoh yang diusulkan:** “Skor dasar skenario 25/100. Asumsi Sideways berbeda dari referensi tren harian yang sedang turun; hasil dasar belum mewakili keseluruhan kondisi pasar. Dasar fundamental belum dapat dinilai otomatis dengan aturan yang disepakati.” Bukan “skor realtime 25” atau “posisi aman.”

Keputusan yang masih diperlukan sebelum membuat penilaian gabungan: pengaruh pasar cukup pada alasan/peringatan atau juga pada status akhir; jika status/skor berubah, tentukan aturan serta contoh pembandingnya dahulu. Otomatisasi kondisi pasar perlu menjelaskan perubahan dari persetujuan D1 sebelumnya. Jangan menambahkan model AI, bobot, mode, input jurnal, atau klaim rekomendasi transaksi tanpa kesepakatan.

## Default dan keterbatasan

Default versi yang sedang dipakai sebelum koreksi adalah Linear Averaging, 30 poin, 3 layer, Pemula, modal/kondisi belum diisi. Default ini dipertahankan, bukan diam-diam diganti. Brief embrio menyebut default 5 layer, sedangkan implementasi yang telah dipakai sekarang 3; mengembalikan default tertentu perlu keputusan eksplisit, bukan dianggap perubahan kosmetik.

Data yang gagal/usang harus dinyatakan tidak lengkap. Skor dasar tetap dapat dihitung dari pilihan manual, tetapi tidak boleh dianggap hasil penilaian realtime lengkap.
