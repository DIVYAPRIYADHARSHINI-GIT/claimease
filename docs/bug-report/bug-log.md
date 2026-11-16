# ClaimEase running bug log

Started during the initial preflight on 16 November 2026. Updated after executed regression checks; no fabricated failures. Original severity is retained even when residual risk is lower. All times below are UTC unless explicitly qualified. Setup/tool error text was logged when observed; some text-to-PNG evidence was rendered later, not captured from the original terminal. Original platform UI evidence for BUG-02 still needs the user. Screenshot password fields are masked; account/receipt data is fictional.

Local verification before deployment: 459 unit/property/PDF-layout tests, 70 main browser checks, 8 storage scenarios, 12 extended workflow checks, 32 boundary-viewport checks, and 184 design/axe audits passed. Build/typecheck have zero errors and zero warnings. The 184 final audits have zero serious/critical findings, overflow, sub-12px text or undersized targets. The first failed matrix and timestamped browser failures are retained alongside the final evidence.

## BUG-01 — Workspace Git preflight failed
- Date/time: 2026-11-16, initial preflight; exact seconds not recorded.
- Where: workspace root, `git status --short`.
- Steps: checked repository status before creating the project.
- Expected: determine existing Git state.
- Actual: `fatal: not a git repository (or any of the parent directories): .git`.
- Severity: Low.
- Root cause: the workspace root was not a Git repository.
- Fix: initialised an isolated repository inside claimease; sibling projects were not moved.
- Test added: repository-root regression test and `git rev-parse --show-toplevel`.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-01-before-git-preflight.png`.
- After screenshot: `screenshots/BUG-01-after-fixed.png`.

## BUG-02 — Plan editor unavailable in act mode
- Date/time: 2026-11-16, initial planning; exact seconds not recorded.
- Where: Designer `draft_plan` tool.
- Steps: attempted to record a durable checklist without leaving act mode.
- Expected: save the plan and continue implementation.
- Actual: `Tool draft_plan is unavailable in act mode.`
- Severity: Low.
- Root cause: platform mode restriction, not application code.
- Fix: project checklist in docs/IMPLEMENTATION.md is the workaround; the tool restriction is not fixed.
- Test added: checklist-exists regression.
- Status: Open.
- Before screenshot: `screenshots/BUG-02-before-platform-message.png` is an exact message transcription; screenshot needed from the user for the original Designer UI.
- After screenshot: None — platform issue remains open.

## BUG-03 — Initial pinned toolchain has known dependency vulnerabilities
- Date/time: 2026-11-16T04:42:42Z.
- Where: initial npm install and `npm audit --json`.
- Steps: installed older pinned releases and audited before exposing a server.
- Expected: supported dependencies without known advisories.
- Actual: `11 vulnerabilities (4 low, 3 moderate, 2 high, 2 critical)`.
- Severity: Critical.
- Root cause: the initial tool versions predated security fixes.
- Fix: upgraded to compatible patched releases whose publication dates were verified at least 14 days old. All original high/critical findings are gone. Four low-severity development-tool findings remain, including the deepmerge advisory propagated through the Svelte toolchain. The production-only audit is zero. No arbitrary downgrade or newer-than-14-days release was used to hide the audit.
- Test added: exact-version/age checker, clean install and production/full dependency audits.
- Status: Open.
- Before screenshot: `screenshots/BUG-03-before-dependency-audit.png`.
- After screenshot: `screenshots/BUG-03-after-current-audit.png` shows the current residual findings, not a claimed full fix.

## BUG-04 — Major toolchain upgrade conflicts with old installed dependency tree
- Date/time: 2026-11-16T04:43:37Z.
- Where: `npm install --ignore-scripts`.
- Steps: upgraded SvelteKit/adapter over the earlier installed tree.
- Expected: resolve the coordinated new peer versions.
- Actual: `npm error code ERESOLVE`; `Found: @sveltejs/adapter-static@3.0.10`; `Conflicting peer dependency: @sveltejs/kit@3.1.0`.
- Severity: Medium.
- Root cause: npm reconciled the old lockfile/tree against the major upgrade.
- Fix: removed only this project's generated dependency tree/lockfile and resolved cleanly, without force or legacy-peer-deps.
- Test added: subsequent clean `npm ci --ignore-scripts`, build and complete test suite.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-04-before-install-conflict.png`.
- After screenshot: `screenshots/BUG-04-after-fixed.png`.

