# Penilaian berita untuk saran modal — tanpa AI

## Jalur aktif

Pengguna menetapkan MRG sebagai edukasi, bukan penjual sinyal, dan tidak ingin
analisis AI. Jalur produksi `news.ts` tidak lagi mengimpor atau menjalankan
pembaca AI. Rahasia/integrasi global tidak dihapus karena dapat dipakai produk lain.
Artikel tetap diambil dari API Newsmaker. Status berita tersedia berbeda dari
status penilaian dampak redaksi.

Contoh kontrak berita yang diberikan belum mengekspos penandaan dampak editorial.
Karena itu fundamental dinyatakan belum lengkap; tidak ada asumsi netral,
pengganti dengan kata kunci judul, atau penilaian yang dibuat-buat. Saran pasar
lengkap tetap dibatasi. Integrasi penandaan redaksi menunggu kontrak yang nyata.

Kalkulator visual dapat membuat simulasi manual/default dari harga XUL10 segar
untuk Buy maupun Sell. Ini bukan saran pasar otomatis. Jarak default 30 poin
adalah asumsi simulasi eksplisit, bukan hasil pivot/Fibonacci atau temuan studi.
Simulasi Dasar dan aturan historisnya tetap tersedia terpisah sebagai rincian.
Grafik pasar OANDA XAUUSD hanya referensi; diagram skenario memakai XUL10.

## Arsip pendekatan AI — tidak aktif

Bagian berikut mendokumentasikan pendekatan terdahulu, bukan layanan produksi
atau kontrak biaya yang dipakai kalkulator sekarang.

Paket pada `mrg-saran-modal-review.html` disetujui pengguna pada 16 Oktober 2026.
Ini persetujuan heuristik simulasi, bukan kalibrasi studi atau spesifikasi broker.

## Pembacaan otomatis, bukan isian kurasi manual

Pengguna memilih pembacaan otomatis setelah saran terhenti pada daftar editorial
yang kosong. Jalur aktif memakai `automatic-fundamental.ts` dan `news-ai.ts`.
`editorial-records.ts` dan validator lama tetap untuk kompatibilitas; tidak
menjadi prasyarat layanan aktif dan tidak diisi hasil AI seolah peninjauan manusia.

Replit AI Integrations menyediakan OpenAI (`gpt-5.4-mini`); tidak perlu API key
pribadi. Penggunaan dibebankan ke kredit Replit. Koneksi yang belum tersedia tidak
meruntuhkan API atau kalkulator manual: fundamental tetap belum lengkap.

Badan artikel diambil dari API resmi `/berita/show/{slug}`, dinormalisasi ke teks.
AI hanya membaca data artikel dan waktu evaluasi, bukan modal atau catatan akun.
Prompt memisahkan instruksi sistem dari konten tidak tepercaya; model tanpa alat
tidak boleh mengikuti instruksi dalam artikel, memprediksi harga, atau menghitung lot.
Hasil JSON wajib berisi identitas, relevansi, klasifikasi, kutipan dan alasan.

Server membagi seluruh badan menjadi blok beridentitas tanpa membuang teks. AI
memilih ID kutipan, bukan mengetik ulang kutipan; server mengambil teks aslinya.
Server memeriksa kelengkapan satu hasil per artikel, klasifikasi, kutipan persis
di badan yang dibaca, hash isi, identitas dan tanggal. Asal `reviewMethod: ai`,
model dan versi analisis ikut disimpan dalam bukti yang ditampilkan. `covered`
berarti artikel telah ditelaah tanpa penanda tinggi, **bukan netral, aman, atau
verifikasi kebenaran berita**. Artikel tidak relevan tidak dianggap cakupan emas.
`unassessed` atau gagal validasi tidak pernah diubah menjadi `covered`.
Kutipan cocok tidak membuktikan interpretasi benar; UI menyebut hasil AI bisa keliru.

Daftar tetap dibatasi maksimal delapan artikel tersaring dari halaman terbaru,
bukan klaim seluruh pasar telah dicakup. Semua artikel terpilih ≤24 jam harus
memiliki satu penilaian otomatis yang cocok. Duplikat/konflik, kutipan tidak cocok, revisi isi,
artikel gagal dimuat, waktu tidak valid, atau cakupan kosong memblokir saran
lengkap. Artikel dan penilaian kedaluwarsa tidak diteruskan sebagai netral.
Status feed `ready` terpisah dari status fundamental `assessed`.

Analisis berjalan dalam batch latar belakang; UI menampilkan proses dan mengecek
ulang konteks setiap 2 detik hanya selama proses aktif. Harga tetap diperbarui
terpisah. Hasil tidak otomatis diterapkan pada snapshot pengguna.

### Batas ukuran, biaya dan kesegaran
- Maksimal 8 badan artikel; masing-masing 12.000 karakter, batch 40.000 karakter.
  Artikel tidak dipotong lalu diklaim telah dibaca penuh.
- Maksimal 8 panggilan dan 120.000 karakter input per jam **per proses**, tanpa
  retry SDK berbayar otomatis; timeout SDK 25 detik, deadline batch 30 detik.
- Satu batch AI sekaligus, pengambilan artikel paralel maksimal dua.
- Cache maksimal 128 hasil, berdasarkan slug, waktu publikasi, hash dua versi isi,
  model dan versi prompt. Hasil berlaku 30 menit, tidak melampaui usia publikasi
  24 jam. Abstain disimpan 5 menit, kegagalan layanan diberi jeda 1 menit.
- Membaca cache/tick baru/mengubah modal tidak memperpanjang masa berlaku bukti
  atau memanggil model lagi untuk isi yang identik.
- Cache dan kuota berada dalam memori; restart atau beberapa proses tidak berbagi
  kuota. Ini bukan batas tagihan global akun. Pemantauan/budget terpusat membutuhkan
  pengembangan tersendiri; jangan mengklaim mekanisme ini sebagai hard cap tagihan.

## Batas model

Kontrak simulasi: perubahan harga 1,00 = 1 poin, US$100/poin/lot,
margin US$2.000/lot. Lot awal 0,1; kandidat 2–3 layer; target floor(0,25×ATR),
jarak ceil(0,5×ATR), basis LGD D1 yang diterima sebagai heuristik.
Saringan margin ≤20%, stress ≤10%; stress satu jarak setelah layer terakhir.
Tren D1 searah atau fundamental tinggi membatasi 2 layer dan tanpa Martingale.
Mixed tidak dianggap Sideways. Kandidat dipilih berdasarkan layer terbesar yang
lolos, lalu paparan terkecil. Tidak ada PF/ROM/ER, skor aman, biaya, atau stop-out
yang dipinjam dari studi. Manual mempertahankan default dan hitungan studi.

Snapshot dibekukan saat tombol ditekan; menerapkan usulan adalah aksi eksplisit,
bukan penggantian input manual. Modal berubah mengharuskan hitung ulang.
