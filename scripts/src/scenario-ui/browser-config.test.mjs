import assert from "node:assert/strict";
import test from "node:test";
import { browserProfile, engines } from "./browser-config.mjs";

test("default remains Chromium with legacy report location", () => {
  assert.equal(browserProfile().engine, "chromium");
  assert.equal(browserProfile().outputSuffix, "");
});
for (const engine of engines) test(`${engine} has an explicit identity and separate output`, () => {
  const profile = browserProfile([`--browser=${engine}`]);
  assert.equal(profile.engine, engine);
  assert.equal(profile.outputSuffix, engine === "chromium" ? "" : engine);
  assert.equal(profile.appleSafariVerified, false);
});
test("WebKit is never labelled Safari", () => {
  assert.match(browserProfile(["--browser=webkit"]).browserProduct, /not Apple Safari/);
  assert.throws(() => browserProfile(["--browser=safari"]), /Unsupported browser/);
});
test("typos and multiple engines cannot silently run Chromium instead", () => {
  assert.throws(() => browserProfile(["--browser=friefox"]), /Unsupported/);
  assert.throws(() => browserProfile(["--browser=firefox", "--browser=webkit"]), /one/);
  assert.throws(() => browserProfile(["--unknown"]), /one/);
});