## BUG-05 — SvelteKit 3 rejects legacy configuration file
- Date/time: 2026-11-16T04:50:27Z.
- Where: first framework check.
- Steps: ran `npm run check` after the framework upgrade.
- Expected: generate route types and check source.
- Actual: `config_file_unsupported`; `svelte.config.js is no longer used. Please pass configuration via the sveltekit(...) plugin in your Vite config.` Full exact output: BUG-05-check-error.txt.
- Severity: High.
- Root cause: SvelteKit 2 configuration layout remained after upgrading to 3.
- Fix: moved preprocess/static adapter configuration into the Vite plugin and removed the old file.
- Test added: configuration regression, strict check and production build.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-05-before-typecheck.png`.
- After screenshot: `screenshots/BUG-05-after-fixed.png`.

## BUG-06 — Invalid optional rest-route syntax
- Date/time: 2026-11-16T04:51:05Z, captured at the end of the check.
- Where: route manifest generation.
- Steps: generated the catch-all application route.
- Expected: one route handles root and application paths.
- Actual: `route_optional_rest`; `Invalid route /[[...path]] — a rest route segment is always optional, remove the outer square brackets`.
- Severity: High.
- Root cause: unnecessary optional brackets around a rest segment.
- Fix: changed the route to `[...path]` and removed the invalid source directory.
- Test added: route-tree regression plus direct URL/hard-refresh browser checks for every role.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-06-before-type-errors.png` (original captured filename retained).
- After screenshot: `screenshots/BUG-06-after-fixed.png`.

## BUG-07 — Source move patch did not rename the route
- Date/time: 2026-11-16T04:52:38Z.
- Where: source-edit Move operation, then directory removal/typecheck.
- Steps: requested a move; tool reported applied; attempted to remove the assumed empty source directory.
- Expected: target path exists and source is gone.
- Actual: `rmdir: src/routes/[[...path]]: Directory not empty`; file discovery still showed the original file, and BUG-06 repeated.
- Severity: Medium.
- Root cause: the no-effective-content-change move patch did not perform the rename.
- Fix: explicitly created the target and deleted the version-checked source, then removed the empty directory.
- Test added: route-tree and successful manifest/build checks.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-07-before-route-move.png`; repeated diagnostic also in BUG-07-before-type-errors.png.
- After screenshot: `screenshots/BUG-07-after-fixed.png`.

## BUG-08 — TypeScript config extends a removed generated file
- Date/time: 2026-11-16T04:53:33Z.
- Where: `npm run check`.
- Steps: checked source after configuration/route fixes.
- Expected: use the current framework TypeScript base.
- Actual: `tsconfig_extends_missing`; `Cannot read file '/Users/softage/Designer Projects/starter/claimease/.svelte-kit/tsconfig.json'.`
- Severity: High.
- Root cause: another SvelteKit 2 convention remained.
- Fix: extended `$app/tsconfig` and explicitly included source and tests.
- Test added: base-config regression and strict check.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-08-before-diagnostics.png`.
- After screenshot: `screenshots/BUG-08-after-fixed.png`.

## BUG-09 — Strict typing errors in first application check
- Date/time: 2026-11-16T04:54:11Z.
- Where: full Svelte/TypeScript check.
- Steps: checked all application source after framework configuration was corrected.
- Expected: zero errors.
- Actual: `svelte-check found 12 errors and 0 warnings in 3 files`; errors included `Type 'undefined' is not assignable to type 'number'`, `'p' is of type 'unknown'`, and the untyped font side-effect import. Full output: BUG-09-check-error.txt.
- Severity: High.
- Root cause: inferred required tax type, a throwing arrow helper that did not narrow unknown inputs, and a duplicate/untyped font script import.
- Fix: explicitly typed sample lines, used a never-returning function declaration and retained the CSS-only font import.
- Test added: strict source/test check and malformed-backup tests.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-09-before-source-diagnostics.png`.
- After screenshot: `screenshots/BUG-09-after-fixed.png`.

## BUG-10 — Three property tests returned assertion objects instead of void
- Date/time: 2026-11-16T04:54:52Z.
- Where: initial 446-case unit run.
- Steps: ran money properties against the independent BigInt oracle.
- Expected: correct zero and random inputs pass.
- Actual: `Property failed after 1 tests`; `Counterexample: [0,0,1]`; `Property failed by returning false`. Related minimal cases were `[[]]` and `[0]`.
- Severity: Medium.
- Root cause: concise callbacks returned Vitest 5 assertion objects rather than true/undefined; no arithmetic mismatch was demonstrated.
- Fix: used block callbacks that assert and return void.
- Test added: retained all three money properties with 1,300 generated cases and boundary tests.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-10-before-property-excerpt.png`. BUG-10-unit-error.txt is privacy-sanitised: credential-shaped fixture values and unrelated passing password examples are omitted, not the failures.
- After screenshot: `screenshots/BUG-10-after-fixed.png`.

