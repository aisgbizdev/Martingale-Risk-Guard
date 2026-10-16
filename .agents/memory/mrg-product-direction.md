---
name: MRG product direction
description: User correction about retaining the original simulator as the foundation of realtime analytics.
---

MRG awal seperti di Simulasi Dasar adalah konsep dasar produk. Pengembangannya adalah menjadikan simulasi itu analitik berdasarkan harga realtime dengan bantuan KB yang ada, bukan menggantinya dengan alur pencatatan posisi dan pengaturan yang rumit.

**Why:** Pengguna mengatakan hasil pengembangan melenceng jauh dari konsep awal, pengisiannya sangat ribet dan tidak bisa dimengerti. Ia mengulangi agar tujuan dan misi dipahami dari diskusi awal, tanpa penyimpangan ulang yang menghabiskan token. Kesederhanaan alur awal merupakan kebutuhan produk, bukan sekadar persoalan warna atau tata letak.

**How to apply:** Mulai diskusi rancangan berikutnya dari input dan keluaran simulator awal. Bedakan pengayaan data otomatis dari penambahan pekerjaan manual pengguna. Sepakati dahulu makna/peran KB dan perubahan perhitungan; jangan menyamakan penambahan harga realtime dengan validasi angka risiko historis. Jangan menghapus fitur atau membangun ulang sebelum arah koreksi disepakati bersama pengguna.

Pengguna menyetujui seluruh rekomendasi D1–D3 dalam rancangan koreksi pada 16 Oktober 2026. Persetujuan ini mempertahankan aturan studi lama, bukan persetujuan kalibrasi baru, rekomendasi transaksi, atau penggabungan indeks posisi dengan skor simulator.

**Why:** Pengguna memilih “Setujui seluruh rekomendasi dan lanjutkan Build” setelah batas label, pengayaan D1, peringatan ATR/kalender, dan parameter sederhana dijelaskan.

**How to apply:** Gunakan keputusan di `docs/mrg-realtime-review.html` sebagai batas pengembangan lanjutan. Perubahan model/parameter fleksibel berskor tetap perlu pembahasan dan persetujuan terpisah.

Pengguna menyetujui satu halaman utama yang menyatukan enam isian simulator awal, konteks pasar, dan hasil Cek Risiko tanpa pindah halaman. Navigasi jurnal posisi tidak lagi ditonjolkan; catatan lama tetap dipertahankan.

**Why:** Pengguna kembali bingung dengan fungsi pada halaman Posisi dan merasa tidak sama dengan MRG lama, lalu menyetujui rancangan satu halaman.

**How to apply:** Pertahankan alur inti pada satu halaman adaptif: isian dan hasil berdampingan di layar besar, berurutan di HP. Chart, berita, dan rincian bersifat opsional; jangan memaksa seluruh isi muat dalam satu viewport ponsel.
