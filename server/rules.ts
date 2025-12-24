import type { RiskInput, RiskResult, RiskStatus } from "@shared/schema";

// ============================================================================
// FRAMEWORK TESIS IRIAWAN WIDADI, S.T. (UNDIP, 2025)
// "Analisis Produktivitas Model Martingale dalam Transaksi Kontrak Gulir 
// Berkala Emas Loco London (XUL10) pada Sistem Perdagangan Alternatif (SPA)"
// ============================================================================

const OPTIMAL_MODAL = 200000;

// Metrik Produktivitas dari Backtesting Tesis 2024-2025
// PF = Profit Factor (Total Profit / Total Loss)
// ROM = Return on Margin (%)
// ER = Efficiency Ratio
// MC Risk = Margin Call Risk Level
const THESIS_METRICS: Record<string, Record<string, { pf: number; rom: number; er: number; mcRisk: string }>> = {
  "Martingale": {
    "30": { pf: 3.75, rom: 312.86, er: 0.56, mcRisk: "Sangat Tinggi / Very High" },
    "40": { pf: 6.23, rom: 315.20, er: 0.70, mcRisk: "Tinggi / High" },
    "50": { pf: 7.82, rom: 447.23, er: 0.78, mcRisk: "Sedang / Medium" },
  },
  "Linear Averaging": {
    "30": { pf: 14.73, rom: 334.19, er: 1.04, mcRisk: "Rendah / Low" },
    "40": { pf: 3.48, rom: 579.65, er: 1.13, mcRisk: "Sedang / Medium" },
    "50": { pf: 4.69, rom: 392.13, er: 0.64, mcRisk: "Sedang / Medium" },
  },
};

// Definisi Bias Perilaku Keuangan (Behavioral Finance) dari Tesis
const BEHAVIORAL_BIASES = {
  overconfidence: {
    id: "Overconfidence Bias: Kecenderungan trader melebih-lebihkan kemampuan analisis atau prediksi pasar, sehingga mengabaikan risiko eksponensial Martingale.",
    en: "Overconfidence Bias: Tendency to overestimate analytical abilities or market predictions, thus ignoring Martingale's exponential risk."
  },
  lossAversion: {
    id: "Loss Aversion: Ketakutan terhadap kerugian lebih besar daripada keinginan memperoleh keuntungan. Mendorong trader menahan posisi rugi terlalu lama.",
    en: "Loss Aversion: Fear of loss exceeds desire for gain. Drives traders to hold losing positions too long."
  },
  herding: {
    id: "Herding Behaviour: Kecenderungan mengikuti keputusan mayoritas pasar tanpa analisis independen. Hingga 95% kerugian trader ritel bersumber dari bias ini.",
    en: "Herding Behaviour: Tendency to follow market majority without independent analysis. Up to 95% of retail trader losses stem from this bias."
  },
  anchoring: {
    id: "Anchoring Bias: Terpaku pada informasi awal atau referensi harga tertentu (entry price) sebagai acuan keputusan, mengabaikan kondisi pasar aktual.",
    en: "Anchoring Bias: Fixating on initial information or specific price references (entry price) as decision basis, ignoring actual market conditions."
  },
  recency: {
    id: "Recency Bias: Lebih memercayai informasi atau pengalaman terbaru, mengabaikan pola historis jangka panjang dari data backtesting.",
    en: "Recency Bias: Over-trusting recent information/experience, ignoring long-term historical patterns from backtesting data."
  },
  riskMisperception: {
    id: "Risk Misperception: Mayoritas trader melihat strategi Martingale sebagai 'mudah' dan 'pasti untung' tanpa memahami risiko eksponensial (L₀ × 2ⁿ).",
    en: "Risk Misperception: Most traders see Martingale as 'easy' and 'guaranteed profit' without understanding exponential risk (L₀ × 2ⁿ)."
  }
};