## BUG-11 — Full-browser backup methods lacked a Finance role check
- Date/time: 2026-11-16T04:54:52Z.
- Where: ClaimStore permission tests.
- Steps: called full backup/export and import as Employee.
- Expected: reject access to the browser-wide dataset.
- Actual: export promise resolved instead of rejecting; import returned `Imported 0 claims. Skipped 1 existing claim identifiers; no existing claim or audit entry was overwritten.`
- Severity: Critical.
- Root cause: UI hid the controls but the store only checked authentication.
- Fix: checked Finance role before reading, exporting or importing full-browser data.
- Test added: Employee backup/import rejection and own-claim projection tests.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-11-before-backup-permission.png`.
- After screenshot: `screenshots/BUG-11-after-fixed.png`.

## BUG-12 — Production bundler rejects the legacy library alias
- Date/time: 2026-11-16T04:55:54Z.
- Where: first production bundle after 446 unit tests passed.
- Steps: ran the production build.
- Expected: compile the static site.
- Actual: `Build failed with 2 errors`; `module_removed_lib`; `$lib has been removed. Use #lib instead`. An initial compatibility-alias fix then produced `config_option_deprecated_alias` and `tsconfig_invalid` warnings.
- Severity: High.
- Root cause: TypeScript knew an alias that SvelteKit 3 no longer supplied automatically.
- Fix: used simple relative source imports and removed the deprecated alias/paths workaround.
- Test added: no-deprecated-alias regression, warning-failing typecheck and production build.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-12-before-build.png`; follow-up warnings in BUG-12-before-alias-warnings.png.
- After screenshot: `screenshots/BUG-12-after-fixed.png`.

## BUG-13 — Fresh login immediately redirects back to sign-in
- Date/time: 2026-11-16T04:57:27Z, screenshot review.
- Where: production sign-in → Employee overview.
- Steps: signed in and reviewed the saved home screenshot.
- Expected: remain on the authenticated overview.
- Actual: returned to sign-in with the session-expiry message. The first smoke helper falsely passed because it waited for any h1; screenshot review caught the wrong screen.
- Severity: High.
- Root cause: a cached five-second clock preceded the newly created session and triggered the future-session guard.
- Fix: use current time whenever the guard reevaluates, while keeping the periodic expiry tick.
- Test added: authenticated Sign out control and exact Employee-home heading are required after login; session expiry checks retained.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-13-before-login-redirect.png`.
- After screenshot: `screenshots/BUG-13-after-fixed.png`.

## BUG-14 — Rebuilding beneath Vite preview crashes its cached asset stream
- Date/time: 2026-11-16T04:58:29Z; browser failure captured at 04:58:36Z.
- Where: local production preview.
- Steps: rebuilt while Vite preview still held the previous manifest, then opened Chrome.
- Expected: serve the new bundle.
- Actual: unhandled `Error: ENOENT: no such file or directory` for `_app/immutable/entry/app.D_ul3vVV.js`; preview exited and smoke timed out. Exact full output: BUG-14-preview-error.txt.
- Severity: High.
- Root cause: cached manifest referenced files removed by rebuild.
- Fix: serve the real build directory with a development-only static server using Vercel-equivalent routes/headers, without cached manifests; run tests after builds finish.
- Test added: production smoke and all subsequent browser suites.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-14-before-preview-error.png`; actual blank browser capture retained in failure-2026-11-16T04-58-36-062Z.png.
- After screenshot: `screenshots/BUG-14-after-fixed.png`.

## BUG-15 — Production CSP blocks SvelteKit's bootstrap script
- Date/time: 2026-11-16T04:59:56Z; console diagnosis at approximately 05:00Z.
- Where: static production server with hosting security headers.
- Steps: opened the static site after replacing preview.
- Expected: render sign-in with no console errors.
- Actual: `Executing inline script violates the following Content Security Policy directive 'script-src 'self''.` Bootstrap was blocked and the document body stayed empty.
- Severity: Critical.
- Root cause: handwritten script CSP omitted the generated bootstrap hash; the earlier Vite preview had not applied hosting headers.
- Fix: SvelteKit emits a hash-based script CSP in static HTML; hosting headers retain the other directives without a conflicting script/default directive. Arbitrary inline scripts are not enabled.
- Test added: production-header smoke, CSP regression and console checks on all routes/roles.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-15-before-csp-error.png`; actual blank browser capture retained in failure-2026-11-16T04-59-56-796Z.png.
- After screenshot: `screenshots/BUG-15-after-fixed.png`.

