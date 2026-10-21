import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Globe } from "lucide-react";
import { MRGBrandBar } from "@/components/live/mrg-brand-bar";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { Bilingual, Caveat, DataTable, Example, Formula, GuideSection, Sub } from "@/components/guide/guide-ui";

const SECTIONS: [string, string, string][] = [
  ["cara-pakai", "Cara pakai", "How to use"],
  ["strategi", "Strategi", "Strategies"],
  ["rata-rata", "Rata-rata", "Average"],
  ["pivot-fibo", "Pivot & Fibo", "Pivot & Fibo"],
  ["atr-zona", "ATR & zona", "ATR & zones"],
  ["tp-batas", "TP & batas batal", "TP & invalidation"],
  ["modal-risiko", "Modal & risiko", "Capital & risk"],
  ["sumber", "Sumber & batas", "Sources & limits"],
  ["glosarium", "Glosarium", "Glossary"],
  ["studi", "Studi & riwayat", "Study & legacy"],
];

function focusHash() {
  let id: string;
  try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ block: "start" });
  el.focus({ preventScroll: true });
}

export default function Literasi() {
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    // Arrival with a hash: wait one frame so sections are laid out.
    const raf = requestAnimationFrame(focusHash);
    window.addEventListener("hashchange", focusHash);
    window.addEventListener("popstate", focusHash);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("hashchange", focusHash);
      window.removeEventListener("popstate", focusHash);
    };
  }, []);

  const lots = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 md:px-8 md:py-10">
        <MRGBrandBar />
        <div className="mb-6 flex items-center justify-between gap-2">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted" data-testid="button-kembali">
            <ArrowLeft className="h-4 w-4" />{t("Kembali", "Back")}
          </Link>
          <Button variant="default" onClick={() => setLanguage(language === "id" ? "en" : "id")} className="gap-2" data-testid="button-language-toggle">
            <Globe className="h-4 w-4" />{language === "id" ? "English" : "Indonesia"}
          </Button>
        </div>

        <header className="mb-6">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#173c68] sm:text-4xl" data-testid="heading-panduan">
            {t("Panduan & Literasi", "Guide & Literacy")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t(
              "Cara membaca kalkulator MRG: bagaimana angka dihitung, apa artinya, dan apa yang tidak bisa dijamin. Ini bukan sinyal, bukan rekomendasi entry, dan bukan aplikasi broker.",
              "How to read the MRG calculator: how numbers are computed, what they mean and what cannot be guaranteed. This is not a signal, an entry recommendation or a broker app.",
            )}
          </p>
        </header>

        <nav aria-label={t("Daftar isi panduan", "Guide contents")} className="sticky top-0 z-10 -mx-4 mb-6 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-md sm:border" data-testid="nav-panduan">
          <ul className="m-0 flex list-none gap-1 p-0 whitespace-nowrap">
            {SECTIONS.map(([id, idl, enl]) => (
              <li key={id}>
                <a href={`#${id}`} onClick={() => setTimeout(focusHash, 0)} className="inline-flex min-h-11 items-center rounded-md px-3 text-[13px] font-medium text-primary hover:bg-primary/10" data-testid={`link-toc-${id}`}>
                  {t(idl, enl)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-5">
          {/* 1 */}
          <GuideSection id="cara-pakai" number="01" title={t("Cara pakai: Manual vs Saran MRG", "How to use: Manual vs MRG suggestions")}
            lead={t("Dua mode, dua tujuan berbeda. Jangan mencampur keduanya.", "Two modes, two different purposes. Do not mix them.")}>
            <ol className="list-decimal space-y-2 pl-5">
              <li>{t("Isi modal simulasi, pilih mode, lalu pilih Buy atau Sell sendiri.", "Enter simulation capital, choose a mode, then select Buy or Sell yourself.")}</li>
              <li>{t("Saran MRG: pilih Linear atau Martingale, lalu Lihat Saran MRG. Isi Manual: atur parameter atau gunakan Simulasi default.", "MRG suggestion: choose Linear or Martingale, then View MRG suggestion. Manual: set parameters or use Default simulation.")}</li>
              <li>{t("Baca harga entry, TP dan batas batal. Pada Saran MRG, tombol Buy/Sell 1, 1–2, 1–3 mengubah asumsi posisi terisi, bukan mengirim transaksi.", "Read entries, TP and invalidation. In suggestions, Buy/Sell 1, 1–2 and 1–3 change assumed fills, not place orders.")}</li>
              <li>{t("Jika data/input berubah, hitung ulang dengan sengaja. Hasil lama tidak mengikuti harga otomatis.", "If data/inputs change, deliberately recalculate. Old results never automatically track prices.")}</li>
            </ol>
            <Bilingual
              id={<><p><b>Manual</b> adalah aritmetika murni dari angka yang Anda isi. Bawaan: lot awal 1, target 30 poin, jarak layer 30 poin, 3 layer, strategi Linear. Tidak memakai Pivot/Fibonacci, ATR, kalender, atau berita.</p>
                <p className="mt-2"><b>Saran MRG</b> menyusun peta harga edukatif dari level Pivot/Fibonacci LGD D1 terakhir, dibandingkan dengan harga acuan XUL10, plus ukuran lot dari modal Anda. Hasilnya peta level, bukan perintah entry.</p></>}
              en={<><p><b>Manual</b> is plain arithmetic on the numbers you type. Defaults: first lot 1, target 30 points, layer spacing 30 points, 3 layers, Linear. It uses no Pivot/Fibonacci, ATR, calendar or news.</p>
                <p className="mt-2"><b>MRG suggestions</b> build an educational price map from the last LGD D1 Pivot/Fibonacci levels, compared with the XUL10 reference price, plus lot sizing from your capital. The result is a level map, not an order.</p></>}
            />
            <Sub>{t("Arti hasil", "What results mean")}</Sub>
            <DataTable
              head={[t("Hasil", "Result"), t("Arti", "Meaning")]}
              rows={[
                [t("Buy/Sell 1, 2, 3 (layer)", "Buy/Sell 1, 2, 3 (layers)"), t("Harga posisi diandaikan terisi. Manual: posisi pertama memakai acuan XUL10. Saran: posisi pertama adalah wakil zona teknikal terpilih, bukan harga running atau perintah entry.", "Assumed fill prices. Manual: first entry uses the XUL10 reference. Suggestion: first entry is the selected technical zone representative, not the running price or an entry instruction.")],
                [t("Rata-rata basket", "Basket average"), t("Harga rata-rata tertimbang lot dari layer yang terisi.", "Lot-weighted average price of filled layers.")],
                ["TP", t("Harga target. Manual: rata-rata + target untuk Buy, − target untuk Sell. Saran: level teknikal dari kumpulan target.", "Target price. Manual: average + target for Buy, − target for Sell. Suggestion: a level from the technical target pool.")],
                [t("Margin", "Margin"), t("Total lot x asumsi margin per lot. Bukan batas kerugian.", "Total lots x assumed margin per lot. Not a loss limit.")],
                [t("Stress / rugi di batas batal", "Stress / loss at invalidation"), t("Rugi bila harga mencapai titik uji. Bukan kerugian maksimum; gap dan stop-out broker tidak dihitung.", "Loss if price reaches the test point. Not maximum loss; gaps and broker stop-out are excluded.")],
                [t("Rasio posisi", "Position ratio"), t("Perbandingan ukuran, bukan jumlah lot. Dipakai jika belum ada lot utuh yang memenuhi batas simulasi; peta harga tetap tampil. Bukan larangan entry atau penilaian seluruh rekening.", "Relative sizes, not lot counts. Used when no whole-lot size fits simulation limits; the price map remains visible. Not an entry prohibition or an account-wide assessment.")],
              ]}
            />
            <Caveat>{t("Biaya, spread, swap, gap pembukaan, dan stop-out broker tidak dihitung di mana pun.", "Fees, spread, swap, opening gaps and broker stop-out are excluded everywhere.")}</Caveat>
          </GuideSection>

          {/* 2 */}
          <GuideSection id="strategi" number="02" title={t("Strategi: Linear dan Martingale", "Strategies: Linear and Martingale")}
            lead={t("Hanya pola lot yang berbeda; harga layer sama.", "Only the lot pattern differs; layer prices are the same.")}>
            <Formula label="lot(i), i = 1..n, F = lot awal / first lot">{`Linear     : lot(i) = F x i          -> 1 : 2 : 3 : ...  (bukan lot datar / not flat)
Martingale : lot(i) = F x 2^(i-1)    -> 1 : 2 : 4 : 8 : ...`}</Formula>
            <Caveat>{t("Linear di sini berarti n (1:2:3), bukan lot yang sama di setiap layer. Linear tetap menambah ukuran posisi saat harga bergerak melawan Anda; hanya lebih landai dari Martingale.", "Linear here means n (1:2:3), not equal lots on every layer. Linear still grows the position as price moves against you; it is just gentler than Martingale.")}</Caveat>
            <DataTable
              head={["Layer", "Linear", "Martingale", t("Total Linear", "Linear total"), t("Total Martingale", "Martingale total")]}
              rows={lots.map(n => [String(n), `${n}`, `${2 ** (n - 1)}`, `${(n * (n + 1)) / 2}`, `${2 ** n - 1}`])}
              caption={t("Dalam kelipatan lot awal F. Total Linear = n(n+1)/2, total Martingale = 2^n - 1.", "In multiples of first lot F. Linear total = n(n+1)/2, Martingale total = 2^n - 1.")}
            />
            <p>{t("Strategi bukan jaminan pemulihan. Averaging menaikkan paparan tepat ketika pasar tidak mendukung Anda; satu pergerakan searah panjang dapat melampaui semua layer.", "A strategy is not a recovery guarantee. Averaging raises exposure exactly when the market is against you; one long one-way move can exceed every layer.")}</p>
          </GuideSection>

          {/* 3 */}
          <GuideSection id="rata-rata" number="03" title={t("Rata-rata tertimbang & contoh manual", "Weighted average & manual worked example")}>
            <Formula>{`entry(i)  = P1 - d x (i-1) x s        d = +1 buy, -1 sell
                                      P1 = harga L1, s = jarak layer
w(i)      = lot(i)
average   = SUM( entry(i) x w(i) ) / SUM( w(i) )
TP        = average + d x target
stress px = P1 - d x n x s
stress $  = SUM( d x (entry(i) - stress px) x 100 x lot(i) )
margin $  = total lot x 1000
profit@TP = target x total lot x 100`}</Formula>
            <p>{t("Rata-rata sebagian terisi memakai bobot k layer pertama saja: average(k) = SUM(i<=k) entry x w / SUM(i<=k) w.", "Partial-fill average uses only the first k weights: average(k) = SUM(i<=k) entry x w / SUM(i<=k) w.")}</p>
            <Example title={t("Contoh 1: Manual, buy, Linear", "Example 1: Manual, buy, Linear")}>
              <p className="live-mono">P1 = 4500, s = 30, n = 3, target = 30, F = 1</p>
              <p className="live-mono">entry: 4500 / 4470 / 4440, lot: 1 / 2 / 3 (total 6)</p>
              <p className="live-mono">average = (4500 + 2x4470 + 3x4440) / 6 = 26760 / 6 = 4460</p>
              <p className="live-mono">TP = 4460 + 30 = 4490; stress px = 4500 - 90 = 4410</p>
              <p className="live-mono">stress = (90x1 + 60x2 + 30x3) x 100 = $30,000; margin = 6 x 1000 = $6,000</p>
              <p className="live-mono">profit@TP = 30 x 6 x 100 = $18,000</p>
              <p className="live-mono">{t("Hanya L1 dan L2 terisi:", "Only L1 and L2 filled:")} (4500 + 2x4470) / 3 = 4480</p>
            </Example>
            <Example title={t("Contoh 2: Manual, buy, Martingale (parameter sama)", "Example 2: Manual, buy, Martingale (same inputs)")}>
              <p className="live-mono">lot: 1 / 2 / 4 (total 7); average = 31200 / 7 = 4457.14</p>
              <p className="live-mono">TP = 4457.14 + 30 = 4487.14</p>
              <p className="live-mono">stress = (90x1 + 60x2 + 30x4) x 100 = $33,000; margin = $7,000</p>
            </Example>
            <p className="live-small">{t("Sell: arah d = -1, harga layer naik dan TP di bawah rata-rata. Manual mengasumsikan semua layer terisi untuk TP; contoh sebagian terisi hanya menjelaskan rata-rata. Rata-rata bukan level Pivot/Fibo, bukan janji harga kembali, dan belum mencakup biaya.", "Sell: d = -1, layer prices rise and TP sits below the average. Manual TP assumes all layers filled; the partial-fill example only explains the average. Average is not a Pivot/Fibo level, a promise of recovery, or net of costs.")}</p>
          </GuideSection>

          {/* 4 */}
          <GuideSection id="pivot-fibo" number="04" title={t("Pivot & Fibonacci dari D1 terakhir", "Pivot & Fibonacci from last D1")}
            lead={t("Level referensi, bukan sinyal. Dihitung dari O, H, L, C candle harian LGD selesai terakhir.", "Reference levels, not signals. Computed from O, H, L, C of the last completed LGD daily candle.")}>
            <p className="live-small">{t("O = buka, H = tertinggi, L = terendah, C = tutup; R = rentang H−L. Cprev pada ATR adalah penutupan candle sebelumnya. Pada akhir pekan, candle selesai terakhir tidak selalu berarti tanggal kemarin.", "O = open, H = high, L = low, C = close; R = range H−L. Cprev in ATR is the previous candle's close. On weekends, the last completed candle need not be yesterday's date.")}</p>
            <Formula label="R = H - L   P = (H+L+C)/3   W = (H+L+2O)/4">{`Classic
  R1 = 2P - L          S1 = 2P - H
  R2 = P + R           S2 = P - R
  R3 = H + 2(P - L)    S3 = L - 2(H - P)
  R4 = R2 + 1.618 R    S4 = S2 - 1.618 R

Woodie (pivot = W)
  R1 = 2W - L          S1 = 2W - H
  R2 = W + R           S2 = W - R
  R3 = H + 2(W - L)    S3 = L - 2(H - W)
  R4 = R3 + R          S4 = S3 - R

Camarilla (pivot = P)
  Rk = C + 1.1 R / m   Sk = C - 1.1 R / m
  m = 12, 6, 4, 2 for k = 1, 2, 3, 4

Fibonacci retracement
  naik/up  : H - r x R    r = 0.236 0.382 0.5 0.618 0.786
  turun/down: L + r x R   r = 0.786 0.618 0.5 0.382 0.236
Fibonacci projection
  naik/up  : H + (r-1) x R   r = 1.382 1.5 1.618 2 2.382 2.618
  turun/down: L - (r-1) x R`}</Formula>
            <Example title={t("Contoh 3: O 4510, H 4540, L 4480, C 4500", "Example 3: O 4510, H 4540, L 4480, C 4500")}>
              <p className="live-mono">R = 60; P = 13520 / 3 = 4506.67; W = (4540+4480+9020)/4 = 4510</p>
              <p className="live-mono">Classic R1 = 4533.33, S1 = 4473.33, R2 = 4566.67, S2 = 4446.67, S3 = 4413.33</p>
              <p className="live-mono">Classic S4 = 4446.67 - 97.08 = 4349.59</p>
              <p className="live-mono">Camarilla R1 = 4500 + 66/12 = 4505.50; S1 = 4494.50; R4 = 4533.00</p>
              <p className="live-mono">Fib up 0.618 = 4540 - 37.08 = 4502.92; 0.786 = 4492.84</p>
              <p className="live-mono">Projection up 1.618 = 4540 + 0.618x60 = 4577.08</p>
            </Example>
            <p>{t("Saran MRG memakai Pivot Classic, retracement Fibonacci sisi sesuai arah (buy: rentang naik; sell: rentang turun), serta Low D1 dan High D1. Woodie, Camarilla, dan proyeksi ditampilkan sebagai referensi tetapi tidak masuk kumpulan level rencana. Rumus mengikuti kalkulator publik Newsmaker Pivot & Fibonacci.", "MRG suggestions use Classic Pivot, direction-matched Fibonacci retracement (buy: up range; sell: down range), plus Low D1 and High D1. Woodie, Camarilla and projections are shown as reference but are not in the plan's level pool. Formulas follow Newsmaker's public Pivot & Fibonacci calculator.")}</p>
            <a href="https://www.newsmaker.id/id/tools/pivot-fibonacci" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-primary underline">{t("Kalkulator sumber Newsmaker", "Newsmaker source calculator")}</a>
          </GuideSection>

          {/* 5 */}
          <GuideSection id="atr-zona" number="05" title={t("ATR Wilder & zona terpisah", "Wilder ATR & separated zones")}>
            <Formula>{`TR(t)  = max( H-L , |H - Cprev| , |L - Cprev| )
ATR14 pertama / first = rata-rata 14 TR pertama / mean of first 14 TR
ATR(t) = ( ATR(t-1) x 13 + TR(t) ) / 14          (Wilder)

jarak minimum zona / min zone gap
  g = max( 0.01 , ceil( 0.20 x ATR14 x 100 ) / 100 )`}</Formula>
            <p className="live-small">{t("Minimum dibulatkan ke atas ke dua desimal harga, bukan sen dolar atau tick resmi XUL10. Implementasi menoleransi galat floating-point 10⁻⁹ sebelum ceil. Jarak dibandingkan pada harga tampilan dua desimal; wakil zona tetap harga rumus asli. Faktor 0,20 adalah percobaan yang disepakati, bukan nilai optimal atau jaminan aman. ATR invalid tidak diberi jarak pengganti.", "Minimum rounded up to two price decimals, not dollar cents or an official XUL10 tick. Implementation tolerates floating-point error of 10⁻⁹ before ceil. Gaps compare two-decimal display prices; representatives retain original formula prices. The 0.20 factor is an agreed trial, not an optimum or safety guarantee. Invalid ATR gets no fallback spacing.")}</p>
            <Example title={t("Contoh 4", "Example 4")}>
              <p className="live-mono">ATR(t-1) = 40, TR = 54 {"->"} ATR = (40x13 + 54) / 14 = 41</p>
              <p className="live-mono">ATR14 = 14.37 {"->"} 0.20 x 14.37 = 2.874 {"->"} g = 2.88 ({t("naik, bukan 2.87", "rounded up, not 2.87")})</p>
            </Example>
            <Sub>{t("Memilih zona", "Selecting zones")}</Sub>
            <ol className="list-decimal space-y-1 pl-5">
              <li>{t("Ambil level yang berlawanan arah dari harga acuan XUL10 (buy: di bawah; sell: di atas), urut dari terdekat.", "Take levels on the adverse side of the XUL10 reference (buy: below; sell: above), nearest first.")}</li>
              <li>{t("Level pertama membuka zona. Level berikutnya yang jaraknya kurang dari g terhadap wakil zona terakhir digabung ke zona itu; selain itu membuka zona baru.", "The first level opens a zone. A later level closer than g to the last zone's representative joins that zone; otherwise it opens a new zone.")}</li>
              <li>{t("Wakil zona adalah harga rumus asli level pertamanya, bukan harga rata-rata anggota.", "A zone's representative is the original formula price of its first level, not a member average.")}</li>
            </ol>
            <Example title={t("Contoh 5: lanjut contoh 3, buy di 4500, ATR14 = 40 (g = 8.00)", "Example 5: continues example 3, buy at 4500, ATR14 = 40 (g = 8.00)")}>
              <p className="live-mono">{t("Level di bawah 4500, terdekat dulu", "Levels below 4500, nearest first")}: 4492.84, 4480.00, 4473.33, 4446.67, 4413.33, 4349.59</p>
              <p className="live-mono">|4473.33 - 4480.00| = 6.67 &lt; 8 {"->"} {t("digabung ke zona 4480", "merged into zone 4480")}</p>
              <p className="live-mono">{t("Zona", "Zones")}: 4492.84 | 4480.00 | 4446.67 | 4413.33 | 4349.59</p>
              <p className="live-mono">{t("Buy 1–3 = 4492.84, 4480.00, 4446.67; batas batal = zona berikutnya 4413.33", "Buy 1–3 = 4492.84, 4480.00, 4446.67; invalidation = next zone 4413.33")}</p>
            </Example>
          </GuideSection>

          {/* 6 */}
          <GuideSection id="tp-batas" number="06" title={t("TP teknikal & batas batal", "Technical TP & invalidation")}>
            <ul className="list-disc space-y-1 pl-5">
              <li>{t("Jumlah layer = min(3, jumlah zona - 1). Satu zona terpisah selalu disisakan untuk batas batal. Jika tidak ada, MRG berkata tunggu; tidak membuat level buatan atau stop ATR tetap.", "Layers = min(3, zones - 1). One separate zone is always kept for invalidation. If none exists MRG says wait; it never invents levels or a fixed ATR stop.")}</li>
              <li>{t("Batas batal tetap = zona terpisah berikutnya setelah layer terakhir. Menyentuhnya berarti skenario ini tidak berlaku, bukan perintah stop-loss.", "The fixed invalidation is the next separated zone after the last layer. Touching it means this scenario no longer holds; it is not a stop-loss order.")}</li>
              <li>{t("Kumpulan target diambil dari seluruh level yang lebih menguntungkan daripada entry pertama (buy: di atas L1). Bukan sekadar level terdekat dari rata-rata. TP aktual = level pertama di atas rata-rata (buy) dalam kumpulan itu, sehingga selalu menguntungkan dari entry pertama.", "The target pool is every level that is profitable from the first entry (buy: above L1), not merely the nearest level to the mean. Actual TP = the first pool level beyond the average, so it is always profitable from the first entry.")}</li>
            </ul>
            <Example title={t("Contoh 6: lanjut contoh 5, Linear 1:2:3", "Example 6: continues example 5, Linear 1:2:3")}>
              <p className="live-mono">average = (4492.84 + 2x4480 + 3x4446.666666…) / 6 ≈ 4465.473333…</p>
              <p className="live-mono">{t("Kumpulan target (di atas L1 4492.84)", "Target pool (above L1 4492.84)")}: 4502.92, 4506.67, 4510.00, ...</p>
              <p className="live-mono">TP = 4502.92 ({t("level 4473.33 tidak dipakai: di bawah L1", "4473.33 is not used: below L1")})</p>
              <p className="live-mono">{t("Rugi di batas batal per lot awal", "Loss at invalidation per first lot")} = (79.51x1 + 66.67x2 + 33.33x3) x 100 = $31,284</p>
              <p className="live-mono">{t("Setara", "Equivalent")}: (4465.47 - 4413.33) x 6 x 100 = $31,284</p>
              <p className="live-mono">profit@TP = (4502.92 - 4465.473333…) x 6 x 100 ≈ $22,468</p>
              <p className="live-small">{t("Harga tampilan dibulatkan, sedangkan hitungan memakai presisi asli: average 4465.473333… dan batas 4413.333333…. Menghitung ulang hanya dari harga dua desimal dapat menghasilkan nominal berbeda.", "Display prices are rounded; arithmetic uses original precision: average 4465.473333… and invalidation 4413.333333…. Recomputing only two-decimal prices can produce different monetary amounts.")}</p>
            </Example>
            <Caveat>{t("Menyentuh level tidak membuktikan pembalikan. Level-level ini adalah titik acuan matematis; harga dapat menembusnya, bergerak melewatinya dengan gap, atau tidak pernah kembali.", "Touching a level does not confirm a reversal. These are mathematical reference points; price can break them, gap through them, or never return.")}</Caveat>
          </GuideSection>

          {/* 7 */}
          <GuideSection id="modal-risiko" number="07" title={t("Modal & ukuran lot", "Capital & lot sizing")}
            lead={t("Asumsi edukatif, bukan spesifikasi broker terverifikasi.", "Educational assumptions, not verified broker specifications.")}>
            <p>{t("Di Saran MRG, pilih Reguler, Mini atau Mikro sebelum mengisi modal. Pilihan ini mengubah ukuran lot, margin dan laba/rugi nominal, bukan level entry, rata-rata, TP atau batas batal. Isi Manual, Simulasi Dasar, perbandingan dan skor studi tetap memakai Reguler.", "In MRG suggestions, choose Regular, Mini or Micro before entering capital. This changes lot sizing, margin and monetary P/L, not entry levels, average, TP or invalidation. Manual entry, Basic Simulation, comparisons and study scores still use Regular.")}</p>
            <DataTable head={[t("Profil simulasi", "Simulation profile"), t("Margin/lot (M)", "Margin/lot (M)"), t("Nilai/poin/lot (V)", "Value/point/lot (V)")]}
              rows={[[t("Reguler (default)", "Regular (default)"), "US$1,000", "US$100"], ["Mini", "US$100", "US$10"], [t("Mikro", "Micro"), "US$10", "US$1"]]} />
            <Caveat>{t("Mini/Mikro bukan otomatis lebih aman. Pada jumlah lot yang sama nominalnya lebih kecil; pada modal yang sama sizing otomatis bisa menghasilkan sekitar 10×/100× lot sehingga paparan nominal tetap serupa. Batas modal dan pembulatan tetap berlaku.", "Mini/Micro are not automatically safer. For the same lot count the monetary exposure is smaller; with the same capital automatic sizing can produce around 10×/100× as many lots, keeping monetary exposure similar. Capital budgets and flooring still apply.")}</Caveat>
            <p>{t("Tabel Saran MRG memakai satu kolom adaptif. Jika lot terhitung, Ukuran posisi (lot) menunjukkan jumlah lot: lot awal 2 dengan Linear berarti 2, 4, 6 lot. Jika belum, Rasio posisi menunjukkan 1×, 2×, 3× saja; margin dan laba/rugi nominal belum tersedia, bukan nol. Rata-rata dan TP tetap memakai rasio posisi yang diasumsikan terisi. Kolom mengikuti snapshot saat tombol hitung ditekan, bukan berubah sendiri mengikuti harga.", "MRG suggestions use one adaptive column. With an allocation, Position size (lot) shows lot counts: a first lot of 2 with Linear means 2, 4, 6 lots. Without an allocation, Position ratio shows only 1×, 2×, 3×; monetary margin and P/L are unavailable, not zero. Average and TP still use assumed-filled position ratios. The column follows the snapshot captured on Calculate, not automatic price movements.")}</p>
            <DataTable
              head={[t("Asumsi", "Assumption"), t("Nilai", "Value")]}
              rows={[
                [t("Margin per lot", "Margin per lot"), t("M dari profil terpilih", "M from selected profile")],
                [t("Nilai per poin per lot", "Value per point per lot"), t("V dari profil terpilih", "V from selected profile")],
                [t("Batas margin", "Margin budget"), "20% " + t("modal", "capital")],
                [t("Batas rugi (stress / batas batal)", "Loss budget (stress / invalidation)"), "10% " + t("modal", "capital")],
                [t("Langkah lot", "Lot step"), t("1 lot utuh", "whole 1 lot")],
                [t("Lot awal manual", "Manual first lot"), "1"],
              ]}
            />
            <Formula>{`unit margin = SUM( w(i) ) x M                 w = pola lot dengan F = 1
unit loss   = SUM( d x (entry(i) - batas/stop) x w(i) x V )
F = floor( min( 0.20 x modal / unit margin , 0.10 x modal / unit loss ) )
F < 1  ->  tidak muat / no fit (lot tidak dibulatkan naik)`}</Formula>
            <Example title={t("Contoh 7: sizing Reguler (bukan sizing otomatis mode Manual)", "Example 7: Regular sizing (not automatic Manual sizing)")}>
              <p className="live-mono">unit margin = 6 x 1000 = 6,000; unit loss = 30,000</p>
              <p className="live-mono">F = floor( min( 60,000 / 6,000 = 10 , 30,000 / 30,000 = 1 ) ) = 1</p>
              <p className="live-mono">{t("Modal 299,999: min = 0.99997, floor = 0 = tidak muat", "Capital 299,999: min = 0.99997, floor = 0 = no fit")}</p>
              <p className="live-mono">{t("Contoh 6 (rugi 31,284 per F), modal 400,000: min(13.33 ; 1.28) = 1; rugi US$31,284 = 7.82%", "Example 6 (loss 31,284 per F), capital 400,000: min(13.33 ; 1.28) = 1; loss US$31,284 = 7.82%")}</p>
            </Example>
            <p>{t("Profil dan nilai M/V disimpan bersama snapshot. Mengganti profil tidak mengubah hasil lama: tekan hitung ulang. Pilihan sebagian terisi memakai profil snapshot, bukan pilihan baru. Snapshot lama tanpa profil valid perlu dihitung ulang.", "The profile and its M/V values are captured with the snapshot. Changing profiles does not alter old results: recalculate. Partial fills use the captured profile, not the new selection. Old snapshots without a valid profile must be recalculated.")}</p>
            <p className="live-small">{t("Saran MRG membekukan lot awal dan batas batal dari rencana lengkap. Pilihan sebagian terisi hanya menghitung ulang rata-rata, total lot terisi, margin dan P/L tahap tersebut; bukan sizing baru. Harga dan rata-rata memakai presisi asli, tampilan dua desimal; nominal Manual dibulatkan dua desimal. Rumus ini mengecualikan spread dan biaya.", "MRG suggestions freeze first lot and invalidation from the full plan. Partial-fill choices recalculate average, filled lots, margin and stage P/L only; no re-sizing. Prices and averages retain original precision, displayed at two decimals; Manual monetary amounts round to two decimals. Spread and fees are excluded.")}</p>
            <p>{t("Batas yang lebih ketat biasanya batas rugi, bukan margin. Pembulatan membuat modal berbeda bisa menghasilkan lot sama. Ukuran terbesar di dalam batas bukan jaminan aman; batas ini pilihan simulasi.", "The tighter limit is usually the loss budget, not margin. Flooring can give different capital the same lot. The largest size inside the limits is not a safety guarantee; the limits are simulation choices.")}</p>
          </GuideSection>

          {/* 8 */}
          <GuideSection id="sumber" number="08" title={t("Sumber, asumsi, dan batas", "Sources, assumptions and limits")}>
            <Bilingual
              id={<ul className="list-disc space-y-1 pl-5">
                <li><b>Ketidaksesuaian sumber:</b> harga berjalan adalah XUL10, sedangkan level Pivot/Fibonacci/ATR berasal dari LGD D1 (emas referensi) dan grafik OANDA XAUUSD. Seri ini tidak identik; tidak ada offset atau rasio kalibrasi.</li>
                <li>Level LGD bukan entry XUL10 yang presisi. Selisih harga antar sumber dapat membuat level tidak pernah tersentuh atau tersentuh lebih awal.</li>
                <li>Tidak ada jaminan pembalikan. Tren D1 hanya konteks, bukan prediksi arah.</li>
                <li>Kalender dan berita hanya memberi status tunggu/lengkap; tidak membuang peta harga dan tidak membuktikan pasar aman.</li>
                <li>Akhir pekan memakai tick XUL10 terakhir bertanggal; gap pembukaan dapat mengubah skenario.</li>
                <li>Margin, nilai poin, dan batas 20%/10% adalah asumsi edukatif, bukan spesifikasi broker terverifikasi.</li>
              </ul>}
              en={<ul className="list-disc space-y-1 pl-5">
                <li><b>Source mismatch:</b> the running quote is XUL10, while Pivot/Fibonacci/ATR come from LGD D1 (reference gold) and the chart is OANDA XAUUSD. These series are not identical; there is no offset or calibration ratio.</li>
                <li>LGD levels are not precise XUL10 entries. The price gap between sources can make a level never touch or touch earlier.</li>
                <li>No reversal guarantee. D1 trend is context, not a direction forecast.</li>
                <li>Calendar and news only give wait/complete status; they do not hide the price map and do not prove the market is safe.</li>
                <li>Weekends use the last dated XUL10 tick; opening gaps can change the scenario.</li>
                <li>Margin, point value and the 20%/10% limits are educational assumptions, not verified broker specifications.</li>
              </ul>}
            />
            <p className="live-small">{t("Tidak dihitung: spread, biaya, swap, slippage, gap, stop-out broker, ukuran tick instrumen.", "Not modelled: spread, fees, swap, slippage, gaps, broker stop-out, instrument tick size.")}</p>
          </GuideSection>

          {/* 9 */}
          <GuideSection id="glosarium" number="09" title={t("Glosarium", "Glossary")}>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2" data-testid="list-glosarium">
              {([
                ["Averaging", "Menambah posisi searah di harga lebih buruk untuk menggeser harga rata-rata.", "Adding same-direction positions at worse prices to move the average."],
                ["Layer", "Satu tahap pengisian pada harga tertentu.", "One fill stage at a given price."],
                ["Lot", "Satuan ukuran posisi. Nilai per poin/lot: Reguler US$100, Mini US$10, Mikro US$1. Manual tetap Reguler.", "Position size unit. Value per point/lot: Regular US$100, Mini US$10, Micro US$1. Manual remains Regular."],
                ["Poin / Point", "Selisih harga 1 (4500 ke 4501).", "A price difference of 1 (4500 to 4501)."],
                ["Margin", "Dana tertahan untuk posisi terbuka; bukan batas rugi.", "Funds held for open positions; not a loss limit."],
                ["Stress", "Rugi simulasi di titik uji, tanpa gap dan stop-out.", "Simulated loss at a test point, without gaps or stop-out."],
                ["TP", "Take profit: harga target skenario.", "Take profit: the scenario's target price."],
                ["Batas batal / Invalidation", "Zona terpisah tempat skenario dianggap tidak berlaku.", "Separated zone where the scenario is considered void."],
                ["Pivot", "Level acuan dari H, L, C hari sebelumnya.", "Reference level from the previous day's H, L, C."],
                ["Fibonacci", "Rasio rentang H-L untuk retracement dan proyeksi.", "Ratios of the H-L range for retracement and projection."],
                ["ATR", "Rata-rata rentang sebenarnya; ukuran volatilitas (Wilder 14).", "Average true range; volatility measure (Wilder 14)."],
                ["D1", "Candle harian.", "Daily candle."],
                ["OHLC", "Open, High, Low, Close: harga buka, tertinggi, terendah, dan tutup candle.", "Open, High, Low, Close: a candle's opening, highest, lowest and closing prices."],
                ["Bobot / Weight", "Perbandingan ukuran posisi, misalnya 1×:2×:4×; bukan jumlah lot nyata bila belum ada alokasi.", "Relative position sizes, e.g. 1×:2×:4×; not actual lots without an allocation."],
                ["Snapshot", "Hasil dan data yang dibekukan saat tombol hitung ditekan; bukan hasil yang mengikuti harga otomatis.", "Result and data frozen when Calculate is pressed; not automatically repriced."],
                ["XUL10", "Kontrak gulir emas loco London (harga berjalan).", "Loco London gold rolling contract (running quote)."],
                ["LGD", "Seri emas referensi untuk level D1.", "Reference gold series for D1 levels."],
                ["Martingale", "Lot berlipat 2^(n-1).", "Lots doubling as 2^(n-1)."],
                ["Linear (1:2:3)", "Lot bertambah n x F.", "Lots growing as n x F."],
              ] as const).map(([term, id, en]) => (
                <div key={term} className="border-b border-border/50 pb-2">
                  <dt className="font-semibold text-foreground">{term}</dt>
                  <dd className="m-0 text-[13px] text-muted-foreground">{t(id, en)}</dd>
                </div>
              ))}
            </dl>
          </GuideSection>

          {/* 10 */}
          <GuideSection id="studi" number="10" title={t("Studi & riwayat risiko (arsip)", "Study & legacy risk notes (archive)")}
            lead={t("Konteks pembelajaran dari studi akademik; bukan kondisi live dan bukan klaim kinerja atau keamanan.", "Learning context from an academic study; not live conditions and not a performance or safety claim.")}>
            <Caveat>{t("Bagian ini menjelaskan studi manual lama, yang masih menampilkan skor dan metrik PF/ROM/ER. Itu keluaran studi manual, bukan keluaran Saran MRG. Saran MRG memakai level D1, zona, dan batas modal pada bagian 04-07, tanpa skor ini. Angka riwayat bukan prediksi hasil pribadi, bukan jaminan margin, dan bukan saran strategi atau modal.", "This section explains the older manual study, which still shows a score and PF/ROM/ER metrics. Those are manual-study outputs, not MRG suggestion outputs. MRG suggestions use D1 levels, zones and capital limits from sections 04-07, without this score. Historical figures do not predict personal outcomes, guarantee margin or recommend a strategy or capital.")}</Caveat>
            <Sub>{t("Skor studi manual", "Manual study score")}</Sub>
            <p>{t("Skor adalah penjumlahan poin aturan tetap, lalu dibatasi 0 sampai 100. Ini skor heuristik, bukan probabilitas margin call atau kerugian.", "The score is a sum of fixed rule points, then clamped to 0..100. It is a heuristic score, not a probability of margin call or loss.")}</p>
            <Formula>{`skor = clamp( 0 , 100 , modal + strategi/pasar + target + layer + pengalaman )
rasio modal = modal / 200,000      (referensi tesis historis)
status: skor <= 35 AMAN ; 36..60 BERISIKO ; > 60 TIDAK LAYAK`}</Formula>
            <DataTable
              head={[t("Komponen", "Component"), t("Kondisi", "Condition"), t("Poin", "Points")]}
              rows={[
                [t("Modal", "Capital"), t("rasio < 0,25", "ratio < 0.25"), "35"],
                ["", t("0,25 sampai < 0,5", "0.25 to < 0.5"), "25"],
                ["", t("0,5 sampai < 0,75", "0.5 to < 0.75"), "15"],
                ["", t("0,75 sampai < 1", "0.75 to < 1"), "10"],
                ["", t("rasio >= 1", "ratio >= 1"), "0"],
                [t("Strategi + pasar", "Strategy + market"), "Martingale + Trending", "20 + 25 = 45"],
                ["", t("Martingale + lainnya (Sideways)", "Martingale + other (Sideways)"), "20 + 10 = 30"],
                ["", "Linear + Trending", "15"],
                ["", t("Linear + lainnya (Sideways)", "Linear + other (Sideways)"), "5"],
                [t("Target", "Target"), t("30 poin: Martingale / Linear", "30 pts: Martingale / Linear"), "15 / 0"],
                ["", t("40 poin: keduanya", "40 pts: both"), "10"],
                ["", t("50 poin: keduanya", "50 pts: both"), "5"],
                [t("Layer maks.", "Max layer"), ">= 5 / 4 / " + t("lainnya", "other"), "20 / 12 / 5"],
                [t("Pengalaman", "Experience"), t("Pemula / lainnya", "Beginner (Pemula) / other"), "15 / 5"],
              ]}
            />
            <Example title={t("Contoh 8 (divalidasi terhadap aturan)", "Example 8 (validated against the rules)")}>
              <p className="live-mono">Linear, Sideways, 30 pts, 3 layer, Pemula, modal US$100,000</p>
              <p className="live-mono">{t("rasio", "ratio")} = 0.5 {"->"} 15; Linear + Sideways 5; target 30 Linear 0; layer 5; Pemula 15</p>
              <p className="live-mono">{t("skor", "score")} = 15 + 5 + 0 + 5 + 15 = 40 {"->"} BERISIKO</p>
              <p className="live-mono">{t("Kebalikan: Martingale + Trending + 30 pts + 5 layer + Pemula + modal 40,000 = 35+45+15+20+15 = 130, dibatasi menjadi 100 (TIDAK LAYAK).", "Contrast: Martingale + Trending + 30 pts + 5 layers + Pemula + capital 40,000 = 35+45+15+20+15 = 130, clamped to 100 (TIDAK LAYAK).")}</p>
            </Example>
            <Sub>{t("Metrik PF / ROM / ER / MC", "PF / ROM / ER / MC metrics")}</Sub>
            <ul className="list-disc space-y-1 pl-5">
              <li>{t("PF (Profit Factor) dan ER (Efficiency Ratio) dibaca dari tabel tetap per strategi dan target (30/40/50). Keduanya tidak dihitung ulang dari transaksi live atau dari input Anda yang lain. Kombinasi di luar tabel menampilkan PF 1.00, ROM 0, ER 0.", "PF (Profit Factor) and ER (Efficiency Ratio) are looked up from a fixed table by strategy and target (30/40/50). They are not recomputed from live trades or your other inputs. A combination outside the table shows PF 1.00, ROM 0, ER 0.")}</li>
              <li>{t("ROM disesuaikan skala modal: ROM = ROM tabel x (200,000 / modal). Ini transformasi skala sederhana, bukan hasil simulasi ulang.", "ROM is scaled by capital: ROM = table ROM x (200,000 / capital). This is a simple scaling transform, not a re-simulation.")}</li>
              <li>{t("Risiko margin call (MC) ditentukan dari rasio modal saja, menimpa label tabel: >= 2 Sangat Rendah; >= 1 Rendah; >= 0,5 Sedang; >= 0,25 Tinggi; lainnya Sangat Tinggi.", "Margin-call (MC) risk comes from the capital ratio alone and overrides the table label: >= 2 Very Low; >= 1 Low; >= 0.5 Medium; >= 0.25 High; otherwise Very High.")}</li>
              <li>{t("Modal US$200,000 adalah referensi model historis tesis, bukan saran setoran. Angka tabel berasal dari backtest periode lalu dan tidak menjamin hasil.", "Capital US$200,000 is the thesis's historical model reference, not deposit advice. Table figures come from a past backtest and guarantee nothing.")}</li>
            </ul>
            <details className="rounded-md border border-border p-3" data-testid="details-studi-lookup">
              <summary className="cursor-pointer text-[13px] font-semibold">{t("Tabel lookup PF / ROM / ER (sumber, pada modal 200,000)", "PF / ROM / ER lookup table (source, at 200,000 capital)")}</summary>
              <div className="mt-3">
                <DataTable
                  head={[t("Strategi", "Strategy"), t("Target", "Target"), "PF", "ROM %", "ER", t("Label MC tabel", "Table MC label")]}
                  rows={[
                    ["Martingale", "30", "3.75", "312.86", "0.56", "Very High"],
                    ["Martingale", "40", "6.23", "315.20", "0.70", "High"],
                    ["Martingale", "50", "7.82", "447.23", "0.78", "Medium"],
                    ["Linear", "30", "14.73", "334.19", "1.04", "Low"],
                    ["Linear", "40", "3.48", "579.65", "1.13", "Medium"],
                    ["Linear", "50", "4.69", "392.13", "0.64", "Medium"],
                  ]}
                />
                <p className="live-small mt-2">{t("Contoh 8: ROM Linear 30 = 334.19 x 200,000 / 100,000 = 668.38%; PF 14.73; ER 1.04; MC Medium (rasio 0,5). Angka ini nilai lookup historis, bukan hasil yang diharapkan.", "Example 8: Linear 30 ROM = 334.19 x 200,000 / 100,000 = 668.38%; PF 14.73; ER 1.04; MC Medium (ratio 0.5). These are historical lookup values, not expected results.")}</p>
              </div>
            </details>
            <Bilingual
              id={<p>Pelajaran yang tetap berlaku: ukuran lot bertumbuh pada layer dalam, kerugian besar jarang tetapi berat, dan backtest pendek tidak menangkap peristiwa ekstrem.</p>}
              en={<p>Lessons that remain: lot size grows on deep layers, large losses are rare but heavy, and short backtests miss extreme events.</p>}
            />
            <p><b>{t("Bias perilaku yang dibahas", "Behavioural biases discussed")}:</b> Overconfidence, Risk Misperception, Loss Aversion, Herding, Anchoring, Recency, Sunk Cost, Gambler's Fallacy, Disposition Effect.</p>
            <div className="rounded-md border border-border bg-muted/40 p-3 text-[13px]">
              <p className="font-semibold">{t("Landasan penelitian", "Research foundation")}</p>
              <p className="italic">{t("Analisis Produktivitas Model Martingale dalam Transaksi Kontrak Gulir Berkala Emas Loco London (XUL10) pada Sistem Perdagangan Alternatif (SPA) di Industri Perdagangan Berjangka Komoditi (PBK)", "Productivity Analysis of the Martingale Model in Rolling Contract of Loco London Gold (XUL10) Transactions in the Alternative Trading System (ATS) in the Commodity Futures Trading (CFT) Industry")}</p>
              <p>Iriawan Widadi, S.T. · NIM 21070123420033 · {t("Magister Teknik dan Manajemen Industri, Universitas Diponegoro, Semarang", "Master of Industrial Engineering and Management, Universitas Diponegoro, Semarang")} · 2025</p>
              <p>{t("Pembimbing", "Supervisors")}: Prof. Dr. Ratna Purwaningsih, S.T., M.T., IPU; Dr. Singgih Saptadi, S.T., M.T.</p>
            </div>
            <p className="live-small">{t("MRG adalah rem, bukan gas: tanpa sinyal, tanpa rekomendasi entry, tanpa 'strategi terbaik'. Pengguna bertanggung jawab atas keputusannya.", "MRG is a brake, not a gas pedal: no signals, no entry recommendations, no 'best strategy'. Users are responsible for their own decisions.")}</p>
          </GuideSection>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm text-primary-foreground" data-testid="button-kembali-bawah">
            <ArrowLeft className="h-4 w-4" />{t("Kembali ke kalkulator", "Back to calculator")}
          </Link>
        </div>
      </div>
    </div>
  );
}
