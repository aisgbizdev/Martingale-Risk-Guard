---
name: PWA update boundaries
description: Atomic shell versioning, ownership, and avoiding reload-induced loss of unsaved work.
---

Treat an offline shell as a complete build, not as a substitute for live market data. Give every changed precache input, including worker-only or stable-URL branding changes, an isolated candidate cache.

**Why:** Reusing the active cache while installing an update can compromise the previous working shell. HTML-only fingerprints overlook worker and fixed-URL manifest/icon changes. Cached UI must never make failed live API requests appear successful.

**How to apply:** Keep the old verified shell until candidate installation succeeds; use only the owning worker's cache for fallback, preserve authentication/client errors, and leave portfolio/study storage untouched.

Do not automatically reload an open page when a new worker claims it.

**Why:** Saved notes persist, but forms and live simulation snapshots can exist only in memory. An automatic reload can discard that work during a demonstration or edit.

**How to apply:** New code may take effect on the next full load. Any future in-app update action must make loss of unsaved work explicit and must not promise restoration of cancelled drafts.