## BUG-16 — Browser claim-count assertion ran before client hydration
- Date/time: 2026-11-16T05:02:28Z; recurrence during the 05:05 full-flow run.
- Where: claims list assertion and later dark-theme reload assertion.
- Steps: read DOM values immediately after navigation/reload.
- Expected: wait for browser storage hydration, then assert six claims or the dark theme.
- Actual: `0 !== 6`; later `null !== 'dark'`. Both were captured automatically in timestamped failure screenshots/JSON.
- Severity: Medium.
- Root cause: navigation completion precedes SPA hydration; locator count/getAttribute do not wait.
- Fix: wait for the first row/authenticated shell and expected heading before assertions and running captures.
- Test added: exact own-claim count, other-employee exclusion, stable theme reload and readiness checks.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-16-before-assertion.png`.
- After screenshot: `screenshots/BUG-16-after-fixed.png`.

## BUG-17 — Dense UI metadata was smaller than the requested 12px floor
- Date/time: 2026-11-16T05:03Z, screenshot review and subsequent matrix runs.
- Where: metadata, badges, sidebar, helper text and mobile table cells.
- Steps: reviewed actual screenshots, then measured all text in 184 scenarios.
- Expected: no visible metadata below the requested 12px floor.
- Actual: initial 8–11px styles; two follow-up runs found missed mobile panel/notification/employee-name selectors before the final fix.
- Severity: Medium.
- Root cause: overly compact styling and more-specific mobile overrides.
- Fix: consistent metadata floor, corrected remaining mobile selectors and enlarged linked text areas.
- Test added: all 184 scenarios measure visible text size and page overflow; final count below 12px is zero.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-17-before-small-type.png`; failed matrix images/JSON retained.
- After screenshot: `screenshots/BUG-17-after-fixed.png`.

## BUG-18 — Payment batch saved, but the visible queue and batch list stayed stale
- Date/time: 2026-11-16T05:03:41Z; diagnosis shortly afterwards.
- Where: Finance payment batches.
- Steps: selected an approved claim, entered a reference and confirmed payment.
- Expected: remove paid claim from ready queue and display the new batch immediately.
- Actual: form cleared but old list remained; exact diagnostic `{"stored":3,"visible":2}`. The browser test timed out on the new payment reference.
- Severity: High.
- Root cause: legacy reactive declarations captured an imported runes-store snapshot once.
- Fix: explicit Svelte 5 state/derived declarations in Batches and related claim-list/backup/settings screens.
- Test added: actual batch reference must appear immediately, followed by Paid-status and balanced-total checks. Repeat payment is independently blocked in the store.
- Status: Fixed.
- Before screenshot: `screenshots/failure-2026-11-16T05-03-41-773Z.png`.
- After screenshot: `screenshots/BUG-18-after-fixed.png`.

