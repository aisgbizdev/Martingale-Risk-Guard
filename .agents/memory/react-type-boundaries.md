---
name: React type boundaries
description: Preserve the original app's React major while sharing workspace tooling.
---

Preserve MRG's existing React major when adding shared server libraries or regenerating clients; do not migrate its runtime to resolve mixed React type errors.

**Why:** Workspace siblings and generated-client tooling use a different React major. A clean dependency installation exposed incompatible JSX definitions even though no frontend runtime dependency changed.

**How to apply:** Check which React type boundary each artifact resolves before changing component code or upgrading libraries. Keep the app's type resolution consistent with its own runtime; siblings can retain their independent major.
