# Finance Workspace design system

## Direction

The approved reference direction is a compact financial workbench. Default navigation is a full sidebar with balances, cash flow, and a category ledger sharing a single analysis region. Tables carry the detailed work. The alternative exploration remains under `design-previews/`.

## Visual tokens

- Typeface: self-hosted **Geist Variable**, with tabular numerals. Local IBM Plex Sans is the fallback.
- Light: white canvas, near-black green-neutral ink `#202923`, muted ink `#68746c`, fine rules `#dde4df`.
- Dark: canvas `#171b18`, ink `#edf1ed`, muted ink `#a6b1a8`, rules `#36423a`.
- Primary control: dark green in light mode, light neutral in dark mode.
- Positive/negative values: green and muted red, also communicated through text and signs.
- Controls: 5–7 px corners; tables and related analysis sections are flat and divided with rules.
- Layout: 208 px desktop sidebar, 32 px main gutters, max-width analysis container; mobile collapses navigation into a dismissible panel.

## Type and hierarchy

Page titles are approximately 26 px; section headings 15 px; table text 12–14 px. Summary amounts are 22–32 px. Exact INR amounts use Indian grouping and two decimals. Compact chart readings expose exact values in titles/tooltips.

## Interaction rules

All controls have visible focus. Dialogs carry an accessible title, close on Escape, and return focus when their opener remains present. Mobile input text is at least 16 px. Tables scroll internally where required instead of widening the viewport.

Motion is explanatory: a continuous cursor follows the recorded series; income/expense/net callouts and category focus describe the active period. It never generates new financial values. Pause controls, reduced motion, modal suspension, and hidden-tab suspension are required.

## Source files

`public/ui.css` supplies the base components; `public/workbench.css` holds the refined reference system; `public/styles.css` applies production layouts, responsive behavior, and application states. Geist and icon license notices live under `public/assets/`.
