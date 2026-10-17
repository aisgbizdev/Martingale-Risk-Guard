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

Pengguna menegaskan bahwa penyesuaian desain web dan mobile berlaku untuk tampilan MRG lainnya juga, bukan hanya kalkulator.

**Why:** Pengguna mengoreksi lingkup dengan “maksud gw desugnnya juga yg lainnya bukan itu aja, sesuaikn dengamn saat di webbase atau di mobile”.

**How to apply:** Periksa header, panel pasar/teknikal, berita, kalender, tabel dan hasil pada ukuran perangkat yang relevan; jangan mengklaim seluruh aplikasi responsif hanya dari perapian kalkulator.

Navigasi bahan analisis tidak boleh membuat pengguna terjebak atau membuang isian kalkulator yang belum dihitung.

**Why:** Pengguna melaporkan bahwa setelah masuk ke indikator D1 ia tidak bisa kembali dan tidak menemukan tombol pilihan.

**How to apply:** Pertahankan jalan kembali dan pilihan bagian analisis ketika konten panjang digulir. Bedakan pemulihan isian saat pindah halaman dari menghidupkan kembali hasil saran lama sebagai saran pasar terkini.

Harga terakhir untuk edukasi akhir pekan tidak membuktikan penutupan resmi atau status market tutup.

**Why:** Dokumen feed yang diberikan memuat tick dan waktu sumber, tetapi belum menetapkan kalender sesi/libur XUL10 atau atribut official close. Pengguna ingin MRG tetap berguna Sabtu–Minggu tanpa mengarang data.

**How to apply:** Gunakan acuan historis yang dilabeli jelas dan tombol simulasi, bukan memperpanjang kesegaran live. Jendela akhir pekan adalah aturan penggunaan edukasi, bukan jadwal bursa; verifikasi sumber tambahan sebelum memberi klaim penutupan resmi atau memperluas ke hari libur kerja.

Pengguna meminta grafik langsung dimunculkan sebagai panduan, termasuk ketika orang membuka MRG pada Sabtu–Minggu.

**Why:** Pengguna mengatakan “termasuk grafik juga dimunculkan aja langsung bro, jd ada panduannya kan?” setelah membahas penggunaan akhir pekan.

**How to apply:** Jangan menyembunyikan grafik utama di balik tombol opsional. Bedakan chart referensi TradingView dari diagram skenario XUL10, dan harga terakhir dari harga live atau penutupan resmi yang terverifikasi.

Kalkulator harus didasari teknikal, fundamental/berita, dan kalender ekonomi, dengan default seperti Simulasi Dasar. Pengguna menjelaskan bahwa isian seperti target poin, strategi Martingale/averaging, dan layer dapat menyesuaikan konteks pasar saat evaluasi, bukan hanya hasil penilaian setelah input manual. Ia kemudian menyebut pilihan mengisi manual atau memakai saran MRG berdasarkan teknikal, fundamental, harga berjalan, berita, dan kalender, menggunakan sumber Newsmaker, TradingView, serta Investing yang telah diberikan. Alur saran diperjelas: pengguna cukup menulis modal yang dimiliki, lalu keluar saran; “mungkin modalnya aja yg bisa diisi bebas”.

**Why:** Pengguna menegaskan bahwa menyederhanakan kalkulator tidak berarti menghilangkan dasar analisis pasar yang merupakan tujuan pengembangannya.

**How to apply:** Jangan menyamakan menampilkan data pasar dengan menggunakannya untuk penilaian. Rancang saran yang dapat dimulai dengan modal saja; enam input manual tidak boleh menjadi prasyarat untuk memperoleh saran. Pilihan isi manual tetap berada dalam kalkulator yang sama, bukan dua halaman atau dashboard. Pilihan ini kini berasal dari pengguna, berbeda dengan usulan dua mode terpisah sebelumnya yang ditarik. Aturan pemetaan data, batas, dan persetujuan pengguna tetap perlu disepakati sebelum implementasi. Jangan mengarang pengalaman pengguna atau kapasitas akun dari modal dan data pasar saja; asumsi harus eksplisit. Sepakati aturan pengaruh data terhadap hasil dan makna default sebelum mengubah perhitungan; pertahankan aturan dasar tanpa menyebutnya analisis realtime. Pengguna mengulangi bahwa “sederhana” berarti fungsi dan cara penggunaan seperti MRG dasar, bukan hanya bentuknya.

Pengguna mengonfirmasi margin/jaminan US$1.000 per 1 lot, menggantikan asumsi US$2.000 sebelumnya. Nilai US$100 per poin untuk 1 lot tetap berlaku, dengan 1 poin = perubahan harga 1,00 (contoh 4.500 → 4.501).

