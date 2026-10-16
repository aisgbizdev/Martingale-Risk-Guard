# Penilaian berita untuk saran modal

Paket pada `mrg-saran-modal-review.html` disetujui pengguna pada 16 Oktober 2026.
Ini persetujuan heuristik simulasi, bukan kalibrasi studi atau spesifikasi broker.

## Mengisi bukti tanpa dashboard baru

Tim editorial meninjau isi artikel emas/USD/makro dan menambah satu objek pada
`artifacts/api-server/src/market/editorial-records.ts`:

- `slug`, `publishedAt`: identitas dan timestamp persis dari API resmi.
- `reviewedAt`: waktu peninjauan ISO; tidak boleh sebelum publikasi atau di masa depan.
- `contentHash`: SHA256 dari `JSON.stringify([article.content, article.contentEn])`,
  setelah normalisasi teks oleh `getArticle`; gunakan fungsi `articleHash`.
- `excerpt`: kutipan persis dari isi, bukan judul saja.
- `rationale`: alasan relevansi emas/USD/makro dan dasar klasifikasi.
- `tag`: `high-uncertainty` untuk ketidakpastian tinggi, atau `covered` untuk
  konteks tercakup tanpa penanda tinggi. `covered` bukan sentimen netral.

Jangan menambah contoh hipotetis sebagai catatan aktif. Tidak ada catatan awal
karena belum ada penilaian isi yang disahkan. Perubahan catatan mengikuti proses
perubahan kode yang biasa; tidak ada input tambahan untuk pengguna kalkulator.

Daftar tetap dibatasi maksimal delapan artikel tersaring dari halaman terbaru,
bukan klaim seluruh pasar telah dicakup. Semua artikel terpilih ≤24 jam harus
memiliki satu penilaian cocok. Duplikat/konflik, kutipan tidak cocok, revisi isi,
artikel gagal dimuat, waktu tidak valid, atau cakupan kosong memblokir saran
lengkap. Artikel dan penilaian kedaluwarsa tidak diteruskan sebagai netral.
Status feed `ready` terpisah dari status fundamental `assessed`.

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
