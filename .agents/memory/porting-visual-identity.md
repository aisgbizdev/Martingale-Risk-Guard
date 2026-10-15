---
name: Porting visual identity
description: Avoid accidental typography changes when copying an existing app into artifact scaffolds.
---

Preserve the app's active CSS font declarations when migration helpers infer a font from HTML metadata.

**Why:** An HTML font link can include decorative fonts unrelated to the main UI. A copy helper selected such a font even though MRG's CSS defined its actual typography.

**How to apply:** For structural ports, check copied theme CSS against the original and compare with the existing approved visual baselines. Do not regenerate baselines to accept a migration-induced change.
