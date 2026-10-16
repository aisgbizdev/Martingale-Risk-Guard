export function paramsKey(p: { modal: number | string; targetPoin: string; strategy: string; maxLayer: string; experience: string; marketCondition: string }) {
  return [Number(p.modal), p.targetPoin, p.strategy, p.maxLayer, p.experience, p.marketCondition].join("|");
}
