# MRG visual regression

## Routine checks

```sh
npm ci
npm run test:visual:unit
npm run test:visual
# With the normal application workflow running, separately:
npm run test:ui
```

`test:visual` builds the current app and serves **only its static shell** on an ephemeral local port. Browser requests for prices, calendar, news and articles are intercepted with committed fixtures. The basic result uses the real `calculateRisk` function with fixed input; it is not a made-up result. No Newsmaker credentials, existing browser profile, user records or real market API are accessed.

Each scenario/viewport starts in a fresh browser context with its own local portfolio. The browser Date is fixed at 14 October 2026, 19:00 Jakarta; timers remain functional. Service workers are blocked. Locale is `id-ID`, timezone `Asia/Jakarta`, pixel ratio 1 and colour profile sRGB. The app's three font families/weights are served from pinned Google Fonts test resources rather than a changing external network. The broad, unused Google Fonts preload receives that same family subset. These fonts are test-only, not a replacement for production typography.

The baseline approval records Chromium's exact version, OS/architecture, font-content hash, fixture hash and tolerances. An environment mismatch **fails**, rather than pretending the design regressed or silently changing the baseline. Use the same Chromium version as `test/visual/baselines/approval.json`; `MRG_CHROMIUM=/absolute/path/to/chromium` selects it if needed.

## Coverage and acceptance

390×844, 768×1024, 1024×768 and 1440×900 cover:

- empty, buy-only, sell-only, both sides, many positions and expanded details;
- populated/empty overview and expanded context/method;
- position entry, limits and active simulation with before/after results;
- long news titles and article, calendar, expanded active filters and no matches;
- basic simulator/result, literacy, privacy, terms and stale-price warning.

Full-page PNG comparisons cover content below the fold, not just the first screen. Scrollable panels have five overlapping top-to-bottom viewport captures; the test fails if they would leave a gap. No warning, control or app content is masked or hidden. Test-only CSS disables animation/transitions and smooth scrolling; screenshot capture hides the text caret only. Reduced motion is requested. Each capture must settle to two identical consecutive images; an unstable fixture fails rather than receiving a wider tolerance.

Pixelmatch ignores antialiasing and colour distances below 0.1. A comparison passes only if dimensions are identical, changed pixels are ≤80 **and** their ratio is ≤0.01%. Both limits apply, so a tall page does not excuse a missing button. The tolerance is intentionally tight because data, fonts and time are fixed.

Dynamic vendor chart pixels are outside this deterministic suite. `script/test-live-ui.mjs` separately verifies real endpoint freshness, the chart's origin/symbol, failure/offline handling, interactions, panel history and readable card/control geometry. Run both suites; passing screenshots alone do not prove correct behaviour.

## Failure evidence

`generated-artifacts/visual/latest/index.html` is a local report linking actual / approved / red pixel diff PNGs for every capture. `report.json` includes pixel counts, ratio, dimensions, capture hashes, environment and errors. Failures return a nonzero exit status, including missing baselines, changed approval hashes, unexpected resources, browser exceptions and overflowing fixtures.

All reports, candidates and diffs are ignored by Git and deployment. Committed baselines and font resources are test fixtures under `test/visual/`, excluded from deployment. Do not place outputs in public assets.

To prove the detector works without editing production code:

```sh
node --import tsx script/test-live-visual.mjs --prove-regression
```

This test-only injection narrows position action buttons and changes the visible risk-warning style at all four widths. It **must exit nonzero** with pixel diffs under `generated-artifacts/visual/regression-proof/`. It cannot create/approve candidate baselines.

## Deliberate design changes: explicit approval, never auto-update

1. Run normal comparison first. Review the failing actual/baseline/diff images, including warnings and controls. Confirm the change is intentional, not a fixture problem or an accidental regression.
2. Generate a separate complete candidate: `npm run test:visual:candidate`. This never modifies approved baselines.
3. Inspect `generated-artifacts/visual/candidate/index.html` at **all four widths** and all scroll positions. Do not approve incomplete captures or hide warnings to make them pass.
4. An authorized reviewer explicitly approves with their identity and design reason:
   ```sh
   npm run test:visual:approve -- --reviewer "Reviewer name" --reason "Approved intentional design change"
   ```
   Approval rejects partial/error runs and candidates edited after capture. It writes the baseline PNGs and a hash manifest with reviewer, reason and timestamp. Candidate hashes are integrity checks, **not evidence of human approval**; the person running approval is responsible for reviewing them.
5. Commit baseline images and `approval.json` in the same change. Include the approval reason in the change summary. Re-run `npm run test:visual` before merging. Never run approval automatically in CI or as a remedy for an unexplained failure.

The first baseline is an engineering-reviewed capture of the previously accepted Newsmaker layout, not a claim of a new user/device approval. Future intentional redesigns use the process above.

These are **desktop Chromium browser tests with emulated viewports**, not native Android/iPhone, installed-PWA or physical-device verification.
