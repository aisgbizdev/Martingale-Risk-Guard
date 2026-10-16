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

Pengguna menyetujui satu halaman utama yang menyatukan enam isian simulator awal, konteks pasar, dan hasil Cek Risiko tanpa pindah halaman. Ia menegaskan kembali bahwa MRG hanya kalkulator sederhana: navigasi Ringkasan–Posisi–Analisis tetap membingungkan, bukan cukup dipindah ke menu opsional. Catatan lama tetap dipertahankan.

**Why:** Pengguna kembali bingung dengan fungsi pada halaman Posisi dan merasa tidak sama dengan MRG lama, lalu menyetujui rancangan satu halaman. Setelah perubahan ia kembali mengatakan hasilnya semakin rumit karena menu-menu yang tidak jelas.

**How to apply:** Pertahankan alur inti pada satu halaman adaptif: isian dan hasil berdampingan di layar besar, berurutan di HP. Jangan pertahankan menu dashboard yang bersaing dengan kalkulator. Konteks pasar dan rincian mendukung kalkulator, bukan membentuk aplikasi lain; jangan memaksa seluruh isi muat dalam satu viewport ponsel.

Kalkulator harus didasari teknikal, fundamental/berita, dan kalender ekonomi, dengan default seperti Simulasi Dasar. Pengguna menjelaskan bahwa isian seperti target poin, strategi Martingale/averaging, dan layer dapat menyesuaikan konteks pasar saat evaluasi, bukan hanya hasil penilaian setelah input manual. Ia kemudian menyebut pilihan mengisi manual atau memakai saran MRG berdasarkan teknikal, fundamental, harga berjalan, berita, dan kalender, menggunakan sumber Newsmaker, TradingView, serta Investing yang telah diberikan. Alur saran diperjelas: pengguna cukup menulis modal yang dimiliki, lalu keluar saran; “mungkin modalnya aja yg bisa diisi bebas”.

**Why:** Pengguna menegaskan bahwa menyederhanakan kalkulator tidak berarti menghilangkan dasar analisis pasar yang merupakan tujuan pengembangannya.

**How to apply:** Jangan menyamakan menampilkan data pasar dengan menggunakannya untuk penilaian. Rancang saran yang dapat dimulai dengan modal saja; enam input manual tidak boleh menjadi prasyarat untuk memperoleh saran. Pilihan isi manual tetap berada dalam kalkulator yang sama, bukan dua halaman atau dashboard. Pilihan ini kini berasal dari pengguna, berbeda dengan usulan dua mode terpisah sebelumnya yang ditarik. Aturan pemetaan data, batas, dan persetujuan pengguna tetap perlu disepakati sebelum implementasi. Jangan mengarang pengalaman pengguna atau kapasitas akun dari modal dan data pasar saja; asumsi harus eksplisit. Sepakati aturan pengaruh data terhadap hasil dan makna default sebelum mengubah perhitungan; pertahankan aturan dasar tanpa menyebutnya analisis realtime. Pengguna mengulangi bahwa “sederhana” berarti fungsi dan cara penggunaan seperti MRG dasar, bukan hanya bentuknya.

Pengguna menetapkan untuk simulasi USD: “1 pointnya 100 dolar” dan “marginnya perlot 2000 dollar utk jaminan”. Ia mengonfirmasi bahwa US$100 per poin berlaku untuk 1 lot, dengan 1 poin = perubahan harga 1,00 (contoh 4.500 → 4.501).

**Why:** Pengguna ingin menetapkan dasar kontrak untuk kalkulator bermasukan modal, bukan mengintegrasikan broker.

**How to apply:** Perlakukan sebagai asumsi simulasi pengguna, bukan verifikasi spesifikasi broker. Skala nilai poin dan margin secara proporsional terhadap lot. Margin bukan batas kerugian atau bukti kemampuan akun menahan layer; biaya dan stop-out belum ditetapkan.

Pengguna menyetujui seluruh paket aturan saran modal pada 16 Oktober 2026 setelah lot awal, budget margin/stress, faktor ATR, pembatas strategi, dan dasar penilaian editorial dijelaskan secara eksplisit.

**Why:** Pengguna memilih “Setujui seluruh paket aturan”; persetujuan sebelumnya terhadap pengayaan D1 saja memang belum mencakup heuristik saran modal.

**How to apply:** Rujuk paket pada `docs/mrg-saran-modal-review.html`. Persetujuan aturan editorial tidak berarti artikel aktual sudah ditinjau; jangan membuat penandaan isi atau menyebut fundamental lengkap tanpa bukti yang cocok.

Pengguna memilih melengkapi pembacaan berita otomatis terlebih dahulu, bukan menjadikan simulasi teknikal dan kalender sebagai pengganti fundamental.

**Why:** Saran terhenti karena mewajibkan kurasi manual yang belum tersedia, padahal pengguna menginginkan saran dari modal saja dan sumber Newsmaker yang sudah diberikan.

**How to apply:** Penilaian isi berita tidak boleh bergantung pada pengisian manual per artikel. Tetap pertahankan bukti, asal penilaian, dan kegagalan eksplisit; jangan sekadar menghapus penghalang atau menganggap berita netral. Pilihan otomatis tidak dengan sendirinya menetapkan vendor AI atau persetujuan biaya.

Pengguna kemudian menegaskan tidak ingin menggunakan AI untuk analisis MRG. Ia mengusulkan tampilan dan beberapa fitur seperti TradePilot, tetapi esensi tetap konsep MRG, serta meminta diskusi dahulu.

**Why:** Pengguna mengatakan “gw gak mau menggunakan ai” dan “esensi nya konsep mrg, design dan beberapa fiturenya mirip tradepilot”.

**How to apply:** Jangan menganggap persetujuan pembacaan berita otomatis sebelumnya sebagai persetujuan AI berkelanjutan. Bahas pengganti berbasis aturan dan data terstruktur, termasuk keterbatasan interpretasi berita bebas; jangan menonaktifkan atau mengganti implementasi sebelum arah disepakati. Referensi TradePilot bukan izin menyalin produk atau menambah dashboard/sinyal di luar kalkulator MRG.
