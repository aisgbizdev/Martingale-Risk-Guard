---
name: Live risk analysis direction
description: Product direction under discussion for adding live pricing and analysis to RiskCheck XUL10.
---

RiskCheck is already presented as a feature in the Newsmaker eBook portal; access is behind Newsmaker login (the user says Google ID). The user wants to upgrade its manual, passive risk assessment toward real-time technical and fundamental analysis for martingale or averaging scenarios. An attached Royal Assetindo WebSocket document describes quotes with a stated five-second delay; its examples show HKK symbols, not XUL10. A separate Newsmaker API document lists economic-calendar, news, and historical-pivot endpoints, some backed by caches. These are candidate sources, not yet confirmed production integrations.

**Why:** The exact XUL10 stream coverage, freshness and cache schedules, data rights, intended analysis, and whether the app should only inform or execute trades have not been agreed. The current workspace contains the RiskCheck module, but no visible Newsmaker login implementation.

**How to apply:** Do not treat portal embedding or login as a new feature to build unless the user says the current integration is broken. Before changing RiskCheck, confirm its boundary with the host login, the exact XUL10 symbol and feed, source freshness, calendar/news payload fields and cache refresh policy, data rights, fundamental-data scope, risk limits, and analysis-only versus broker execution. Treat bearer tokens shown in the attached API documentation as exposed; never copy them into client code or persistent notes. Keep automated order placement out of scope unless explicitly agreed.