**Why:** Pengguna ingin menetapkan dasar kontrak untuk kalkulator bermasukan modal, bukan mengintegrasikan broker, dan secara eksplisit mengonfirmasi koreksi margin menjadi US$1.000 per lot.

**How to apply:** Perlakukan sebagai asumsi simulasi pengguna, bukan verifikasi spesifikasi broker. Skala nilai poin dan margin secara proporsional terhadap lot. Margin bukan batas kerugian atau bukti kemampuan akun menahan layer; biaya dan stop-out belum ditetapkan.

Pengguna memperjelas bahwa Saran MRG harus menghitung lot awal secara otomatis dari modal, konteks harga dan batas skenario, bukan mematok 1 atau 0,1 lot. Hasil harus menunjukkan lot awal dan harga entry setiap layer. Perubahan harga 4.500 ke 4.501 tetap 1 poin, bernilai US$100 untung/rugi untuk 1 lot, terpisah dari margin requirement US$1.000.

**Why:** Pengguna menjelaskan bahwa mengganti angka tetap 0,1 menjadi 1 belum memenuhi tujuan hitungan otomatis; yang dibutuhkan adalah ukuran awal dan level entry yang mengikuti skenario.

**How to apply:** Pisahkan lot default pembanding manual dari sizing Saran MRG. Jangan menyamakan kapasitas margin teoretis (misalnya US$300.000 dibagi US$1.000 = 300 lot) dengan jumlah lot yang layak; floating loss dan seluruh layer tetap diperhitungkan. Langkah lot adalah asumsi terpisah yang harus jelas, bukan alasan mengunci lot awal otomatis.

Pengguna menyetujui seluruh paket aturan saran modal pada 16 Oktober 2026 setelah lot awal, budget margin/stress, faktor ATR, pembatas strategi, dan dasar penilaian editorial dijelaskan secara eksplisit.

**Why:** Pengguna memilih “Setujui seluruh paket aturan”; persetujuan sebelumnya terhadap pengayaan D1 saja memang belum mencakup heuristik saran modal.

**How to apply:** Rujuk paket pada `docs/mrg-saran-modal-review.html`. Persetujuan aturan editorial tidak berarti artikel aktual sudah ditinjau; jangan membuat penandaan isi atau menyebut fundamental lengkap tanpa bukti yang cocok.

Pengguna memilih melengkapi pembacaan berita otomatis terlebih dahulu, bukan menjadikan simulasi teknikal dan kalender sebagai pengganti fundamental.

**Why:** Saran terhenti karena mewajibkan kurasi manual yang belum tersedia, padahal pengguna menginginkan saran dari modal saja dan sumber Newsmaker yang sudah diberikan.

**How to apply:** Penilaian isi berita tidak boleh bergantung pada pengisian manual per artikel. Tetap pertahankan bukti, asal penilaian, dan kegagalan eksplisit; jangan sekadar menghapus penghalang atau menganggap berita netral. Pilihan otomatis tidak dengan sendirinya menetapkan vendor AI atau persetujuan biaya.

Pengguna menegaskan “jgn menggunakan ai” untuk analisis MRG dan memilih tetap tanpa AI ketika ditawari mengaktifkan kembali pembacaan berita AI. Ia mengusulkan tampilan dan beberapa fitur seperti TradePilot, tetapi esensi tetap konsep MRG, serta meminta diskusi dahulu.

**Why:** Pengguna mengatakan “gw gak mau menggunakan ai” dan “esensi nya konsep mrg, design dan beberapa fiturenya mirip tradepilot”.

**How to apply:** Jangan menganggap persetujuan pembacaan berita otomatis sebelumnya atau penugasan ulang rancangan AI lama sebagai persetujuan memakai AI. Bahas pengganti berbasis aturan dan data terstruktur, termasuk keterbatasan interpretasi berita bebas; jangan menonaktifkan atau mengganti implementasi sebelum arah disepakati. Referensi TradePilot bukan izin menyalin produk atau menambah dashboard/sinyal di luar kalkulator MRG.

Pengguna menyetujui analisis berita dan kalender berbasis aturan tanpa AI: perbandingan angka kalender yang kompatibel dan pencocokan topik isi berita dengan agenda, bukan pengganti penilaian dampak redaksi.

**Why:** Pengguna bertanya “berita dan kalender ekonomi dianalisa aja bisa gak tanpa ai?” lalu memilih “Lanjutkan sesuai usulan tanpa AI” setelah keterbatasan dijelaskan.

