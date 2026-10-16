# Catatan integrasi data Newsmaker untuk MRG tanpa AI

## Koreksi kebutuhan pivot/Fibonacci
Sumber sudah ditemukan pada halaman resmi
https://www.newsmaker.id/id/tools/pivot-fibonacci.
Kalkulator Newsmaker menghitung level di browser dari OHLC. Jadi tidak adanya
kolom level dalam respons historical-data bukan penghalang integrasi.
Tidak perlu meminta API pivot/Fibonacci baru. MRG memakai rumus numerik yang
diverifikasi terhadap kalkulator publik tersebut, termasuk Woodie berbasis open
dan Fibonacci dua arah. Acuan otomatis MRG adalah candle LGD D1 tertutup terakhir,
bukan swing pilihan pengguna dan bukan harga XUL10 yang identik.

## Sumber yang sudah tersedia — tidak perlu dikirim ulang
- Daftar dan isi artikel Newsmaker.
- Kalender ekonomi, harga berjalan, dan riwayat harga.
- Respons `historical-data` berisi OHLC, tanggal dan kategori termasuk LGD Daily.

## Hasil pemeriksaan respons nyata
Daftar berita berisi identitas, judul, kategori, sumber, penulis, gambar dan waktu.
Detail menambah `content_id` dan `content_en`. Pada respons yang diperiksa belum
ada penandaan dampak redaksi, waktu peninjauan, atau versi penilaian.
Kategori Gold/Market Analysis bukan dengan sendirinya penilaian risiko.
Respons historis yang diperiksa belum mengirim level pivot/Fibonacci siap pakai.
Ini temuan pada respons yang diperiksa, bukan klaim bahwa data tidak ada di sistem.

## Yang perlu dikonfirmasi programmer/redaksi
1. **Penilaian berita:** apakah ada sumber penandaan redaksi yang belum dicakup
   dokumen? Jika ada, berikan lokasi yang resmi dan satu contoh respons yang
   sudah disamarkan bila mengandung identitas privat. Jangan kirim token.
2. Jika penandaan belum diekspos, sepakati tambahan data pada API yang sudah ada:
   artikel dan instrumen relevan, status telah ditinjau, tingkat ketidakpastian,
   alasan singkat, kutipan isi, waktu tinjau, masa berlaku, dan versi isi/penilaian.
   `covered` berarti ditelaah tanpa penanda ketidakpastian tinggi, bukan aman/netral.
   Arah Buy/Sell bukan tugas redaksi atau MRG; pengguna tetap memilih.
3. **Pivot/Fibonacci:** sumber dan rumus sudah diverifikasi; tidak perlu
   dikirim ulang. Pemetaan acuan level ke parameter simulasi masih perlu
   disepakati, berbeda dari ketersediaan data/rumus.
4. Jelaskan masa berlaku/revisi dan cara mengakses data terkait dengan token
   Newsmaker yang sudah dikonfigurasi. Tidak perlu akses broker atau CMS baru.

## Perilaku MRG sampai data siap
- Tidak memakai AI atau mengubah ketiadaan penilaian menjadi netral.
- Simulasi default/manual Buy dan Sell dari harga XUL10 tetap bisa digunakan.
- Sesuai persetujuan pengguna, saran terbatas Linear maksimal dua layer dapat
  tersedia jika sumber wajib segar dan lolos kalender/modal; label dampak berita
  belum dinilai tetap terlihat. Ini bukan penilaian pasar lengkap.
- Pivot/Fibonacci dapat ditampilkan
  sebagai referensi tetapi belum mengubah parameter. LGD Daily tidak dianggap
  identik dengan XUL10.

Dokumen ini usulan kebutuhan integrasi, bukan kontrak API yang sudah aktif.
Pemetaan tag/level ke perubahan strategi, target, jarak dan layer perlu disepakati
sebelum diterapkan. Jangan menambahkan pekerjaan kurasi kepada pengguna kalkulator.
