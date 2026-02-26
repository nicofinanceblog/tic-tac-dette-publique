# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Tic-tac Dette Publique** is a static single-page web app that tracks French public debt in real time. It is deployed on GitHub Pages at `https://nicofinanceblog.github.io/tic-tac-dette-publique/`.

There is no build system, no package manager, and no test suite. Development is done by editing the source files directly and opening `index.html` in a browser.

## Development

To preview locally, open `index.html` directly in a browser (no server required). Tailwind CSS is loaded via CDN — no local install needed.

## Updating Debt Data

The only data to update on each quarterly release is the `CONFIG` object at the top of `script.js`:

```js
const CONFIG = {
  DEBT_DATE: "2025-09-30",              // end of the reference quarter (ISO date)
  DEBT_VALUE: 3_482_179_980_000,        // total debt in EUR at that date
  DEBT_INCREASE_PER_MONTH: 15_061_305_000, // (currentQ - sameQ_prev_year) / 12
  POPULATION: 68_520_000,
  TAX_HOUSEHOLDS: 18_200_000,
  DEFAULT_LANG: "fr",
  AVERAGE_BORROWING_RATE: 1.96,         // apparent average rate (charge d'intérêts / encours)
};
```

Previous CONFIG values are preserved as commented-out blocks above the active one for reference.

**Data sources:**
- Total debt & borrowing rate: [Agence France Trésor](https://www.aft.gouv.fr/)
- Population & tax households: [INSEE](https://www.insee.fr/) / [Eurostat](https://ec.europa.eu/eurostat)

## Architecture

Everything lives in `script.js` as an IIFE (`DebtApp`), structured as:

- **`CONFIG`** — all data constants; the only thing that changes between releases
- **`translations` / `modalContent`** — FR/EN string maps; `interestTitle` is a function taking the current rate
- **`tick(timestamp)`** — `requestAnimationFrame` loop (throttled to ~10 fps via `setTimeout 100ms`) that recomputes debt from elapsed time and updates all DOM elements
- **`calculateInitialDebt()`** — extrapolates current debt from `CONFIG.DEBT_DATE` using `DEBT_INCREASE_PER_MONTH`
- **`calculatePerSecondDebtIncrease()`** — converts monthly increase to per-second rate (divides by `30.44 × 86400`)
- **`toggleLanguage()`** — swaps `lang` state and re-renders all labels; resets `lastUpdate` to force tick recalculation
- **`updateInterestRate(val)`** — updates the slider state and triggers red/green CSS flash animation on the interest table

DOM element references are initialized once via `Object.fromEntries` into the `elements` map. The modal is opened by any `.help-trigger` click and shows methodology/source info in the current language.
