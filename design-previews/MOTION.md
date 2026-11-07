# Continuous chart insights

## Focal sequence

- Mercury/Stripe: a focus cursor moves along the complete income/expense curves, with an automatically updated period spotlight and income/expense/net readings.
- Revolut/Brex: the selected period's bars receive continuous internal flow highlights while the period spotlight explains their values.
- Spending categories are highlighted in sequence. The expense ledger or bar-panel caption displays each category's share and amount.
- The strongest net period is emphasized first. Full chart geometry and actual totals remain visible; no artificial transactions or fluctuating balances are generated.

## Continuity and feedback

- Reporting-period changes morph line geometry or move/resize matching bars while balance values update over the same 520 ms duration.
- The transaction panel enters in 280 ms and exits in 160 ms.
- Navigation uses a short view transition; chart hover/focus reveals exact period information.

## Preview controls and budget

- Both the comparison and the full previews run continuous data-bound focus by default. The full series is not repeatedly erased or redrawn.
- The time cursor completes a sweep in about 18 seconds; spending-category focus advances every 5.2 seconds.
- Pause controls freeze the guidance. Hover exposes a tooltip without stopping the continuous focus; explicitly focusing/selecting a period holds it for inspection. Opening the transaction panel pauses background guidance.
- Hidden/offscreen previews stop their animation work. Reduced motion presents the insights statically.
- Paths are sampled once per render. Animation updates a small SVG focus layer and changes text only when the active period/category changes.
