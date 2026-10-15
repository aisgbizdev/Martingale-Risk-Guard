---
name: Quote feed documentation scope
description: Why both the supplied consumer-guide shape and the directly observed quote-provider shape matter.
---

The supplied TradingView/prices guide describes a consumer wrapper rather than an exact guarantee of the direct upstream payload. Directly observed prices expose native full-date tick timestamps alongside a time-only display clock; the guide instead lists optional per-symbol update times.

**Why:** The initial implementation worked against the directly observed feed, but a documented-wrapper-shaped response would have lost its publication timestamp. Testing only the live provider shape missed that compatibility boundary.

**How to apply:** Verify both documented and directly observed shapes. Freshness must come from a valid full-date per-symbol publication timestamp, never the envelope refresh time, receipt time, or a date inferred from a time-only clock. Conflicting per-symbol timestamps must not make an older tick appear fresh.
