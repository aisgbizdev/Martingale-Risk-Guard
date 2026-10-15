---
name: Dependency setup constraints
description: Compatibility decisions when resolving dependency security blocks during import setup.
---

Keep the imported Express major version during setup; use a patched transitive dependency when updating the same-major parent still retains a blocked lockfile version.

**Why:** The imported dependency installation was blocked by the package security policy. A same-major parent update alone still selected the blocked transitive release; changing the framework major would unnecessarily expand setup scope.

**How to apply:** Preserve the security firewall and existing app behavior. Check available patched releases before replacing frameworks or restructuring the project.
