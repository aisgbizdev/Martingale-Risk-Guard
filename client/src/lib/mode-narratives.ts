import type { AppMode } from "./mode-context";

export interface ModeNarrative {
  statusAman: { id: string; en: string };
  statusBerisiko: { id: string; en: string };
  statusTidakLayak: { id: string; en: string };
  marginExplanation: { id: string; en: string };
  drawdownExplanation: { id: string; en: string };
  riskExposureExplanation: { id: string; en: string };
  remSentence: { id: string; en: string };
  interactiveLabel: { id: string; en: string };
  interactiveHint: { id: string; en: string };
}

export const modeNarratives: Record<AppMode, ModeNarrative> = {
  public: {
    statusAman: {
      id: "Kombinasi parameter Anda menunjukkan tingkat risiko yang relatif rendah berdasarkan data backtesting penelitian.",
      en: "Your parameter combination shows a relatively low risk level based on research backtest data.",
    },
    statusBerisiko: {
      id: "Kombinasi parameter Anda menunjukkan risiko yang perlu diwaspadai. Pertimbangkan untuk menyesuaikan parameter.",
      en: "Your parameter combination shows risk that needs attention. Consider adjusting parameters.",
    },
    statusTidakLayak: {
      id: "Kombinasi parameter ini menunjukkan risiko sangat tinggi. Sangat disarankan untuk mengubah parameter.",
      en: "This parameter combination shows very high risk. Strongly recommended to change parameters.",
    },
    marginExplanation: {
      id: "",
      en: "",
    },
    drawdownExplanation: {
      id: "",
      en: "",
    },
    riskExposureExplanation: {
      id: "",
      en: "",
    },
    remSentence: {
      id: "Status AMAN tidak berarti bebas risiko. Ini alat edukasi & mitigasi risiko, bukan saran transaksi.",
      en: "SAFE status does not mean risk-free. This is an education & risk mitigation tool, not transaction advice.",
    },
    interactiveLabel: {
      id: "Simulasikan Risiko",
      en: "Simulate Risk",
    },
    interactiveHint: {
      id: "Silakan ubah parameter untuk melihat bagaimana risiko berubah.",
      en: "Try changing parameters to see how risk changes.",
    },
  },
  internal: {
    statusAman: {
      id: "Analisis menunjukkan tingkat risiko rendah. Kombinasi parameter ini memiliki profil risiko yang lebih terkendali berdasarkan hasil backtesting.",
      en: "Analysis shows low risk level. This parameter combination has a more controlled risk profile based on backtest results.",
    },
    statusBerisiko: {
      id: "Analisis menunjukkan tingkat risiko moderat. Dengan penambahan layer, kebutuhan margin meningkat secara bertahap. Pada kondisi pasar yang bergerak satu arah, margin dapat terkuras lebih cepat dari perkiraan awal.",
      en: "Analysis shows moderate risk level. With additional layers, margin requirements increase gradually. In trending market conditions, margin can be depleted faster than initially estimated.",
    },
    statusTidakLayak: {
      id: "Analisis menunjukkan tingkat risiko tinggi. Drawdown maksimum pada kombinasi parameter ini berpotensi membesar karena posisi bertambah saat harga bergerak berlawanan. Setiap layer tambahan meningkatkan eksposur risiko secara kumulatif.",
      en: "Analysis shows high risk level. Maximum drawdown with this parameter combination has potential to increase as positions accumulate when price moves against. Each additional layer increases risk exposure cumulatively.",
    },
    marginExplanation: {
      id: "Dengan penambahan layer, kebutuhan margin meningkat secara bertahap. Pada kondisi pasar yang bergerak satu arah, margin dapat terkuras lebih cepat dari perkiraan awal.",
      en: "With additional layers, margin requirements increase gradually. In trending market conditions, margin can be depleted faster than initially estimated.",
    },
    drawdownExplanation: {
      id: "Drawdown maksimum pada kombinasi parameter ini berpotensi membesar karena posisi bertambah saat harga bergerak berlawanan.",
      en: "Maximum drawdown with this parameter combination has potential to increase as positions accumulate when price moves against.",
    },
    riskExposureExplanation: {
      id: "Setiap layer tambahan meningkatkan eksposur risiko secara kumulatif. Oleh karena itu, pembatasan jumlah layer merupakan bentuk mitigasi risiko, bukan strategi profit.",
      en: "Each additional layer increases risk exposure cumulatively. Therefore, limiting the number of layers is a form of risk mitigation, not a profit strategy.",
    },
    remSentence: {
      id: "Status AMAN tidak berarti bebas risiko. Aplikasi ini adalah alat bantu edukasi risiko untuk membantu WPB menjelaskan risiko ke nasabah, bukan alat trading.",
      en: "SAFE status does not mean risk-free. This application is a risk education tool to help brokers explain risk to clients, not a trading tool.",
    },
    interactiveLabel: {
      id: "Simulasikan Risiko",
      en: "Simulate Risk",
    },
    interactiveHint: {
      id: "Gunakan fitur ini untuk membantu nasabah memahami bagaimana perubahan parameter mempengaruhi tingkat risiko.",
      en: "Use this feature to help clients understand how parameter changes affect risk levels.",
    },
  },
  regulator: {
    statusAman: {
      id: "Berdasarkan metodologi penelitian tesis, kombinasi parameter ini menghasilkan profil risiko dalam kategori rendah. Hasil analisis bersifat edukatif dan mendukung prinsip perlindungan nasabah.",
      en: "Based on thesis research methodology, this parameter combination produces a risk profile in the low category. Analysis results are educational and support client protection principles.",
    },
    statusBerisiko: {
      id: "Berdasarkan metodologi penelitian tesis, kombinasi parameter ini menghasilkan profil risiko dalam kategori moderat. Sistem menampilkan informasi ini untuk meningkatkan kesadaran pengguna terhadap potensi risiko.",
      en: "Based on thesis research methodology, this parameter combination produces a risk profile in the moderate category. The system displays this information to increase user awareness of potential risks.",
    },
    statusTidakLayak: {
      id: "Berdasarkan metodologi penelitian tesis, kombinasi parameter ini menghasilkan profil risiko dalam kategori tinggi. Analisis ini bertujuan mendukung literasi risiko dan perlindungan nasabah dalam perdagangan berjangka.",
      en: "Based on thesis research methodology, this parameter combination produces a risk profile in the high category. This analysis aims to support risk literacy and client protection in futures trading.",
    },
    marginExplanation: {
      id: "Sistem menampilkan informasi terkait implikasi margin untuk meningkatkan pemahaman pengguna.",
      en: "The system displays margin-related information to increase user understanding.",
    },
    drawdownExplanation: {
      id: "Potensi drawdown disampaikan sebagai bagian dari literasi risiko kepada pengguna.",
      en: "Potential drawdown is communicated as part of risk literacy to users.",
    },
    riskExposureExplanation: {
      id: "Eksposur risiko kumulatif dijelaskan untuk mendukung keputusan yang lebih informed oleh pengguna.",
      en: "Cumulative risk exposure is explained to support more informed decisions by users.",
    },
    remSentence: {
      id: "Aplikasi Martingale Risk Guard dirancang sebagai alat edukasi dan mitigasi risiko. Sistem ini tidak memberikan rekomendasi transaksi, sinyal perdagangan, atau arahan strategis kepada pengguna.",
      en: "Martingale Risk Guard is designed as an education and risk mitigation tool. This system does not provide transaction recommendations, trading signals, or strategic direction to users.",
    },
    interactiveLabel: {
      id: "Lihat Perubahan Risiko",
      en: "View Risk Changes",
    },
    interactiveHint: {
      id: "Fitur ini memungkinkan pengguna melihat konsekuensi risiko dari berbagai kombinasi parameter sebagai bagian dari literasi risiko.",
      en: "This feature allows users to see risk consequences from various parameter combinations as part of risk literacy.",
    },
  },
};

export function getNarrative(mode: AppMode, key: keyof ModeNarrative, language: "id" | "en"): string {
  return modeNarratives[mode][key][language];
}
