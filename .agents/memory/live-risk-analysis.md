---
name: Live risk analysis direction
description: Product direction under discussion for adding live pricing and analysis to RiskCheck XUL10.
---

The user is exploring evolving RiskCheck XUL10 from fixed thesis-based scoring toward real-time pricing with technical and fundamental analysis to inform martingale or averaging scenarios. An attached Royal Assetindo WebSocket document describes quotes with a stated five-second delay; its examples show HKK symbols, not XUL10. A separate Newsmaker API document lists economic-calendar, news, and historical-pivot endpoints, some backed by caches. These are candidate sources, not yet confirmed production integrations.

**Why:** The exact XUL10 stream coverage, freshness and cache schedules, data rights, intended analysis, and whether the app should only inform or execute trades have not been agreed.

**How to apply:** Before implementation, confirm the exact XUL10 symbol and feed, source freshness, the calendar/news payload fields and cache refresh policy, data rights, fundamental-data scope, risk limits, and analysis-only versus broker execution. Treat bearer tokens shown in the attached API documentation as exposed; never copy them into client code or persistent notes. Keep automated order placement out of scope unless explicitly agreed.
