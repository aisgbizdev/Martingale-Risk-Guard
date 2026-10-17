# Acuan harga akhir pekan

## Bukti sumber
- Dokumentasi WebSocket Royal Assetindo yang diberikan menjelaskan `price`, bid/ask, OHLC intraday dan `date_time`. Tidak ada atribut settlement/penutupan resmi atau jadwal sesi/libur yang didokumentasikan.
- Dokumentasi Newsmaker menjelaskan cache historical pivot, bukan jaminan bahwa close LGD Daily identik dengan close XUL10.
- Dokumentasi TradingView yang diberikan secara eksplisit memisahkan widget visual dari feed harga backend.
- Karena itu, harga yang dipakai tetap tick XUL10 beserta waktu sumber aslinya. Tidak ada penggantian dengan XAUUSD/LGD, waktu respons server, atau klaim market pasti tutup.

## Aturan saat ini
- Harga live tetap memakai batas 20 detik yang lama, tanpa perubahan pemeriksaan kesegaran global.
- Jalur historis eksplisit tersedia Sabtu/Minggu menurut Asia/Jakarta. Ini jendela **penggunaan edukasi**, bukan kalender perdagangan.
- Tick harus berasal dari Newsmaker XUL10 dengan tanggal/zona waktu valid, harga positif, bertanggal Jumat atau Sabtu pada akhir pekan yang sama dan umur maksimal 72 jam. Jumat/Sabtu mencakup tick Jumat malam UTC yang jatuh Sabtu WIB; ini bukan bukti jam penutupan resmi.
- Respons provider harus berhasil dan pengguna online. Kutipan dari feed gagal, tanggal tak diketahui, sesi sebelumnya yang lebih lama, atau hari kerja tidak otomatis diizinkan.
- Kolom langsung menampilkan harga yang layak, sumber dan waktu WIB. Tombol berubah menjadi **Hitung simulasi historis**: pengguna tidak perlu mengetik harga atau mengisi form tambahan.
- Label menyatakan **bukan live**, bukan penutupan resmi, jadwal sesi belum terverifikasi dan risiko gap. Tidak memberi label otomatis “market tutup”.
- Berita, D1 dan kalender dinilai terhadap waktu evaluasi sekarang, bukan waktu tick. Dampak berita belum dinilai tetap maksimal Linear dua layer; batas margin/stress dan modal tidak berubah. Kegagalan data ini tetap menunda hasil pasar; studi manual/default tetap tersedia.
- Snapshot menyimpan basis beserta waktu harga; poll baru, akhir jendela, perubahan modal/arah atau harga live yang kembali tidak menggeser level lama. Hitung ulang diperlukan untuk hasil baru.
- Grafik TradingView tetap referensi visual terpisah. Diagram entry/layer/rata-rata/TP memakai XUL10 setelah perhitungan.

## Batas yang sengaja dipertahankan
Belum ada kalender sesi/libur resmi atau atribut official close yang terverifikasi. Tidak memperluas fallback otomatis ke hari libur kerja atau gangguan feed, tidak menyimpan tick lintas restart, dan tidak memakai AI maupun transaksi broker.

## Verifikasi
Unit/regresi bersama mencakup akhir pekan WIB, tick Jumat UTC/Sabtu WIB, waktu invalid/terlalu tua, sumber salah, feed gagal/offline, kembalinya live, Buy/Sell, saran terbatas, batas modal, berita/kalender/D1 yang kedaluwarsa dan snapshot tetap.
