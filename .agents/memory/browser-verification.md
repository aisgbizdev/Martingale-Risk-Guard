---
name: Browser verification quirks
description: Distinguishing the imported app from injected preview code during browser storage fault tests.
---

Replit's development preview injects a banner script outside the application. A browser-wide simulated denial of Storage access also affects that script, even when the application correctly catches the denial and displays its own error state.

**Why:** A storage fault test produced a bare SecurityError from the injected development banner while the MRG interface remained functional and reported the failed storage access. The exception message alone did not identify the source.

**How to apply:** Attribute browser exceptions by their stack source. Only an expected storage-denial exception whose nonempty frames belong exclusively to the injected preview banner may be distinguished from an app failure. Keep failures from application code and unexpected third-party errors visible; do not broadly suppress errors.

Browser-local portfolios belong to the specific browser profile used to create them, not to the project workspace.

**Why:** Screenshot capture and an isolated interaction-test browser do not share those local records.

**How to apply:** Verify initial/empty states with the ordinary screenshot capture. Capture populated test states from the same isolated browser that created them; an empty portfolio in a different browser is not evidence of data loss.
