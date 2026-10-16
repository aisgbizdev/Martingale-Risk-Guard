import test from "node:test";
import assert from "node:assert/strict";
import { newsmakerLevels } from "./newsmaker-levels";
const ohlc = { open: 100, high: 120, low: 90, close: 110 };
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
test("Newsmaker Classic, Woodie and Camarilla formulas retain their distinct OHLC bases", () => {
  const { classic: k, woodie: w, camarilla: c } = newsmakerLevels(ohlc);
  near(k.p, 320 / 3);
  near(k.r1, 2 * 320 / 3 - 90);
  near(k.r4, k.p + 30 + 1.618 * 30);
  near(k.s4, k.p - 30 - 1.618 * 30);
  near(w.p, 102.5); // Newsmaker Woodie weights OPEN, not CLOSE.
  near(w.r3, 145);
  near(w.s3, 55);
  near(c.r1, 112.75);
  near(c.s4, 93.5);
});
test("Fibonacci up/down retracements and projections match Newsmaker's two forms", () => {
  const { up, down } = newsmakerLevels(ohlc);
  near(up.retracement.find(x => x.ratio === 0.382)!.price, 108.54);
  near(down.retracement.find(x => x.ratio === 0.382)!.price, 101.46);
  near(up.projection[0].price, 131.46);
  near(down.projection[0].price, 78.54);
  assert.equal(up.retracement.length, 5);
  assert.equal(down.projection.length, 6);
});
test("reference levels reject invalid bars; a flat bar remains a disclosed flat range", () => {
  for (const row of [{ ...ohlc, high: 80 }, { ...ohlc, low: NaN }, { ...ohlc, close: 200 }, { ...ohlc, open: -1 }]) {
    assert.throws(() => newsmakerLevels(row));
  }
  const flat = newsmakerLevels({ open: 100, high: 100, low: 100, close: 100 });
  assert.equal(flat.classic.p, 100);
  assert.ok(flat.up.retracement.every(x => x.price === 100));
});
