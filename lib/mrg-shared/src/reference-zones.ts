export type ReferenceLevel = { price: number; labels: string[] };
export type ReferenceZone = ReferenceLevel & { members: ReferenceLevel[] };

// Display precision only, not an assertion about the instrument's tick size.
const cents = (price: number) => Math.round(Number(price.toFixed(2)) * 100);
export const referenceDistance = (a: number, b: number) => Math.abs(cents(a) - cents(b)) / 100;
export const REFERENCE_ATR_FACTOR = 0.20;

export function referenceSpacing(atr14: number) {
  if (!Number.isFinite(atr14) || atr14 <= 0) {
    throw new Error("ATR14 LGD D1 tidak valid untuk penyaring jarak; tidak memakai jarak pengganti.");
  }
  return { atr14, factor: REFERENCE_ATR_FACTOR,
    minimumGap: Math.max(1, Math.ceil(atr14 * REFERENCE_ATR_FACTOR * 100 - 1e-9)) / 100 };
}

/** Input is ordered nearest-first on one side. Anchor each zone to its
 * representative, never its last member: a chain of nearby prices cannot
 * absorb the entire ladder. Representatives remain original formula prices. */
export function selectReferenceZones(levels: ReferenceLevel[], minimumGap: number): ReferenceZone[] {
  if (!Number.isFinite(minimumGap) || minimumGap <= 0) throw new RangeError("Jarak zona tidak valid.");
  const zones: ReferenceZone[] = [];
  for (const level of levels) {
    const member = { price: level.price, labels: [...level.labels] };
    const last = zones.at(-1);
    if (last && referenceDistance(last.price, member.price) < minimumGap) last.members.push(member);
    else zones.push({ ...member, members: [member] });
  }
  return zones;
}
