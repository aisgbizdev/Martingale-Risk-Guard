---
name: Panel navigation semantics
description: Product decisions for Back, Forward and paused simulation settings.
---

Treat Forward as navigation, not as undoing cancellation. It may reopen a clean panel, but must not revive a cancelled edit or abandoned simulation snapshot, refresh a price reference, or record a position.

**Why:** Browser history can outlive the working simulation and survive reloads. Reviving financial working data would undermine cancellation and could make an old reference appear current.

**How to apply:** Keep working drafts and snapshots out of navigation metadata. Only a still-live simulation paused for its nested settings may resume the exact snapshot; saved setting changes must still trigger its stale-snapshot guard. Back, X and Cancel from nested settings return to that simulation before closing it.
