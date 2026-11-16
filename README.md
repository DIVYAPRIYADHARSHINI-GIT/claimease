# ClaimEase

**Claim it. Clear it.** A free, private-by-design expense claim and reimbursement **demo** for the fictional Kestrel Labs.

## Live demo

Public production domain assigned by Vercel: **https://claimease-three.vercel.app**. Deployment/live verification is in progress; this paragraph will be updated after verification. Repository: **https://github.com/DIVYAPRIYADHARSHINI-GIT/claimease**. This is not a production office service.

## Important privacy and authentication limits

- **All application data stays in this browser.** Claim details, policies, counters, audit entries, fictional accounts, password hashes, session and preferences use **localStorage**. Receipt images use **IndexedDB**, in `claimease-receipts`.
- One `ClaimStore` interface, one browser implementation. Schema version 2 has an explicit v1 migration. There is no server database, API route, analytics, AI service, key, cloud upload or third-party runtime request.
- **Demo login runs in the browser and is not secure.** PBKDF2-SHA-256 uses 120,000 iterations and a per-account random salt. Browser owners can inspect or alter local storage and bypass client code. Role guards are demonstrable application rules, not a security boundary against the device owner.
- Never enter real passwords, confidential claims, bank details or real receipts. A real office needs server-side storage, real identity, authorisation, multi-device synchronisation and managed backups.
- Payment batches **record** reimbursements; they never send money. CSV export is **not an accounting integration**.
- Vercel's free **Hobby plan is for personal, non-commercial use**. The intended deployment uses only a hosting project, with no functions or storage resources.

## Roles and fictional accounts

All accounts use the deliberately public demo password **`ClaimEase!2026`**. Open “Demo accounts” on sign-in to fill an account without copying it. This is not a real credential; do not reuse it elsewhere.

| Account | Person | Role | Department |
|---|---|---|---|
| employee@kestrel.example | Mira Vale | Employee | Engineering |
| arin@kestrel.example | Arin Moss | Employee | Engineering |
| nila@kestrel.example | Nila Brook | Employee | Operations |
| theo@kestrel.example | Theo Fern | Employee | Operations |
| isha@kestrel.example | Isha Reed | Employee | Design |
| manager@kestrel.example | Evan Wren | Manager | Engineering |
| sana@kestrel.example | Sana Elm | Manager | Design |
| finance@kestrel.example | Leah Finch | Finance | Operations |

Evan manages Engineering and Operations, and is Isha's second manager. Sana manages Design and is Mira's second manager. Managers see only employees assigned to them in either capacity. Employees see only their own claims. Finance manages policy and sees the complete local workspace. Full-browser backup/restore is Finance-only because it contains every employee's records; employees can export their own CSV/PDF.

Sign-in has show/hide, a generic credential error, a five-minute lock after five failures, eight-hour absolute expiry and fifteen-minute inactivity expiry with a one-minute warning. There is a visible, labelled Sign out control. No actual online account is created.

## Main features

- Draft, edit, delete drafts with retired claim numbers, duplicate, submit, correct returned claims and resubmit without losing history.
- Itemised expenses, tax-inclusive amounts, mileage, per diem, manually converted USD/EUR/GBP lines and client-entertainment attendees.
- Receipt upload/photo input, browser preview/zoom, under-200-KB compression and SHA-256 duplicate checking. Generated sample receipts use invented vendors only.
- Search, status/date filters, sorting, status badges, append-only activity timeline, in-app notifications and three-day manager SLA indicators.
- Manager approve/reject/return, line decisions, recalculated approved totals, self/submitter approval prevention and optional distinct second-manager approval.
- Finance review, balanced payment batches, payment references and Paid records.
- SVG dashboards, local PDF claim forms with repeated line-table headers, audit trail and receipt thumbnails; claims/lines/batches/accounting CSVs with formula-injection escaping.
- Light/dark themes, desktop sidebar, mobile tabs, keyboard-accessible dialogs, explicit empty/error/recovery states and a persistent browser-only badge.

## Policy engine

`checkClaim(claim, policy, existingClaims, today)` is pure and returns rule, severity, applicable line, message and correction guidance. The same function drives editor findings, submission, review, policy testing and exports. All money calculations use integer paise; multiplication and rounding use BigInt intermediates. INR display uses Indian digit grouping. Included tax is never added twice.

Fifteen switchable rules cover daily category limits, claim caps, monthly category caps, receipt thresholds/categories, vendor/date/amount and receipt-hash duplicates, late/future/trip dates, mileage distance/rate caps, department/grade eligibility, attendee/per-head checks, weekends/holidays and missing/inconsistent tax. Manually entered foreign rates have an Info finding. Duplicate findings do not reveal another employee's personal details.

Block findings stop submission. Warnings need an employee justification. Policy version is locked on the first submission and stays fixed through returns; Finance publishing creates a new version for new submissions. Category caps aggregate the same employee's active submissions; cancelled, rejected, draft and returned claims are excluded from historical cap totals. Duplicate checks include every existing claim, regardless of status.

