# Finance Workspace design system

## Direction

The approved reference direction is a compact financial workbench. Default navigation is a full sidebar with balances, cash flow, and a category ledger sharing a single analysis region. Tables carry the detailed work. The alternative exploration remains under `design-previews/`.

## Visual tokens

- Typeface: self-hosted **Geist Variable**, with tabular numerals. Local IBM Plex Sans is the fallback. Public landing and account-page headings use the bundled, freely licensed **IBM Plex Serif** at weight 500.
- Light: white canvas, near-black green-neutral ink `#202923`, muted ink `#606d64`, fine rules `#dde4df`.
- Dark: canvas `#171b18`, ink `#edf1ed`, muted ink `#abb5ad`, rules `#36423a`.
- Form boundaries: `#7f8c82` in light mode, `#7d8d81` in dark mode. Focus, selection, and caret colors follow the primary-control palette.
- Primary control: dark green in light mode, light neutral in dark mode.
- Positive/negative values: green and muted red, also communicated through text and signs.
- Controls: 5–7 px corners; tables and related analysis sections are flat and divided with rules.
- Layout: 208 px desktop sidebar, 32 px main gutters, max-width analysis container; mobile collapses navigation into a dismissible panel.

## Type and hierarchy

App page titles are 28 px; section headings 15–16 px; table text 12–13 px. The body/caption scale uses rem units, with a 16 px root at the default browser setting. Summary amounts scale from 18–34 px to fit their layout. Exact INR amounts use Indian grouping and two decimals. Compact chart readings expose exact values in titles/tooltips.

The public landing page pairs an editorial serif heading with a concise introduction and direct demo action. A desktop workspace screenshot and mobile cash-flow detail show the real product with explicitly synthetic data. Shared spacing tokens use 4, 8, 12, 16, 24, 32, and 48 px steps.

## Interaction rules

All controls have visible focus. Dialogs carry an accessible title, close on Escape, and return focus when their opener remains present. Mobile input text is at least 16 px. Tables scroll internally where required instead of widening the viewport.

Route changes move focus to the new heading; the initial page load retains the normal document starting point. Filters and record saves preserve focus across refreshes. Mobile navigation contains keyboard focus and closes on Escape. Theme changes retain unfinished form values. The skip link focuses main content without changing the application route.

Validation errors identify and focus the affected field when the API supplies a field path; general form errors receive focus instead. Password guidance remains associated with its field. Action errors remain visible until dismissed, and dismissal returns focus to the originating control.

Motion is explanatory: a continuous cursor follows the recorded series; income/expense/net callouts and category focus describe the active period. It never generates new financial values. Pause controls, reduced motion, modal suspension, and hidden-tab suspension are required.

The chart is one keyboard tab stop. Left/right arrows and Home/End choose a period; Enter/Space inspect its exact values and Escape releases manual focus. Resizing retains the selected period and chart focus.

## Source files

`public/ui.css` supplies the base components; `public/workbench.css` holds the refined reference system; `public/styles.css` applies production layouts, responsive behavior, and application states. Geist and icon license notices live under `public/assets/`.
