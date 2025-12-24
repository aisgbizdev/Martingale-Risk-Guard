import type { RiskInput, RiskResult, RiskStatus } from "@shared/schema";

interface ScoreBreakdown {
  targetPoin: number;
  strategy: number;
  layer: number;
  experience: number;
  marketCondition: number;
  modalAdequacy: number;
  combinationBonus: number;
}

function calculateModalAdequacy(modal: number, strategy: string, maxLayer: string): number {
  const layerNum = parseInt(maxLayer);
  
  const minModalMartingale: Record<number, number> = {
    3: 2000,
    4: 4000,
    5: 8000,
  };
  
  const minModalLinear: Record<number, number> = {
    3: 1000,
    4: 2000,
    5: 4000,
  };
  
  const minRequired = strategy === "Martingale" 
    ? minModalMartingale[layerNum] 
    : minModalLinear[layerNum];
  
  if (modal >= minRequired * 2) return 0;
  if (modal >= minRequired * 1.5) return 5;
  if (modal >= minRequired) return 10;
  if (modal >= minRequired * 0.5) return 20;
  return 30;
}

function calculateCombinationBonus(input: RiskInput): number {
  let bonus = 0;
  
  if (input.strategy === "Martingale" && input.marketCondition === "Trending") {
    bonus += 15;
  }
  
  if (input.strategy === "Martingale" && input.maxLayer === "5") {
    bonus += 10;
  }
  
  if (input.targetPoin === "50" && input.experience === "Pemula") {
    bonus += 10;
  }
  
  if (input.strategy === "Martingale" && input.experience === "Pemula" && input.marketCondition === "Trending") {
    bonus += 10;
  }
  
  return bonus;
}

export function calculateRisk(input: RiskInput): RiskResult {
  const breakdown: ScoreBreakdown = {
    targetPoin: 0,
    strategy: 0,
    layer: 0,
    experience: 0,
    marketCondition: 0,
    modalAdequacy: 0,
    combinationBonus: 0,
  };

  switch (input.targetPoin) {
    case "30": breakdown.targetPoin = 5; break;
    case "40": breakdown.targetPoin = 10; break;
    case "50": breakdown.targetPoin = 20; break;
  }

  breakdown.strategy = input.strategy === "Martingale" ? 25 : 10;

  switch (input.maxLayer) {
    case "3": breakdown.layer = 5; break;
    case "4": breakdown.layer = 10; break;
    case "5": breakdown.layer = 15; break;
  }

  breakdown.experience = input.experience === "Pemula" ? 15 : 5;

  breakdown.marketCondition = input.marketCondition === "Trending" ? 10 : 5;

  breakdown.modalAdequacy = calculateModalAdequacy(input.modal, input.strategy, input.maxLayer);

  breakdown.combinationBonus = calculateCombinationBonus(input);

  let score = 
    breakdown.targetPoin + 
    breakdown.strategy + 
    breakdown.layer + 
    breakdown.experience + 
    breakdown.marketCondition + 
    breakdown.modalAdequacy +
    breakdown.combinationBonus;

  score = Math.min(100, Math.max(0, score));

  let status: RiskStatus;
  if (score <= 39) {
    status = "AMAN";
  } else if (score <= 69) {
    status = "BERISIKO";
  } else {
    status = "TIDAK LAYAK";
  }

  const reasons = generateReasons(input, breakdown, status);
  const warnings = generateWarnings(input, status);
  const psychologyNotes = generatePsychologyNotes(input);

  return {
    status,
    score,
    reasons,
    warnings,
    psychologyNotes,
  };
}

function generateReasons(input: RiskInput, breakdown: ScoreBreakdown, status: RiskStatus): string[] {
  const reasons: string[] = [];

  if (input.strategy === "Martingale") {
    reasons.push("Strategi Martingale memiliki risiko eksponensial karena menggandakan posisi setiap kali rugi.");
  } else {
    reasons.push("Strategi Linear Averaging memiliki risiko yang lebih terkendali dibanding Martingale.");
  }

  if (input.targetPoin === "50") {
    reasons.push("Target 50 poin per siklus termasuk agresif dan memerlukan pergerakan harga yang lebih besar.");
  } else if (input.targetPoin === "40") {
    reasons.push("Target 40 poin per siklus termasuk moderat.");
  } else {
    reasons.push("Target 30 poin per siklus termasuk konservatif dan lebih realistis dicapai.");
  }

  if (input.maxLayer === "5") {
    reasons.push("Penggunaan 5 layer maksimal meningkatkan eksposur risiko secara signifikan.");
  }

  if (breakdown.modalAdequacy > 15) {
    reasons.push("Modal yang tersedia kurang memadai untuk strategi dan parameter yang dipilih.");
  } else if (breakdown.modalAdequacy > 0) {
    reasons.push("Modal yang tersedia cukup namun disarankan untuk menambah buffer keamanan.");
  }

  if (input.marketCondition === "Trending" && input.strategy === "Martingale") {
    reasons.push("Kombinasi Martingale di pasar trending sangat berbahaya karena tren dapat berlanjut melawan posisi.");
  }

  return reasons;
}

function generateWarnings(input: RiskInput, status: RiskStatus): string[] {
  const warnings: string[] = [];

  if (status === "TIDAK LAYAK") {
    warnings.push("Parameter yang dipilih memiliki risiko sangat tinggi. Pertimbangkan untuk mengubah strategi atau mengurangi layer.");
  }

  if (input.strategy === "Martingale") {
    warnings.push("Martingale dapat menyebabkan margin call dalam kondisi pasar yang tidak menguntungkan.");
    warnings.push("Tail risk pada Martingale dapat menghapus seluruh modal dalam satu siklus yang gagal.");
  }

  if (input.maxLayer === "5") {
    warnings.push("Penggunaan 5 layer memerlukan modal besar dan toleransi risiko tinggi.");
  }

  if (input.experience === "Pemula") {
    warnings.push("Trader pemula disarankan menggunakan parameter yang lebih konservatif.");
  }

  if (input.marketCondition === "Trending") {
    warnings.push("Pasar trending dapat membuat averaging strategy sulit untuk recover.");
  }

  return warnings;
}

function generatePsychologyNotes(input: RiskInput): string[] {
  const notes: string[] = [];

  notes.push(
    "Overconfidence Bias: Jangan terlalu percaya diri setelah beberapa kali berhasil. " +
    "Keberhasilan masa lalu tidak menjamin keberhasilan di masa depan."
  );

  notes.push(
    "Loss Aversion: Kecenderungan untuk menghindari kerugian lebih kuat daripada keinginan mendapat keuntungan. " +
    "Ini bisa membuat Anda menahan posisi rugi terlalu lama."
  );

  if (input.strategy === "Martingale") {
    notes.push(
      "Gambler's Fallacy: Jangan berasumsi bahwa setelah beberapa kali kalah, pasti akan menang. " +
      "Setiap trade adalah independent event."
    );
  }

  notes.push(
    "Risk Misperception: Manusia cenderung meremehkan probabilitas kejadian langka (tail risk). " +
    "Margin call mungkin jarang terjadi, tapi dampaknya bisa menghancurkan."
  );

  return notes;
}
