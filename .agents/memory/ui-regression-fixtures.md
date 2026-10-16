---
name: UI regression fixture contracts
description: Avoid expensive browser reruns caused by ambiguous fixture expectations rather than application defects.
---

Validate fixture shape and distinguish entry rows from summary levels before running the browser regression matrix.

**Why:** Early harness assertions confused the scenario table's summary rows with layers, and incomplete price expectations then masked later UI checks. These were test-contract problems, not evidence that the calculator's numbers were wrong.

**How to apply:** Use semantic entry selectors, supply every expected entry before summary values, and preflight expectation completeness cheaply. Preserve the distinction between passing browser assertions, checks stopped by the harness, and fixes confirmed only by static/screenshot evidence. Do not call a partially completed matrix a clean full pass.
