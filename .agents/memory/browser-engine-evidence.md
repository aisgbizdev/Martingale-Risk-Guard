---
name: Browser evidence and runtime ABI
description: Bound cross-browser claims to actual engines and avoid repeating incompatible WebKit runtime setup.
---

Report Firefox, Playwright WebKit and native Apple Safari as separate evidence. A successful browser download or phone-sized viewport does not establish engine or physical-device compatibility.

**Why:** In this Linux workspace, Firefox became runnable with GTK/X11/audio dependencies, but the Ubuntu-targeted Playwright WebKit binary still required a larger set of ABI-specific libraries after several setup attempts. Installing generic/newer Nix libraries is not a reliable fix for versioned shared-library requirements.

**How to apply:** Check actual initialization and version before spending on a browser matrix. If WebKit remains unavailable after targeted setup, preserve a nonzero/unavailable result and use a genuinely compatible runtime rather than iterating through arbitrary packages, forcing SONAME symlinks, spoofing user-agents or falling back silently to Chromium. Native Safari evidence requires an actual Apple/Safari environment. Recheck current availability rather than treating this historical outcome as permanent.

The package installer rejected some version/output attributes needed for further ABI-specific setup. Do not assume an attribute available in upstream Nixpkgs is exposed by the workspace's package index. After bounded setup attempts, keep the compatibility task open and arrange an appropriate test environment; working Firefox plus an unavailable WebKit report is not completion of a Safari/WebKit verification requirement.