## Approval flow

`Draft → Submitted → Manager approved → Finance approved → Paid`

Managers may reject or return Submitted claims; Finance may reject or return Manager-approved claims. Employees can cancel their submitted/returned claims. Rejection, return and cancellation require comments. Returned claims may be corrected and submitted again. A second-level approval holds the claim at Submitted after the first approval and requires another assigned manager. Per-line decisions lock after the first manager approval.

The application exposes no audit editing/deletion operation. Draft deletion and Finance reset retain the audit and numbering counters. This is application-level immutability, **not tamper-proof storage**: the browser owner can modify local files/storage.

## Storage, backup and recovery

- The localStorage metadata budget is shown against an approximate 5 MB guide; browser-specific quotas vary. IndexedDB capacity comes from the browser's storage estimate. A near-full warning does not guarantee more space will be available.
- JSON backups include receipts, policy history and demo password hashes, but exclude active sessions and lockouts. Keep downloaded backups private. A seven-day backup reminder appears on Privacy & backup.
- Import is limited to 30 MB and validates structure, integer amounts, IDs, policy references, receipt hashes and payment totals. A preview and explicit **safe merge** confirmation are required. Existing claim IDs/numbers are skipped, never silently overwritten; conflicting policy content or receipt IDs stop import.
- To restore into another browser: sign in as Finance, use **Start fresh**, then import the backup. Matching policies can have different creation times; their actual rules must match. An unrelated policy with the same version is not silently replaced.
- Start fresh clears visible claims/batches but preserves account/policy history, old audit entries, retired claim numbers and stored receipt evidence. Load sample data replaces visible claims with 30 fictional claims and two batches, allocating new claim numbers.
- Disabled/full/corrupted storage produces a recovery message. Corrupted metadata is not automatically reset or overwritten. A recovery download preserves the raw original. Conflicting writes from another tab are refused rather than silently overwriting them.

## Technology and setup

SvelteKit 3, Svelte 5, TypeScript, static adapter, self-hosted Inter, pdf-lib, native Web Crypto/IndexedDB/localStorage. Vite, Vitest, fast-check, Playwright and axe-core are development tools. Direct dependency versions are exact and their publication ages are recorded in `docs/verification/dependency-ages.json`.

Use Node 22.12 or newer and npm. The build was tested on the existing Mac's Node 26.13.1.

```sh
npm ci
npm run check       # fails on errors or warnings
npm test           # unit and property tests
npm run build      # static output in build/
npm run preview    # serves the real build at http://127.0.0.1:4173
```

In another terminal, using the already-installed Chrome on this Mac:

```sh
caffeinate -i node tests/browser.mjs
caffeinate -i node tests/storage.mjs
caffeinate -i node tests/extended.mjs
caffeinate -i npm run qa
```

The test helper points to `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; change that executable path on another OS. PDF screenshot verification uses the existing `pdftoppm` command. Do not rebuild while a browser test is executing. The development-only static preview server is not deployed and implements no application API.

## Verification and reports

Actual execution results are saved under `docs/verification/`; screenshots under `docs/screenshots/`. The running log is `docs/bug-report/bug-log.md`. Final Markdown/PDF bug reports and the progress report are generated only from observed failures and executed checks. Browser fixtures and downloaded backup files are not bundled into the app. Each fresh browser seeds only the fictional sample dataset.

## Deployment architecture

`vercel.json` serves `build/` and rewrites direct application URLs to the static entry. SvelteKit generates a hash-based script CSP for the bootstrap. No Vercel Blob, KV, Postgres, Neon, Supabase, Marketplace product or other storage exists in this architecture. **No environment variables are required.**

## Known limits

- Single browser, one local dataset, simulated identity; not a secure multi-user office product.
- No email, live FX service, bank transfer or accounting connection.
- Supported receipt formats: JPEG, PNG and WebP. PDFs are exported as documents, not accepted as receipt uploads.
- PDF text uses standard Latin fonts and ASCII punctuation fallbacks; complex-script text is not fully supported. Original receipt images are retained.
- Full dependency audit currently reports four low-severity development-tool advisories; the production-only audit reports zero vulnerabilities. See BUG-03 for the complete history rather than treating a clean production audit as a clean development audit.
- Deployment-workflow deviation: Vercel CLI 64.2.0 automatically created a temporary `VERCEL_OIDC_TOKEN` in `.env.local` during linking. The file was immediately deleted without displaying, copying, using or committing the value. The application requires no environment variables, and the hosting project has none configured. See BUG-25; this incident is not hidden as a storage-architecture change.
- Vercel assigned `claimease-three.vercel.app`, rather than the unsuffixed domain requested as an example. Some early setup-error screenshots were rendered later from the exact logged output; BUG-02 still needs an original platform screenshot from the user.