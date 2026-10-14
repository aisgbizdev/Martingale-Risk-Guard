---
name: Live risk analysis direction
description: Product direction under discussion for adding live pricing and analysis to RiskCheck XUL10.
---

RiskCheck is already presented as a feature in the Newsmaker eBook portal; access is behind Newsmaker login (the user says Google ID). Newsmaker is a fundamentals/technical information portal, not a broker or trading service; the user wants RiskCheck's manual, passive assessment to use real-time market conditions and Newsmaker analytical materials. An attached Royal Assetindo WebSocket document describes quotes with a stated five-second delay; its examples show HKK symbols, not XUL10, and it is only a candidate market-data feed, not evidence of a broker relationship with Newsmaker. A separate Newsmaker API document lists economic-calendar, news, and historical-pivot endpoints, some backed by caches. These are candidate sources, not yet confirmed production integrations.

**Why:** Newsmaker does not provide brokerage or trading execution. The exact XUL10 market-data source and stream coverage, freshness and cache schedules, data rights, and intended analysis have not been agreed. The current workspace contains the RiskCheck module, but no visible Newsmaker login implementation.

**How to apply:** Do not treat portal embedding or login as a new feature to build unless the user says the current integration is broken. Keep Newsmaker's role limited to information and analysis, not brokerage or order execution. Before changing RiskCheck, confirm the exact XUL10 market-data source and symbol, source freshness, calendar/news payload fields and cache refresh policy, data rights, fundamental-data scope, and risk limits. Treat bearer tokens shown in the attached API documentation as exposed; never copy them into client code or persistent notes. Do not introduce broker integration or automated order placement.
