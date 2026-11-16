# ClaimEase delivery notes — 16 November 2026

## Public links
- Production: https://claimease-three.vercel.app
- GitHub: https://github.com/DIVYAPRIYADHARSHINI-GIT/claimease

The production domain is the one returned by the project's Domains API. It opens without a Vercel login in a fresh incognito context. The application itself uses the requested simulated demo sign-in. No Deployment Protection/account settings were changed.

## Storage and hosting
- Claim data, policies, counters, audit, demo auth and preferences: localStorage only.
- Receipt images: IndexedDB only.
- Application server routes/functions: none. PDF, CSV and JSON exports run in the browser.
- Resources created for this application: one public GitHub repository and one Vercel **Hobby hosting project** named claimease. No cloud storage, database, Marketplace product or paid feature was created.
- Configured application/project environment variables: **none**, verified by the project API returning an empty name list.
- Historical transient CLI variable: **VERCEL_OIDC_TOKEN**. Vercel CLI created an unrequested .env.local during linking; it was deleted immediately without displaying, using or committing the value. This explicit workflow deviation is BUG-25, not concealed as compliance.
- Build commands remove only obsolete host-provided npm configuration names (`npm_config_cache_dir` / `npm_config_cache-dir` and case variants) from the child command environment. They are not application variables or secrets; no values are saved.

## Verification results
- 459 unit/property/PDF-layout tests. Property runs are not misrepresented as separately named unit tests.
- Main 70-check browser journey passed in four configurations: desktop/mobile × light/dark (280 executed assertions across those four runs).
- 53 supplementary browser checks: 8 storage scenarios, 12 extended workflow/backup/second-approval checks, 32 boundary-layout checks, 1 policy-test-panel regression.
- 192 main-page screenshot/axe audits: four widths × two themes × 24 role/page contexts; zero serious/critical accessibility findings, horizontal-page overflow, sub-12px text or undersized hit targets.
- 75 public-live checks passed, then passed again after the hosting build-warning fix; zero console/page errors.
- 500-claim load/filter: 283 ms in the recorded final storage test. No performance claim is made for another device.
- Local production build/typecheck: zero errors, zero warnings. Actual remote production log: completed, zero warning/error lines after BUG-29 fix.
- Fresh incognito browser after live testing: exactly 30 claims, 8 fictional users, 2 batches, 30 receipt references and no session. Test-created claims exist only in disposable test browser contexts, never in the deployed bundle.
- All direct routes and hard refreshes were checked per role. Full CSV/PDF/JSON downloads, corrected/resubmitted claims, payment batches, line rejection and distinct second-level approval were exercised with real clicks.

## Evidence locations
Project root: `/Users/softage/Designer Projects/starter/claimease`

- Required running screenshots: `docs/screenshots/running/` — 28 images.
- Additional complete-flow screenshots: `docs/screenshots/running-desktop-dark/`, `docs/screenshots/running-mobile-light/`, `docs/screenshots/running-mobile-dark/` — 20 each. Total running evidence across these four folders: 88 images.
- Design matrix: `docs/screenshots/design-qa/` — 192 images.
- Live-site evidence: `docs/screenshots/live/` — 22 images.
- Bug originals: `docs/bug-report/screenshots/`; readable report crops: `docs/bug-report/report-images/`.
- Running bug log: `docs/bug-report/bug-log.md`.
- Final reports: `docs/bug-report/BUG_REPORT.md`, `docs/bug-report/BUG_REPORT.pdf`, `docs/PROGRESS_REPORT.md`.
- Machine-readable actual results: `docs/verification/`.

## Open items and differences from the request
1. Two tracked issues remain open: BUG-02 (Designer plan tool is unavailable in act mode; original tool UI screenshot needed from the user) and BUG-03 (four low-severity development-tool audit findings). Original BUG-03 Critical severity is retained, though original high/critical dependencies were replaced; production dependency audit is zero.
2. Vercel assigned the available suffixed domain `claimease-three.vercel.app`, not the unsuffixed example. Only the public production domain is used in delivery links.
3. The unrequested transient OIDC file described above violated the no-token-storage instruction before being removed. No application data storage rule was changed.
4. Some early setup errors were logged immediately but rendered into PNG later from exact text. Original Designer UI screenshots for platform-only failures are not available to the agent. Later browser failures were captured automatically when they occurred.
5. The app's audit is append-only through application operations, including reset/delete, but browser owners can tamper with local data. This inherent demo limitation is stated honestly; real security needs a server and real identity.
6. Full-browser JSON backup/restore is Finance-only to preserve employee/manager claim visibility. Other roles export only their accessible claims. Receipt capture is a browser camera/file input, not a custom live-camera scanner.
7. Desktop expense lines use a selectable, table-like row list with the selected line's full editor beneath it, rather than a spreadsheet where every cell edits inline. Mobile uses stacked cards. This keeps policy feedback and receipts legible.
8. Standard Latin PDF fonts are used; complex-script PDF shaping is not implemented. Extremely large individual text rows are not separately stress-tested beyond the 40-line pagination regression and normal UI length limits.
9. Real physical iOS/Android devices, Safari/Firefox and a human screen-reader session were not tested. Automated Chrome viewport, keyboard, axe and contrast checks do not replace those audits.
10. The first live receipt-preview test had a readiness timeout while its capture showed the successful thumbnail. Two complete live reruns pass with explicit scroll/decode readiness; the exact original scheduling delay was not isolated. It is logged as a real verification failure, not called a storage loss.
