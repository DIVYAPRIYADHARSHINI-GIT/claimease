# ClaimEase design QA — 16 November 2026

## Executed matrix

192 full-page screenshots and automated audits: 24 role/page contexts × light/dark × 1440/1024/768/390 px. This includes sign-in; Employee overview/list/editor/returned claim/privacy/notifications/about; Manager inbox/dashboard/approval/privacy/notifications/about; Finance queue/batches/dashboard/review/foreign-currency review/policy/settings/privacy/notifications/about. A further 32 boundary checks covered 360px and 1920px without horizontal page overflow.

The final matrix reports **zero serious/critical axe violations, zero horizontal-page overflow, zero visible text below 12px and zero undersized interactive hit areas**. See `verification/design-qa-results.json` for each individual result. Browser console/page errors were monitored throughout; none were recorded in the final matrix.

## Actual review

All 23 original contact sheets under `screenshots/review/` were opened in Designer and reviewed, covering 184 screenshots. The eight additional foreign-currency review screenshots were opened individually at every width/theme. Sign-in, the employee overview, Block claim form, receipt dialog, payment-batch failure, and the actual downloaded claim PDF were also inspected individually. The review checked hierarchy, alignment, spacing, money-column alignment, responsive wrapping, status icons/text, theme consistency and overflow. Fixed bottom navigation/sticky totals intentionally remain at the original viewport edge in full-page captures; page padding allows the final content to scroll clear of them. The full 70-check reimbursement journey was repeated on desktop/mobile in both themes, not just screenshotted.

Findings and fixes are preserved rather than hidden:
- BUG-17: initial metadata below 12px, including several mobile selectors missed in the first fix; all now pass the floor check.
- BUG-20: 42px password toggle, small unlabelled policy checkbox hit areas and fractional-height summary controls; corrected to 44px targets/labels.
- BUG-21: mobile payment table lacked keyboard focus; now a labelled, focusable scrolling region, verified by actual arrow-key scrolling and axe.
- BUG-13 and BUG-18: visual review and real-click tests exposed an immediate login redirect and stale payment-batch UI; corrected and regression-tested.
- BUG-19: a PDF separator became a question mark; corrected and the actual PDF reopened.

The first matrix's failures remain in `bug-report/first-design-qa-results.json` and `bug-report/screenshots/QA-before-*.png`. These should not be mistaken for the final result. No gradient, third-party illustration or real receipt image is used.

## Scope limits

Automation used the installed desktop Google Chrome with responsive viewports, not physical iOS/Android hardware. axe and contrast checks support accessibility verification but do not replace a human screen-reader audit. Inter is served from the same origin. The claim PDF uses standard Latin fonts; complex-script PDF shaping is not implemented.