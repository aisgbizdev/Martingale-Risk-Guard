# Martingale Risk Guard

## Overview

Martingale Risk Guard (MRG / RiskCheck XUL10) is an educational risk-information application for Newsmaker readers. It combines live XUL10 prices, a clearly labelled daily gold reference, economic events, local manual position records and hypothetical layer comparisons. The original thesis calculator remains separate under `/basic`. Newsmaker is not a broker; there is no order execution, account connection, or trading-signal workflow.

## User Preferences

Preferred communication style: Simple, everyday language.

## Running on Replit

- Use the **Run** button / **Start application** workflow, which runs `npm run dev`.
- Express serves the React app and API together on `0.0.0.0:5000`.
- The basic calculator needs no API credentials. Live calendar/news require the server-only `NEWSMAKER_API_TOKEN` secret. Never copy a token from the supplied PDFs into code, logs, or browser requests.
- No portfolio database or login is used. Live position records/preferences are local to each browser, without cloud sync.
- Install dependencies with `npm ci` when setting up a fresh checkout.
- Build with `npm run build`; run the built app with `npm start`.
- Setup verification: homepage rendered in preview, valid calculation returned HTTP 200, invalid input returned HTTP 400, and production build passed.
- Validate with `npm run check`, `npm test`, and `npm run build`. With the app workflow running and Chromium available, `npm run test:ui` checks isolated-browser flows and actual provider responses; outputs are ignored under generated-artifacts.
- Express remains on version 4. The `proxy-addr` override selects a patched release because the imported locked release was blocked by Replit's package security policy.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API
- **Build Process**: esbuild for production bundling with dependency allowlisting
- **Development**: tsx for TypeScript execution, Vite dev server for HMR

### Data Flow
1. User submits basic risk parameters via form on `/basic`
2. Parameters passed as URL query strings to result page
3. Result page fetches risk calculation from `/api/calculate-risk` endpoint
4. Server applies rule-based scoring algorithm from thesis research
5. Returns risk status, score, warnings, and psychology notes

### Risk Calculation Engine
Located in `server/rules.ts`, implements thesis-derived metrics:
- Hardcoded performance metrics (PF, ROM, ER, MC Risk) per strategy/target combination
- Modal ratio scoring against optimal USD 200,000 benchmark
- Weighted factors: strategy type, market conditions, experience level, layer count
- Internal legacy enums are preserved; score ranges are 0–35, 36–60, and 61–100. UI labels use relative risk and historical-study context, not claims of safety.

### Live MRG data and model
- Routes: `/` overview, `/positions` manual records/simulation, `/analysis` daily reference/calendar/articles, `/basic` original calculator, plus existing results/literacy/policies.
- `/api/market/quotes` normalizes the documented Newsmaker quote upstream, preserving the XUL10 per-symbol tick timestamp and optional bid/ask. Shared cache/poll interval is about 5 seconds. A connected response or fresh top-level timestamp is not evidence of a fresh symbol.
- `/api/market/context` loads the documented LGD Daily OHLC, the PDF section 3.2 calendar API, and Newsmaker news. Calendar fetches all bounded pages for this-week and next-week; incomplete or changing pagination fails explicitly.
- Only closed daily candles are used. MA20/MA50, Wilder ATR14, previous-20-ATR median and 20-day high/low are reference context, not forecasts. LGD Daily is not assumed identical to XUL10.
- The user approved D1/reference use and initial index weights: 40 lot capacity, 20 layer capacity, 15 adverse distance relative to daily reference ATR, 15 volatility, 10 nearby high-impact USD events. Formulas are visible in the UI and implemented/tested in shared code.
- The index is an initial, uncalibrated heuristic for a same-direction series, not a loss probability or whole-account financial risk. Buy/sell are never netted or averaged together.
- Current initial freshness checks: symbol timestamp no older than 20 seconds; calendar source generation no older than 15 minutes; last closed daily candle no older than 4 calendar days. These are explicit conservative operating limits, not provider SLA guarantees or verified market-close calendars.
- Missing user limits, missing/stale prices, insufficient/stale candles, incomplete/stale calendars or unclear relevant USD event timing produce an unavailable aggregate index, not synthetic zero components.
- Simulation freezes base positions, settings, quote, context and assessment time. Inputs remain hypothetical; only an explicit confirmation adds a manual record. No transaction is sent or verified.
- Target and layer spacing are separate fixed preferences in raw price units. XUL10 point/contract conversion is not verified; monetary P/L, free margin, margin-call prices and automatic adaptive targets are deliberately not implemented.
- External TradingView OANDA:XAUUSD chart is display only, automatically requested when the Technical tab is active and online; other tabs and offline mode do not load it. It remains separate from calculation sources. Market/news API credentials remain server-side. Full articles are rendered as plain text.
- API logs omit payloads. Portfolio changes and simulations are calculated locally, not posted to external providers.
- Browser storage failure/corruption is reported and existing unreadable records are not silently overwritten. Local reset clears only MRG records/preferences and saved basic scenarios.
- Generated test outputs belong in `/generated-artifacts/`, excluded from Git and publishing.
- `npm run test:visual` compares deterministic MRG browser screenshots against explicitly approved baselines; keep live/vendor checks in `npm run test:ui`. See `docs/visual-regression.md` for fixtures, tolerances and baseline approval.
- The first-use introduction is brief and dismissible. Formula details can be expanded on mobile. Custom stress percentages simulate price moves only; remaining lot/layer capacity means remaining personal limits, not a safe financial buffer.
- The service worker must never cache or provide offline substitutes for live API responses. Offline positions may remain local, but unavailable live data must pause the live index.
- PWA registration is production-only, not gated by host-name substrings. Build fingerprints version the precached JS/CSS shell; install help covers Android and iPhone. `npm run test:pwa` verifies the built app in an ephemeral browser fixture, including offline reload with the HTTP cache disabled.

### Shared Code
- `shared/schema.ts`: Zod schemas for input validation and TypeScript types
- Used by both frontend form validation and backend API validation

### Design System
- Newsmaker company styling: official blue/navy and local brand assets, responsive action-first layouts for PC/tablet/mobile.
- Typography: Roboto (UI), Roboto Mono (numerical data).
- Two audiences: marketing presentations and self-guided novice education. Short on-demand term help and disclosures supplement always-visible critical warnings.
- Bilingual UI (Indonesian/English) for all risk-related content

## External Dependencies

### Database
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Location**: `shared/schema.ts`
- **Migrations**: `migrations/` directory via drizzle-kit
- **Current State**: Unused import scaffold only. Live portfolios use browser storage; do not introduce a database migration or new authentication without a separate request.

### UI Component Dependencies
- Radix UI primitives for accessible components
- class-variance-authority for component variants
- Lucide React for icons
- embla-carousel-react for carousels
- react-day-picker for date selection
- recharts for data visualization
- vaul for drawer components

### Development Tools
- Replit-specific plugins: runtime error overlay, cartographer, dev banner
- PostCSS with Tailwind and autoprefixer

### Post-merge Setup
- `script/post-merge.sh` restores dependencies from the committed npm lockfile, checks TypeScript and core tests, and rebuilds the production app/PWA shell.
- The platform then reconciles workflows. The script does not launch another server, run database migrations, or change browser-local portfolios.