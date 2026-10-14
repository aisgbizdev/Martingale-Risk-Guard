---
name: Browser verification quirks
description: Storage-fault attribution, browser-target selection, external widgets, and limits of PWA verification.
---

Replit's development preview injects a banner script outside the application. A browser-wide simulated denial of Storage access also affects that script, even when the application correctly catches the denial and displays its own error state.

**Why:** A storage fault test produced a bare SecurityError from the injected development banner while the MRG interface remained functional and reported the failed storage access. The exception message alone did not identify the source.

**How to apply:** Attribute browser exceptions by their stack source. Only an expected storage-denial exception whose nonempty frames belong exclusively to the injected preview banner may be distinguished from an app failure. Keep failures from application code and unexpected third-party errors visible; do not broadly suppress errors.

Browser-local portfolios belong to the specific browser profile used to create them, not to the project workspace.

**Why:** Screenshot capture and an isolated interaction-test browser do not share those local records.

**How to apply:** Verify initial/empty states with the ordinary screenshot capture. Capture populated test states from the same isolated browser that created them; an empty portfolio in a different browser is not evidence of data loss.

Chromium's debugging-target list can start with an extension background page rather than the application tab.

**Why:** A production-PWA check attached to an extension context and waited on an empty background document even though navigation had been requested.

**How to apply:** Select an actual page target by its type, not by array position. When a browser check sees an unexpected empty document, inspect its current URL and target type before changing application code.

Third-party widget loaders can remove their own script tag after creating a working iframe.

**Why:** TradingView's official loader removed its tag after generating the chart; requiring that tag to remain in the DOM produced a false test failure.

**How to apply:** Verify the loader's resource request and the generated iframe's expected origin and configuration, rather than requiring a persistent script element.
PWA readiness checks in desktop Chromium are not evidence of installation or persistence on a physical Android or iPhone. A local production-build fixture is not a production deployment.

**Why:** Mobile viewport emulation and synthetic installation events cannot validate the OS launcher, standalone launch, software keyboard, safe-area insets, or device restart behavior.

**How to apply:** State browser version, test environment and simulated conditions explicitly. Keep physical-device results unverified until supported by an approved device session or Newsmaker programmer recordings/report; obtain any production URL from deployment metadata.
