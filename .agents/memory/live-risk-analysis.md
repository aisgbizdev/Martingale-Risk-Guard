---
name: Live risk analysis direction
description: Product direction under discussion for adding live pricing and analysis to RiskCheck XUL10.
---

RiskCheck is already presented as a feature in the Newsmaker eBook portal; access is behind Newsmaker login (the user says Google ID). Newsmaker is a fundamentals/technical information portal, not a broker or trading service; the user wants RiskCheck's manual, passive assessment to use real-time market conditions and Newsmaker analytical materials. The user confirmed the initial approach: TradingView for chart display, with a separate structured feed for calculations; symbols can later be adjusted to XUL10. Standard TradingView widgets are display tools, not an API that RiskCheck can use to read quotes or indicators; per-symbol data may be delayed. A supplied TradePilot technical note describes a Newsmaker-branded live-quote upstream that maps raw XUL10 to XAU/USD, plus daily/weekly history from that upstream. Its intraday XAU/USD candles instead map to Yahoo `GC=F`, which may not match the XUL10 price basis. The Newsmaker API PDF documents the economic-calendar endpoint `/v1/newsmaker/kalender-ekonomi`; it is Bearer-authenticated and cache-backed, paginates 20 events, and can return 503 when cache is missing. Investing.com offers an embeddable economic-calendar widget under its terms, but that display does not itself supply structured input to RiskCheck.

The user chose automatically updated risk scores and warnings, rather than instructions to add or hold positions. Additional-layer simulation must remain hypothetical and separate from manually recorded positions, with no broker execution. For this upgrade, the user explicitly wants to treat RiskCheck as a separate application and exclude portal/login integration.

The user selected daily technical analysis for the first release rather than waiting for H1 candles. Live quotes and daily indicators have separate update frequencies; do not describe daily technical analysis as tick-by-tick.

**Why (timeframe):** The user approved starting with daily candles. This does not itself verify that the daily-history price basis matches XUL10.

The user approved using LGD Daily as explicitly labelled gold reference, not an identical XUL10 contract feed, and initial heuristic index weights of 40/20/15/15/10 for lot capacity, layer capacity, adverse price distance, daily volatility, and nearby USD events.

**Why (index):** The user approved an initial transparent index and asked whether the weights were correct. They are a starting heuristic, not statistically validated probabilities or whole-account financial risk; calibration remains separate work.

**Why:** Newsmaker does not provide brokerage or trading execution. The supplied docs suggest sources, but the real-time/history price-basis alignment, feed permissions, event-cache freshness, and precise analysis rules still need confirmation.

**How to apply:** Do not treat portal embedding or login as a new feature to build unless the user says the current integration is broken. Keep Newsmaker's role limited to information and analysis, not brokerage or order execution. Use TradingView only for chart display; use a separate structured feed for calculations. Before implementing technical triggers, agree on what the user-facing output should mean and confirm XUL10 live quotes and historical candles share an appropriate price basis, calendar payload fields and cache refresh policy, data rights, fundamental-data scope, and risk limits. Use the PDF's Newsmaker calendar endpoint rather than the TradePilot calendar route when the user requests it. Treat bearer tokens shown in attached documentation as exposed; never copy them into client code or persistent notes. Do not introduce broker integration or automated order placement.
