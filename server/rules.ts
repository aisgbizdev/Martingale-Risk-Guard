import type { RiskInput, RiskResult, RiskStatus } from "@shared/schema";

const OPTIMAL_MODAL = 200000;

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

export function calculateRisk(input: RiskInput): RiskResult {
  let riskScore = 0;
  const reasons: string[] = [];
  const warnings: string[] = [];
  const psychologyNotes: string[] = [];

  const metrics = THESIS_METRICS[input.strategy]?.[input.targetPoin] || {
    pf: 1.0,
    rom: 0,
    er: 0,
    mcRisk: "Tidak Diketahui / Unknown",
  };

  const modalRatio = input.modal / OPTIMAL_MODAL;
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

  if (input.strategy === "Martingale") {
    riskScore += 20;
    reasons.push(
      "Martingale memiliki risiko eksponensial (lot size = L0 x 2^n) yang dapat menghapus seluruh modal. | Martingale has exponential risk (lot size = L0 x 2^n) that can wipe out entire capital."
    );
    
    if (input.marketCondition === "Trending") {
      riskScore += 25;
      reasons.push(
        "KOMBINASI BERBAHAYA: Martingale + pasar trending terbukti GAGAL (margin call) di backtest 2025. | DANGEROUS COMBO: Martingale + trending market PROVEN TO FAIL (margin call) in 2025 backtest."
      );
      warnings.push(
        "Data thesis: Martingale 30pts mengalami margin call pada tren bullish 2025. | Thesis data: Martingale 30pts suffered margin call in 2025 bullish trend."
      );
    } else {
      riskScore += 10;
      reasons.push(
        "Martingale lebih cocok pada pasar sideways, namun tetap memiliki risiko eksponensial. | Martingale is more suitable for sideways market, but still has exponential risk."
      );
    }
    
    psychologyNotes.push(
      "Overconfidence Bias: Martingale dapat memicu rasa 'pasti untung' padahal risikonya eksponensial. | Overconfidence Bias: Martingale can trigger false sense of 'guaranteed profit' when risk is exponential."
    );
  } else {
    if (input.marketCondition === "Trending") {
      riskScore += 15;
      reasons.push(
        "Linear Averaging pada pasar trending tetap berisiko, namun lebih terkendali dibanding Martingale. | Linear Averaging in trending market is still risky, but more controlled than Martingale."
      );
      warnings.push(
        "Data thesis: Linear 40pts gagal (margin call) pada tren bullish 2025. | Thesis data: Linear 40pts failed (margin call) in 2025 bullish trend."
      );
    } else {
      riskScore += 5;
      reasons.push(
        "Linear Averaging pada pasar sideways adalah kombinasi paling stabil (PF 14.73, ER 1.04). | Linear Averaging in sideways market is the most stable combination (PF 14.73, ER 1.04)."
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

  const maxLayer = parseInt(input.maxLayer);
  if (maxLayer >= 5) {
    riskScore += 20;
    reasons.push(
      "Penggunaan 5 layer memiliki sensitivitas SANGAT TINGGI terhadap margin call. | Using 5 layers has VERY HIGH sensitivity to margin call."
    );
    warnings.push(
      "Layer 4-5 adalah titik kritis - modal harus sangat besar untuk bertahan. | Layers 4-5 are critical points - capital must be very large to survive."
    );
    if (input.strategy === "Martingale") {
      psychologyNotes.push(
        "Loss Aversion: Ketakutan akan kerugian membuat trader terus menambah layer meski modal sudah tertekan. | Loss Aversion: Fear of loss causes traders to keep adding layers even when capital is under pressure."
      );
    }
  } else if (maxLayer === 4) {
    riskScore += 12;
    reasons.push(
      "4 layer masih memiliki risiko signifikan, terutama jika modal tidak mencukupi. | 4 layers still have significant risk, especially if capital is insufficient."
    );
  } else {
    riskScore += 5;
    reasons.push(
      "Pembatasan 3 layer membantu mengendalikan risiko eksponensial. | Limiting to 3 layers helps control exponential risk."
    );
  }

  if (input.experience === "Pemula") {
    riskScore += 15;
    reasons.push(
      "Trader pemula lebih rentan terhadap bias psikologis dalam pengambilan keputusan. | Beginner traders are more susceptible to psychological biases in decision making."
    );
    warnings.push(
      "Pemula disarankan menggunakan parameter konservatif: Linear Averaging, 30pts, 3 layer. | Beginners should use conservative parameters: Linear Averaging, 30pts, 3 layers."
    );
    psychologyNotes.push(
      "Risk Misperception: Mayoritas peserta melihat strategi sebagai 'mudah' tanpa memahami risiko eksponensial. | Risk Misperception: Most participants see strategy as 'easy' without understanding exponential risk."
    );
    psychologyNotes.push(
      "Herding Behaviour: Kecenderungan mengikuti mayoritas tanpa analisis independen dapat memperburuk kerugian. | Herding Behaviour: Tendency to follow the crowd without independent analysis can worsen losses."
    );
  } else {
    riskScore += 5;
    reasons.push(
      "Pengalaman trading membantu dalam manajemen risiko dan pengendalian emosi. | Trading experience helps in risk management and emotional control."
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

  if (psychologyNotes.length === 0) {
    psychologyNotes.push(
      "Tetap waspadai bias psikologis: jangan biarkan emosi mendikte keputusan trading. | Stay aware of psychological biases: don't let emotions dictate trading decisions."
    );
  }

  psychologyNotes.push(
    "Herding Behaviour: Jangan ikut-ikutan tanpa analisis sendiri. Banyak trader gagal karena mengikuti arus. | Herding Behaviour: Don't follow the crowd without your own analysis. Many traders fail by following the herd."
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
