# Implementation checklist

- Browser-only ClaimStore, integer-paise calculations, policy engine, demo authentication and guarded approval state machine.
- Role-specific screens, claim editor, receipt compression, immutable application audit, batches, browser PDF/CSV and explicit backup merge.
- Unit/property tests; production-browser journey; storage errors; console checks; 500-claim responsiveness.
- Running evidence and full responsive/theme screenshot matrix; axe-core audits; numbered defect log with regression checks.
- Authenticated GitHub and Vercel Hobby deployment only after local verification; production-domain tests.
- Final README, progress report and readable Markdown/PDF bug report, with any unmet requirements stated explicitly.

No external data service, server route or environment variable is planned. Client-side role restrictions are demo UX, not a security boundary against the browser owner.