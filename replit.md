# Martingale Risk Guard · Newsmaker

MRG is an educational risk and market-context application, with manually recorded positions. It does not execute broker orders.

## Preservation rules

- Structural changes must preserve the existing UI, Newsmaker branding, routes, portfolio/study storage keys and schema, panel Back/Forward behavior, snapshot freshness guards, calibration warnings, and API/feed semantics.
- Portfolios and study records remain browser-local. Never clear browser storage or introduce database/authentication migrations without a separate request.
- Keep the root path `/`. Changing an origin does not transfer browser-local records; disclose the consequences before any intentional origin change. No implied cross-device transfer.
- TradingView displays charts; the separate feed supplies XUL10 prices; LGD Daily supplies gold-reference history. These are distinct data sources.
- Keep secrets server-side. Do not publish or change public domains during structural migration.
- Native Android/iPhone installation, swipe/Back, and standalone behavior remain unverified until checked on physical devices.

## Workspace

- `artifacts/mrg/`: existing frontend, at `/`.
- Approved simple simulator is the main page `/`, with `/basic` retained as an alias. Optional live/position index overview remains at `/live`; `/positions` and `/analysis` retain their workflows.
- `artifacts/api-server/`: existing API, at `/api`, plus `/sw.js` to retain the worker's revalidation header.
- `lib/mrg-shared/`: unchanged legacy risk schemas and calculations, with Zod 3. It has no database connection side effects.
- `lib/api-spec/`: documented API contract; generated clients remain available. MRG retains its existing custom fetch/query layer to preserve freshness, cancellation, retry, and error semantics.
- `lib/db/`: pre-existing scaffold only. MRG does not require a database push.
- `scripts/src/`: browser, visual, offline, upgrade, and build-fixture tests.
- `test/visual/`: original reviewed screenshots and deterministic fonts.
- `docs/legacy-project-context.md`: pre-migration product context; paths and npm commands in that historical document are superseded here.
- `.migration-backup/`: local ignored source backup, not an app or a migration fixture.

## Run and verify

Use the managed workflows `artifacts/mrg: web` and `artifacts/api-server: API Server`; they supply ports and base paths. Do not run a root-level `pnpm dev`.

- `pnpm test`: risk, portfolio, timestamps, and provider normalization tests.
- `pnpm run test:ui`: full interaction and live integration checks against the running preview, using isolated synthetic browser records.
- `pnpm run test:visual`: builds an isolated production fixture and compares against existing approved baselines.
- `pnpm run test:visual:unit`: comparison/approval safeguards.
- `pnpm run test:production && pnpm run test:pwa`: isolated production/offline checks.
- `pnpm run test:pwa-upgrade`: historical-to-current warm-cache upgrade, interrupted install, exact storage preservation, API-failure and cache-ownership checks.
- `pnpm --filter @workspace/api-spec run codegen`: regenerate API clients.

The service-worker cache is fingerprinted atomically on every frontend build, including worker-only, manifest-only, and stable-URL icon changes. API responses must not enter offline caches. Keep `generated-artifacts/` excluded from Git and deployments. Tests use desktop Chromium and emulated sizes, not physical phone verification.

Post-merge setup installs the frozen pnpm lockfile and runs core tests. Managed workflows rebuild services; setup must not migrate a database or launch duplicate servers.
