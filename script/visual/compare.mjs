import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { createHash } from "node:crypto";

// Small antialiasing differences are ignored; layout shifts and text changes are not.
export const tolerance = { threshold: 0.1, maxDiffPixels: 80, maxDiffRatio: 0.0001, includeAA: false };
export const hash = buffer => createHash("sha256").update(buffer).digest("hex");
export function compareImages(expectedBytes, actualBytes) {
  const expected = PNG.sync.read(expectedBytes), actual = PNG.sync.read(actualBytes);
  const width = Math.max(expected.width, actual.width), height = Math.max(expected.height, actual.height);
  const padded = image => {
    const result = new PNG({ width, height });
    result.data.fill(255);
    PNG.bitblt(image, result, 0, 0, image.width, image.height, 0, 0);
    return result;
  };
  const diff = new PNG({ width, height });
  const pixels = pixelmatch(padded(expected).data, padded(actual).data, diff.data, width, height, tolerance);
  const ratio = pixels / (width * height);
  const dimensionsMatch = expected.width === actual.width && expected.height === actual.height;
  return {
    passed: dimensionsMatch && pixels <= tolerance.maxDiffPixels && ratio <= tolerance.maxDiffRatio,
    pixels, ratio, dimensionsMatch,
    expected: { width: expected.width, height: expected.height },
    actual: { width: actual.width, height: actual.height },
    diff: PNG.sync.write(diff),
  };
}
