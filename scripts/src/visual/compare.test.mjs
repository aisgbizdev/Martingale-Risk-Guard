import { test } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { compareImages } from "./compare.mjs";
const image = (width = 100, height = 100, edit = () => {}) => {
  const png = new PNG({ width, height }); png.data.fill(255); edit(png);
  return PNG.sync.write(png);
};
test("identical pixels pass", () => assert.equal(compareImages(image(), image()).passed, true));
test("a changed button or warning block fails", () => {
  const actual = image(100, 100, png => {
    for (let y = 30; y < 50; y++) for (let x = 10; x < 80; x++) {
      const p = (y * 100 + x) * 4; png.data[p] = 16; png.data[p + 1] = 97; png.data[p + 2] = 179;
    }
  });
  assert.equal(compareImages(image(), actual).passed, false);
});
test("height and width changes always fail even if all pixels are white", () => {
  assert.equal(compareImages(image(), image(100, 101)).passed, false);
  assert.equal(compareImages(image(), image(101, 100)).passed, false);
});
test("small colour noise is tolerated", () => {
  assert.equal(compareImages(image(), image(100, 100, png => png.data.fill(254))).passed, true);
});