**How to apply:** Jangan mengubah pencocokan topik menjadi klaim arah emas/USD, bukti rilis sudah terjadi, atau fundamental lengkap. Pertahankan status dampak belum dinilai, batas Linear dua layer, pemeriksaan sumber/modal/kalender, dan skenario yang hanya diperbarui melalui tindakan pengguna.

Pengguna memilih penandaan redaksi Newsmaker agar berita ikut memengaruhi perhitungan, dan menegaskan “warna tetap mengikuti skin newsmaker jgn kearah TP”.

**Why:** Pengguna mengonfirmasi pilihan pengganti analisis AI dan membatasi referensi TradePilot hanya pada rancangan interaksi/tampilan, bukan identitas warna.

**How to apply:** Pertahankan skin Newsmaker tanpa mengasumsikan tema gelap atau aksen TradePilot. Perlukan kontrak data penandaan redaksi yang nyata, bukan mengembalikan kewajiban pengguna mengisi atau programmer mengedit penilaian artikel satu per satu. Penandaan yang hilang tidak boleh dianggap netral.

Periksa dokumentasi API Newsmaker dan feed yang sudah dikirim sebelum meminta pengguna atau programmer menyediakan ulang sumber data.

**Why:** Pengguna berulang kali mengingatkan bahwa API berita, harga, dan data lain sudah diberikan dalam dokumentasi sebelumnya.

**How to apply:** Bedakan endpoint sumber yang memang terdokumentasi dari atribut penilaian tambahan yang belum terbukti tersedia. Jangan menganggap ketiadaan atribut interpretasi berarti API berita tidak ada, dan jangan mengklaim atribut tersebut tersedia tanpa verifikasi.

MRG adalah edukasi, bukan penjual sinyal. Buy dan Sell wajib tersedia setara, dan pengguna bebas memilih arah sendiri.

**Why:** Pengguna menegaskan “jgn hanya buy saja, karena kita tidak jualan signal, kita edukasi orang, mereka mau pilih yg mana ya silahkan”.

**How to apply:** Harga berjalan, grafik skenario, layer, TP, dan perhitungan risiko harus mendukung kedua arah. Analisis pasar menjelaskan konteks dan batas skenario, bukan memilihkan arah, memberi label arah terbaik, atau menghilangkan salah satu pilihan.

Jangan menganggap tidak adanya kolom level jadi dalam API sebagai bukti integrasi pivot/Fibonacci membutuhkan API baru. Periksa juga kalkulator publik Newsmaker dan cara data mentahnya diolah.

**Why:** Setelah pengguna berulang kali menunjuk dokumentasi dan tampilan Newsmaker, ditemukan bahwa kalkulator resminya menghitung pivot/Fibonacci di browser dari OHLC API. Meminta hasil hitung siap pakai kepada programmer telah menjadi penghalang yang tidak perlu.

**How to apply:** Gunakan sumber data dan rumus yang sudah tersedia, bedakan verifikasi kesamaan rumus dari persetujuan aturan pengaruhnya terhadap skenario MRG, dan jangan menyamakan LGD Daily dengan XUL10. Temuan ini tidak berarti kategori berita sudah mengandung penilaian dampak.

Pengguna menyetujui saran terbatas Linear maksimal dua layer saat dampak berita belum dinilai, dengan peringatan jelas. Ia meminta tiga layer jika memungkinkan; jangan menafsirkan ini sebagai izin mengabaikan ketidakpastian.

**Why:** Pengguna memilih agar hasil tetap tersedia secara terbatas, bukan menunggu penandaan dampak redaksi untuk seluruh perhitungan. Fundamental yang belum dinilai tetap bukan netral.

**How to apply:** Pertahankan pemeriksaan harga/D1/kalender/sumber berita dan batas modal. Tiga layer otomatis memerlukan penilaian lengkap dan kondisi/modal yang memenuhi aturan lama; simulasi manual tiga layer tetap tersedia tanpa mengklaim kelayakan. Jangan mengendurkan batas dua layer hanya karena modal besar.

Pengguna memilih “Tetap referensi; perhitungan tetap ATR”, “Klasik; Fibonacci pembanding”, dan “D1 selesai terakhir, otomatis” untuk pivot/Fibonacci.

**Why:** Pengguna memilih batas ini setelah ditawari alternatif pemetaan jarak relatif dengan batas ATR. Tidak mengintegrasikan level ke target/jarak/layer adalah keputusan pengguna, bukan pekerjaan yang terlupakan.

**How to apply:** Jangan mengaktifkan pemetaan pivot/Fibonacci ke perhitungan atau mengusulkannya sebagai kewajiban tertunda tanpa persetujuan baru. Pertahankan batas sumber LGD Daily versus XUL10 dan jangan mengasumsikan high/low otomatis sebagai swing pilihan pengguna.