export function calculateRisk(input: RiskInput): RiskResult {
  let riskScore = 0;
  const reasons: string[] = [];
  const warnings: string[] = [];
  const psychologyNotes: string[] = [];

  const baseMetrics = THESIS_METRICS[input.strategy]?.[input.targetPoin] || {
    pf: 1.0,
    rom: 0,
    er: 0,
    mcRisk: "Tidak Diketahui / Unknown",
  };

  const modalRatio = input.modal / OPTIMAL_MODAL;
  
  // Adjust ROM berdasarkan modal (ROM = Return / Modal × 100%)
  // Data tesis menggunakan modal USD 200,000 sebagai referensi
  // ROM_adjusted = ROM_base × (OPTIMAL_MODAL / user_modal)
  const adjustedROM = baseMetrics.rom * (OPTIMAL_MODAL / input.modal);
  
  // MC Risk disesuaikan berdasarkan modal
  let adjustedMCRisk = baseMetrics.mcRisk;
  if (modalRatio >= 2) {
    // Modal 2x+ dari optimal = risiko MC sangat rendah
    adjustedMCRisk = "Sangat Rendah / Very Low";
  } else if (modalRatio >= 1) {
    // Modal >= optimal = risiko MC rendah
    adjustedMCRisk = "Rendah / Low";
  } else if (modalRatio >= 0.5) {
    // Modal 50-100% optimal = risiko MC sedang
    adjustedMCRisk = "Sedang / Medium";
  } else if (modalRatio >= 0.25) {
    // Modal 25-50% optimal = risiko MC tinggi
    adjustedMCRisk = "Tinggi / High";
  } else {
    // Modal < 25% optimal = risiko MC sangat tinggi
    adjustedMCRisk = "Sangat Tinggi / Very High";
  }
  
  const metrics = {
    pf: baseMetrics.pf, // PF tetap (rasio profit/loss tidak bergantung modal)
    rom: adjustedROM,   // ROM disesuaikan dengan modal
    er: baseMetrics.er, // ER tetap (efisiensi strategi)
    mcRisk: adjustedMCRisk, // MC Risk disesuaikan dengan modal
  };
  if (modalRatio < 0.25) {
    riskScore += 35;
    reasons.push(
      `Modal USD ${input.modal.toLocaleString()} sangat jauh di bawah rekomendasi optimal USD 200.000 (rasio ${(modalRatio * 100).toFixed(1)}%). | Capital USD ${input.modal.toLocaleString()} is far below optimal recommendation of USD 200,000 (ratio ${(modalRatio * 100).toFixed(1)}%).`
    );
    warnings.push(
      "Risiko margin call sangat tinggi dengan modal ini. | Margin call risk is very high with this capital."
    );
  } else if (modalRatio < 0.5) {
    riskScore += 25;
    reasons.push(
      `Modal USD ${input.modal.toLocaleString()} masih di bawah 50% dari rekomendasi optimal. | Capital USD ${input.modal.toLocaleString()} is still below 50% of optimal recommendation.`
    );
    warnings.push(
      "Ketahanan modal terbatas untuk menahan drawdown. | Limited capital endurance to withstand drawdown."
    );
  } else if (modalRatio < 0.75) {
    riskScore += 15;
    reasons.push(
      `Modal USD ${input.modal.toLocaleString()} mendekati level yang dapat diterima. | Capital USD ${input.modal.toLocaleString()} approaching acceptable level.`
    );
  } else if (modalRatio >= 1) {
    riskScore += 0;
    reasons.push(
      `Modal USD ${input.modal.toLocaleString()} memenuhi atau melebihi rekomendasi optimal. | Capital USD ${input.modal.toLocaleString()} meets or exceeds optimal recommendation.`
    );
  } else {
    riskScore += 10;
    reasons.push(
      `Modal USD ${input.modal.toLocaleString()} mendekati level optimal. | Capital USD ${input.modal.toLocaleString()} approaching optimal level.`
    );
  }

  // ANALISIS STRATEGI (Financial Engineering Framework)
  if (input.strategy === "Martingale") {
    riskScore += 20;
    reasons.push(
      "Model Martingale menggunakan position sizing eksponensial (Lₙ = L₀ × 2ⁿ) yang mengamplifikasi tail risk dan maximum drawdown secara deterministik. | Martingale model uses exponential position sizing (Lₙ = L₀ × 2ⁿ) which amplifies tail risk and maximum drawdown deterministically."
    );
    
    if (input.marketCondition === "Trending") {
      riskScore += 25;
      reasons.push(
        "TEMUAN EMPIRIS: Kombinasi Martingale + pasar trending menghasilkan margin call pada backtesting periode bullish 2025 (data tesis Iriawan, UNDIP). | EMPIRICAL FINDING: Martingale + trending market combination resulted in margin call during 2025 bullish backtesting period (Iriawan thesis, UNDIP)."
      );
      warnings.push(
        "Data Backtesting Tesis: Martingale 30pts mengalami margin call total pada tren bullish 2025. Sensitivitas layer 4-5 sangat tinggi. | Thesis Backtest Data: Martingale 30pts suffered total margin call in 2025 bullish trend. Layer 4-5 sensitivity is very high."
      );
    } else {
      riskScore += 10;
      reasons.push(
        "Martingale pada pasar sideways menunjukkan PF positif, namun risiko tail event tetap signifikan karena pola amplifikasi risiko deterministik. | Martingale in sideways market shows positive PF, but tail event risk remains significant due to deterministic risk amplification pattern."
      );
    }
    
    // Bias Perilaku Keuangan untuk Martingale
    psychologyNotes.push(`${BEHAVIORAL_BIASES.overconfidence.id} | ${BEHAVIORAL_BIASES.overconfidence.en}`);
    psychologyNotes.push(`${BEHAVIORAL_BIASES.riskMisperception.id} | ${BEHAVIORAL_BIASES.riskMisperception.en}`);
  } else {
    // Linear Averaging Analysis
    if (input.marketCondition === "Trending") {
      riskScore += 15;
      reasons.push(
        "Linear Averaging pada pasar trending memiliki eksposur risiko lebih terkendali (penambahan lot tetap), namun tetap rentan terhadap volatilitas tinggi. | Linear Averaging in trending market has more controlled risk exposure (fixed lot addition), but remains vulnerable to high volatility."
      );
      warnings.push(
        "Data Backtesting Tesis: Linear 40pts mengalami margin call pada periode bullish 2025. Rekomendasi: target 30pts lebih stabil. | Thesis Backtest Data: Linear 40pts suffered margin call in 2025 bullish period. Recommendation: 30pts target is more stable."
      );
    } else {
      riskScore += 5;
      reasons.push(
        "KOMBINASI OPTIMAL: Linear Averaging + sideways menghasilkan metrik produktivitas terbaik (PF 14.73, ROM 334.19%, ER 1.04) berdasarkan data backtesting tesis. | OPTIMAL COMBINATION: Linear Averaging + sideways yields best productivity metrics (PF 14.73, ROM 334.19%, ER 1.04) based on thesis backtest data."
      );
    }
  }

  if (input.targetPoin === "30") {
    if (input.strategy === "Martingale") {
      riskScore += 15;
      reasons.push(
        "Target 30 poin dengan Martingale sangat berisiko - frekuensi averaging tinggi, margin call lebih cepat. | 30 points target with Martingale is very risky - high averaging frequency, faster margin call."
      );
    } else {
      riskScore += 0;
      reasons.push(
        "Target 30 poin dengan Linear Averaging adalah yang paling stabil berdasarkan data thesis. | 30 points target with Linear Averaging is most stable based on thesis data."
      );
    }
  } else if (input.targetPoin === "40") {
    if (input.strategy === "Martingale") {
      riskScore += 10;
      reasons.push(
        "Target 40 poin dengan Martingale produktif di kondisi ideal, tapi tetap berisiko tinggi. | 40 points target with Martingale is productive in ideal conditions, but still high risk."
      );
    } else {
      riskScore += 10;
      reasons.push(
        "Target 40 poin dengan Linear Averaging berisiko sedang. | 40 points target with Linear Averaging has moderate risk."
      );
    }
  } else {
    if (input.strategy === "Martingale") {
      riskScore += 5;
      reasons.push(
        "Target 50 poin dengan Martingale memberikan ruang koreksi lebih lebar, tapi eksposur modal tetap besar. | 50 points target with Martingale provides wider correction room, but capital exposure remains large."
      );
    } else {
      riskScore += 5;
      reasons.push(
        "Target 50 poin dengan Linear Averaging memerlukan pergerakan harga lebih besar. | 50 points target with Linear Averaging requires larger price movement."
      );
    }
  }

  // ANALISIS LAYER (Sensitivity Analysis dari Tesis)
  const maxLayer = parseInt(input.maxLayer);
  if (maxLayer >= 5) {
    riskScore += 20;
    reasons.push(
      "SENSITIVITAS LAYER KRITIS: Layer 5 merupakan titik amplifikasi risiko maksimum. Pada Martingale, lot layer 5 = 16× lot awal (L₀ × 2⁴). | CRITICAL LAYER SENSITIVITY: Layer 5 is maximum risk amplification point. For Martingale, layer 5 lot = 16× initial lot (L₀ × 2⁴)."
    );
    warnings.push(
      "Temuan Tesis: Layer 4-5 adalah zona kritis margin call. Capital requirement meningkat secara non-linear untuk bertahan. | Thesis Finding: Layers 4-5 are margin call critical zone. Capital requirement increases non-linearly to survive."
    );
    if (input.strategy === "Martingale") {
      psychologyNotes.push(`${BEHAVIORAL_BIASES.lossAversion.id} | ${BEHAVIORAL_BIASES.lossAversion.en}`);
    }
  } else if (maxLayer === 4) {
    riskScore += 12;
    reasons.push(
      "Layer 4 memiliki eksposur risiko signifikan (lot = 8× lot awal pada Martingale). Modal harus memperhitungkan floating drawdown maksimum. | Layer 4 has significant risk exposure (lot = 8× initial lot for Martingale). Capital must account for maximum floating drawdown."
    );
  } else {
    riskScore += 5;
    reasons.push(
      "Pembatasan 3 layer merupakan strategi mitigasi risiko yang efektif untuk membatasi amplifikasi eksponensial. | Limiting to 3 layers is effective risk mitigation strategy to constrain exponential amplification."
    );
  }

  // ANALISIS PENGALAMAN (Behavioral Finance Framework)
  if (input.experience === "Pemula") {
    riskScore += 15;
    reasons.push(
      "Trader pemula memiliki kerentanan tinggi terhadap bias kognitif dan emosional dalam pengambilan keputusan (studi behavioral finance). | Beginner traders have high vulnerability to cognitive and emotional biases in decision making (behavioral finance studies)."
    );
    warnings.push(
      "Rekomendasi Tesis: Pemula sebaiknya menggunakan parameter konservatif (Linear Averaging, 30pts, 3 layer) untuk meminimalkan eksposur risiko. | Thesis Recommendation: Beginners should use conservative parameters (Linear Averaging, 30pts, 3 layers) to minimize risk exposure."
    );
    psychologyNotes.push(`${BEHAVIORAL_BIASES.herding.id} | ${BEHAVIORAL_BIASES.herding.en}`);
    psychologyNotes.push(`${BEHAVIORAL_BIASES.anchoring.id} | ${BEHAVIORAL_BIASES.anchoring.en}`);
  } else {
    riskScore += 5;
    reasons.push(
      "Pengalaman trading berkontribusi pada manajemen risiko dan pengendalian emosional yang lebih baik, namun tetap rentan terhadap bias kognitif. | Trading experience contributes to better risk management and emotional control, but remains susceptible to cognitive biases."
    );
  }

  riskScore = Math.max(0, Math.min(100, riskScore));

  let status: RiskStatus;
  if (riskScore <= 35) {
    status = "AMAN";
  } else if (riskScore <= 60) {
    status = "BERISIKO";
  } else {
    status = "TIDAK LAYAK";
  }

  // Tambahan catatan perilaku keuangan berdasarkan framework tesis
  if (psychologyNotes.length === 0) {
    psychologyNotes.push(`${BEHAVIORAL_BIASES.recency.id} | ${BEHAVIORAL_BIASES.recency.en}`);
  }

  // Peringatan universal dari temuan tesis
  psychologyNotes.push(
    "Temuan Tesis: Hingga 95% kerugian trader ritel bersumber dari bias kognitif dan ketidakdisiplinan emosional, bukan ketiadaan strategi teknikal. | Thesis Finding: Up to 95% of retail trader losses stem from cognitive biases and emotional indiscipline, not lack of technical strategy."
  );

  return {
    status,
    score: riskScore,
    reasons,
    warnings,
    psychologyNotes,
    metrics: {
      expectedPF: metrics.pf.toFixed(2),
      expectedROM: `${metrics.rom.toFixed(2)}%`,
      expectedER: metrics.er.toFixed(2),
      marginCallRisk: metrics.mcRisk,
    },
  };
}
