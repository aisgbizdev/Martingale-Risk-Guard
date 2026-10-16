---
name: AI evidence validation
description: Why news classifiers select server-owned text passages rather than generate quotations.
---

AI news readers should select identified passages from the supplied full text; the server supplies the exact quotation from that selection.

**Why:** In a real Newsmaker trial, generated quotations differed slightly from the original body, causing otherwise usable batch assessments to fail exact evidence validation. Weakening quote matching would hide unsupported evidence.

**How to apply:** Keep complete text coverage and content-hash checks; let AI select a passage, not rewrite it. Exact quotation proves provenance, not correctness of the interpretation. Keep abstention and failure explicit.
