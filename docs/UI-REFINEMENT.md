# Editorial and accessibility refinement

Completed 7 November 2026, continuing the interrupted interface-polish session.

## Delivered

- Editorial landing and account pages using the bundled, freely licensed IBM Plex Serif, alongside Geist for the application UI.
- Clearer reading sizes, shared spacing tokens, aligned tablet summaries, and stronger form boundaries in light and dark themes.
- Refreshed desktop and mobile product previews, explicitly labeled as synthetic data.
- Continuous, data-bound chart guidance with keyboard period exploration, pause/resume, and reduced-motion support.

## Keyboard and feedback fixes

Severity below describes the original issue; all listed issues are fixed.

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| High | `public/app.js:157` | Skip link was interpreted as an application route. | Focuses and scrolls to main content without changing the route. | WCAG 2.4.1: bypass repeated navigation. |
| High | `public/charts.js:36` | SVG focus listeners created implicit tab stops without the period controls' keyboard behavior. | Only the selected period joins the tab order; arrows, Home/End, Enter/Space, and Escape work. | WCAG 2.1.1 and 2.4.3: operable controls and meaningful focus order. |
| Medium | `public/app.js:82` | Filters and form submissions could lose focus during rendering. | Stable control identifiers restore focus; theme changes preserve unfinished form values. | WCAG 2.4.3: retain the user's place in a task. |
| Medium | `public/app.js:129`, `public/styles.css:52` | Persistent errors inherited non-interactive toast styling. | Dismiss controls accept pointer and keyboard input and return focus to the original action. | Error recovery and keyboard continuity. |
| Medium | `public/app.js:137` | Server field errors appeared only as general text. | Invalid fields receive focus, `aria-invalid`, and an associated explanation; existing hint associations survive retries. | WCAG 3.3.1 and 4.1.2: identify errors and expose state. |
| Medium | `public/app.js:147` | Keyboard focus could leave the mobile navigation overlay. | Background content is inert; Tab stays in navigation and Escape restores the opener. | WCAG 2.4.3: meaningful focus order. |

## Verification

- `npm run check`: typecheck, seven API tests, and production build passed.
- `npx playwright test`: all ten browser tests passed, including the new keyboard, validation, offline-error, and theme-draft regression cases.
- Inspected desktop, tablet, mobile, light, and dark renders. Checked overview widths of 320, 390, 768, 900, 1100, and 1440 CSS pixels without page overflow; 320px account and landing pages also fit.
- Landing and overview passed a 200% root-text-size overflow check at 1280px.
- Landing-page Lighthouse: accessibility 100, best practices 100, SEO 100. This was an automated audit, not a performance benchmark or full WCAG certification.
- Accessible names and structure checked through the browser accessibility tree and Playwright assertions. Native screen-reader speech: **Not verified**.

**Approve** for the inspected surfaces and keyboard flows.