## BUG-19 — PDF receipt heading contains a replacement question mark
- Date/time: 2026-11-16T05:09Z, actual PDF inspection.
- Where: downloaded claim PDF, receipt page.
- Steps: opened the PDF and inspected its receipt page.
- Expected: clean receipt heading and visible thumbnail.
- Actual: `Receipt ? juniper-receipt.png`; image was visible.
- Severity: Low.
- Root cause: the ASCII normaliser replaced its own middle-dot separator.
- Fix: explicitly normalise middle dots, bullets and typographic quotes to supported punctuation.
- Test added: punctuation regression and actual PDF re-open; long-PDF test also verifies repeated headers and intact rows.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-19-before-pdf-heading.png`.
- After screenshot: `screenshots/BUG-19-after-fixed.png`.

## BUG-20 — Password toggle and policy controls miss the 44px touch target
- Date/time: 2026-11-16T05:09Z, first design matrix.
- Where: sign-in and Finance policy settings, both themes/all widths.
- Steps: measured visible controls and clickable labels.
- Expected: at least 44px targets.
- Actual: 42×42px password toggle; 20×20px checkboxes without larger labels; eligibility summaries just under 44px.
- Severity: Medium.
- Root cause: inner-button sizing, absent label hit areas and fractional line-height rounding.
- Fix: 44px toggle, 44px clickable labels and explicit summary minimum height.
- Test added: all 184 viewport/theme audits check these hit areas; final undersized-target count is zero.
- Status: Fixed.
- Before screenshot: `screenshots/QA-before-finance-policy-light-1440.png`; sign-in evidence also retained in QA-before-signin-light-1440.png.
- After screenshot: `screenshots/BUG-20-after-fixed.png`.

## BUG-21 — Mobile payment table cannot receive keyboard focus
- Date/time: 2026-11-16T05:09Z, first axe matrix.
- Where: Finance batches at 390px in both themes.
- Steps: audited the horizontally scrollable recorded-batches table.
- Expected: keyboard focus and arrow-key scrolling.
- Actual: serious axe rule `scrollable-region-focusable`: `Element should have focusable content / Element should be focusable`.
- Severity: High.
- Root cause: overflow region had no focusable descendants or tabindex.
- Fix: labelled region, tabindex=0 and visible focus outline. Svelte's generic noninteractive-tabindex lint warning was captured, then narrowly annotated with the keyboard-scroll justification; actual axe/keyboard tests remain enforced, not disabled.
- Test added: real ArrowRight scrolling, focus assertion and all 184 axe audits; final serious/critical count is zero. Check command fails on other compiler warnings.
- Status: Fixed.
- Before screenshot: `screenshots/QA-before-finance-batches-light-390.png`; compiler follow-up in BUG-21-before-compiler-warning.png.
- After screenshot: `screenshots/BUG-21-after-fixed.png`.

## BUG-22 — Identical policies from another browser were treated as conflicts
- Date/time: 2026-11-16T05:12:54Z.
- Where: cross-browser backup regression.
- Steps: imported matching policy rules with a different creation timestamp.
- Expected: safe merge without overwriting data.
- Actual: `Policy v1 conflicts with this browser. Import into an empty browser instead; nothing was overwritten.`
- Severity: High.
- Root cause: comparison included creation metadata; Start fresh also unnecessarily consumed a policy version, and deterministic receipt IDs could collide across profiles.
- Fix: canonical comparison of version/content excluding creation time, unchanged policy history on Start fresh, unique sample-receipt IDs. Real policy-content conflicts still stop import.
- Test added: equivalent-policy import plus actual two-profile restore of claims, batches and receipt images.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-22-23-before-backup-tests.png`.
- After screenshot: `screenshots/BUG-22-after-fixed.png`.

## BUG-23 — Backup validator accepted inconsistent batch totals and malformed auth metadata
- Date/time: 2026-11-16T05:12:54Z.
- Where: malformed saved-data/backup regressions.
- Steps: validated a batch total of 1 paise against a 10,000-paise claim, then null lock metadata.
- Expected: reject both before loading/importing.
- Actual: both tests reported `AssertionError: expected [Function] to throw an error`.
- Severity: High.
- Root cause: validator checked amount type but not batch sum and omitted auth metadata shape.
- Fix: validate locks/sessions, counters, safe aggregate money, exact batch sums and duplicate payment assignments.
- Test added: both malformed-state cases and tampered receipt restore regression.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-22-23-before-backup-tests.png`.
- After screenshot: `screenshots/BUG-23-after-fixed.png`.

## BUG-24 — Storage runner counted a timing metric as an additional test
- Date/time: 2026-11-16T05:15Z, report review.
- Where: storage runner/result JSON.
- Steps: reviewed the reported nine passed entries before final totals.
- Expected: eight completed scenarios, timing reported separately.
- Actual: the 500-claim elapsed-time string was in the pass array, inflating eight to nine.
- Severity: Low.
- Root cause: metrics and completed-test names shared an array.
- Fix: separate metrics object; count only completed scenarios.
- Test added: rerun and review the eight-scenario result with independent timing field.
- Status: Fixed.
- Before screenshot: `screenshots/BUG-24-before-count.png`.
- After screenshot: `screenshots/BUG-24-after-fixed.png`.
