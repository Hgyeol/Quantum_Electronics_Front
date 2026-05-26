## Overview

This is a **Toss Invest–inspired light design system** for a Korean stock analysis platform. The atmosphere is airy white canvas with subtle gray surfaces, driven by a single brand color — **Toss Blue** (`{colors.primary}` — #3182F6). The UI is clean, data-forward, and grounded in Korean market conventions.

The system is single-theme: light throughout. Token names kept the legacy `*-dark` suffix from a prior dark system (e.g., `canvas-dark`, `surface-card-dark`) but now map to light values — this prevents component rewrites while updating the palette. The token names are internal implementation details; the rendered output is a fully light UI.

**Key Characteristics:**

- Single accent: `{colors.primary}` (#3182F6) handles all interactive states, links, focus rings, and CTAs. Used scarcely to preserve its signal value.
- Korean stock color convention: 상승(up) = 빨강 (`{colors.trading-up}` #F04452), 하락(down) = 파랑 (`{colors.trading-down}` #1B64DA). This is the opposite of the western convention and is non-negotiable for Korean-market users.
- Card-first layout: all content surfaces are white cards with `{shadow-card}` on a `{colors.canvas-dark}` (#F2F4F6) gray page floor. Depth comes from shadow, not from color-block contrast.
- Rounder corners than Binance: `{rounded.md}` is 10px and `{rounded.xl}` is 18px — softer, friendlier than trading-platform defaults.
- Type stack: **Inter** (display + body) and **JetBrains Mono** (all numbers, tickers, financial values). Korean text fallback: Pretendard → Noto Sans KR.

---

## Colors

### Brand & Accent

- **Toss Blue** (`{colors.primary}` — #3182F6): The single brand accent. Used for primary CTA backgrounds, active tab indicators, focus rings, links, and the watchlist star in active state. Appears sparingly — its scarcity carries the signal.
- **Toss Blue Active** (`{colors.primary-active}` — #1C6EF2): The pressed / hover-darker variant.
- **Toss Blue Disabled** (`{colors.primary-disabled}` — #C5D9FC): Desaturated light blue for disabled interactive elements.
- **On Primary** (`{colors.on-primary}` — #FFFFFF): White text/icons on Toss Blue backgrounds.

### Surface

All surfaces are light. The `*-dark` token names are legacy aliases — they now map to light values.

- **Canvas Dark** (`{colors.canvas-dark}` — #F2F4F6): Page floor. The lightest gray — sits behind all cards and separates them visually.
- **Surface Card Dark** (`{colors.surface-card-dark}` — #FFFFFF): Card face. Pure white. Every content block (quote card, signals table, chart card) sits on this.
- **Surface Elevated Dark** (`{colors.surface-elevated-dark}` — #F8F9FA): Nested elevated area within a card (e.g., the quant detail expand panel, form input backgrounds).
- **Canvas Light** (`{colors.canvas-light}` — #FFFFFF): Alias for pure white. Used in form input backgrounds.
- **Surface Soft Light** (`{colors.surface-soft-light}` — #F2F4F6): Same as canvas — footer and soft alternate-row fills.
- **Surface Strong Light** (`{colors.surface-strong-light}` — #EAECEF): Strongest neutral surface — pressed states and loading skeletons.

### Hairlines & Borders

- **Hairline on Dark / Hairline on Light** (`{colors.hairline-on-dark}` / `{colors.hairline-on-light}` — both #E5E8EB): The 1px separator tone. Shared across both "modes" because the system is fully light. Used extensively on row dividers inside signal tables, card inner sections, and input borders.
- **Border Strong** (`{colors.border-strong}` — #C8D1DA): Heavier border for disabled inputs and the watchlist-add button outline.

### Text

- **Ink** (`{colors.ink}` — #191F28): Strongest text — main stock name, headline, and the primary price number.
- **On Dark** (`{colors.on-dark}` — #191F28): Semantic alias for ink used on card surfaces. Same value. Name kept to avoid touching all components.
- **Body** (`{colors.body}` — #4E5968): Default running text and meta labels.
- **Body on Light** (`{colors.body-on-light}` — #191F28): Alias for ink in explicit light-context components (forms, overlays).
- **Muted** (`{colors.muted}` — #8B95A1): Section headers, column labels, captions. Works on both canvas and card.
- **Muted Strong** (`{colors.muted-strong}` — #6B7684): Second-tier muted for emphasized secondary text (API names, source tags, hint text).

### Trading Semantics (Korean Convention)

- **Trading Up** (`{colors.trading-up}` — #F04452): 상승 / positive direction. Korean convention: price-up = 빨강(red). Applied as text color on price change values, ArrowGlyph ▲, FinalVerdictCard positive background tint, and score bar positive fill.
- **Trading Down** (`{colors.trading-down}` — #1B64DA): 하락 / negative direction. Korean convention: price-down = 파랑(blue). Same usage pattern as trading-up.

These are semantic price-direction tokens, not generic success/error. Never use them for form validation states.

### Info / Misc

- **Info** (`{colors.info}` — #3182F6): Aliases primary — used for focus rings and informational highlights.
- **Accent Turquoise** (`{colors.accent-turquoise}` — #0DB3A8): Reserved for secondary chart overlays (e.g., future extension). Not used in current components.

---

## Typography

### Font Stack

```
--font-display: Inter, Pretendard, "Noto Sans KR", -apple-system, sans-serif
--font-mono:    JetBrains Mono, "Noto Sans KR", ui-monospace, monospace
```

The split is functional:

- **Inter** → all editorial copy (stock names, labels, analysis summaries, navigation, buttons)
- **JetBrains Mono** → all numerical and financial data (prices, changes, scores, percentages, volumes)

Mixing them is intentional and characteristic: mono numbers feel precise and scannable next to proportional labels.

Tailwind utility: `.font-mono.tabular` applies JetBrains Mono + `font-variant-numeric: tabular-nums`. Use `.tabular` class on every number that must stay fixed-width across sign changes (prices, percentages, scores).

### Hierarchy

| Role | Size | Weight | Use |
|---|---|---|---|
| Price display | 36px / 700 | bold | Current price in MarketQuoteCard |
| Section title | 24px / 600 | semibold | Page-level headings |
| Card title | 16px / 600 | semibold | Stock name in page header |
| Body | 14px / 400 | normal | Labels, descriptions, evidence titles |
| Label / stat | 13px / 600 | semibold | Score values, price changes, watchlist ticker values |
| Caption | 12px / 400 | normal | Meta info (dates, source tags, disclaimer text) |
| Micro label | 11px / 600-700 | semibold | Section subheaders, KIS source tags, watchlist ticker % |

Display prices always use `.font-mono.tabular`. Section subheaders (`text-[11px] uppercase tracking-[0.18em]`) follow the Toss convention for category labels.

---

## Layout

### Spacing

Base unit: 4px. Internal card padding is predominantly 24px (`p-6`). Row-level padding in signal tables is 12px (`py-3`). Section gaps between stacked cards use the default Tailwind `gap-5` or `gap-6` (20–24px).

### Container

Max width `max-w-5xl` (1024px) centered, with `px-5` horizontal padding. Single-column on all current pages; the layout is content-first, not editorial-grid.

### Sticky Header

The `<header>` is sticky (Tailwind `sticky top-0 z-50`) with `bg-surface-card-dark` and a bottom hairline. Below it sits the WatchlistBar strip, then the main content area with a `py-8` top pad.

---

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Page floor | `bg-canvas-dark` (#F2F4F6) | Body, between-card gaps |
| Card surface | `bg-surface-card-dark` (#FFFFFF) + `.shadow-card` | All content blocks |
| Nested panel | `bg-canvas-dark` + hairline border | Expand panels inside signal rows (QuantDetail, FinancialDetail, AIDetail) |
| Focus ring | `ring-2 ring-primary/50` | Input focus, button keyboard focus |

### `shadow-card`

```css
.shadow-card {
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06);
}
```

Applied to every top-level card container: MarketQuoteCard wrapper, SignalBreakdownPanel, QuantSignalsTable, FinalVerdictCard, ChartAnalysisCard, PositionContextCard, EvidenceList, TechnicalIndicatorsPanel. This is the system's primary depth signal — every piece of content that floats above the gray canvas floor uses it.

---

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `rounded-xs` (`{rounded.xs}`) | 4px | Small inline tags, score badges |
| `rounded-sm` (`{rounded.sm}`) | 6px | Compact buttons, source tags |
| `rounded-md` (`{rounded.md}`) | 10px | Standard inputs, search box, compact cards |
| `rounded-lg` (`{rounded.lg}`) | 14px | Content cards (FinalVerdictCard, PositionContextCard) |
| `rounded-xl` (`{rounded.xl}`) | 18px | Large cards (SignalBreakdownPanel, QuantSignalsTable, ChartAnalysisCard) |
| `rounded-pill` (`{rounded.pill}`) | 9999px | WatchlistBar remove button, pill CTAs |

The radius scale is softer than trading platforms — Toss's brand language is approachable, not austere.

---

## Components

### WatchlistBar

A sticky strip directly below the header. Background `{colors.surface-card-dark}`, bottom hairline. Contains a "관심종목" label and a horizontal scrollable list of watchlist tickers.

Each ticker chip: stock name in `text-[13px] font-semibold text-ink` + price + direction glyph (▲/▼) + % change in the appropriate trading color. Hover reveals a `×` remove button (opacity-0 → opacity-100 on group hover). Selecting a ticker fires `onSelect(code)` to set the active stock.

Data source: `GET /watchlist?codes=...` — KIS `intstock-multprice` API (`FHKST11300006`), returns up to 30 stocks in one call.

Persistence: `localStorage` via `useWatchlist()` hook (`qe_watchlist_codes` key).

### MarketQuoteCard

Displays the current price and key stats for the active stock.

Structure:
1. Price row: `text-[36px] font-bold font-mono tabular text-ink` price + `text-lg` change in trading color.
2. Stat row: 고가 (trading-up) / 저가 (trading-down) / 거래량 / 52W 고 / 52W 저 — each as a small `flex-col` unit with an `11px uppercase` label.

### FinalVerdictCard

The primary verdict summary. Contains:
1. Header banner with a full-width background tint: `bg-trading-up/10` (positive) or `bg-trading-down/10` (negative) or neutral.
2. Score breakdown: Quant / LLM / Financial shown as labeled progress bars.
3. Action recommendation text.

Verdict tone determines all color choices in this card — do not mix tone colors.

### QuantSignalsTable

Expandable signal rows. Each row: `grid-cols-[24px_140px_1fr_120px_80px]`. Columns: ArrowGlyph · source (API or metric) · label · value · score.

Score is colored via `scoreClass()`: positive = `text-trading-up`, negative = `text-trading-down`, zero = `text-muted-strong`.

Clicking a row toggles an inline detail panel (`bg-canvas-dark` nested inside the card):
- **QuantDetail**: measurement value + KIS API used + interpretation text
- **FinancialDetail**: metric value + threshold guide + reason + evidence refs
- **AIDetail**: LLM summary + confidence + evidence refs

### SignalBreakdownPanel

Compact non-expandable signal list. Two sections: Quant Signals (KIS 5 indicators) and LLM Signals (GPT synthesis). `grid-cols-[14px_1fr_auto_44px]` per row. Provides the at-a-glance scoring view; QuantSignalsTable provides the detail view.

### PositionContextCard

Shows unrealized P&L context if the user has a position.

Rows: 현재가 / 평가손익 (+/- colored by pnl) / 수익률 / 본전 회복까지 / 52주 저점까지 / 52주 고점까지 / 보유 일수. Each is a `Row` component: `flex justify-between border-b border-hairline-on-dark py-3`.

Header shows: `{quantity.toLocaleString()}주 @ {formatKRW(avg_price)}`.

### EvidenceList

A list of evidence items (뉴스 / 공시 / 재무 / 시장 / 퀀트). Each row: kind badge + title (linked if URL present) + source + date. Kind badge: `bg-canvas-dark` pill with `text-muted`. Links open in `target="_blank"`.

### TechnicalIndicatorsPanel

Displays RSI, MACD, Bollinger Band, and chart-derived signals. Tab-navigable between indicator views.

### StockPriceChart

Candlestick chart using `lightweight-charts`. Color constants:

| Role | Value |
|---|---|
| Chart background | #FFFFFF |
| Grid lines | #F0F2F5 |
| Crosshair | #3182F6 (Toss Blue) |
| Candle up body | #F04452 (trading-up red) |
| Candle down body | #1B64DA (trading-down blue) |
| MA20 line | #F5A623 (amber) |
| MA60 line | #9B59B6 (purple) |
| Support line | #1B64DA |
| Resistance line | #F04452 |

These match the `{colors.trading-up}` and `{colors.trading-down}` tokens. They are hardcoded in the chart component because `lightweight-charts` takes hex strings, not CSS variables.

### OutlookForm

Borderless search input row with quick-pick buttons for time horizons. Input: full-width, borderless, `text-on-dark`, `bg-transparent`. Buttons: compact pill-style quick-selects in `bg-surface-elevated-dark`.

### Header & Search

The page header is a `shadow-card` block on `bg-surface-card-dark`. Contains:
- Stock name (`text-lg font-semibold text-ink`) + code (`text-sm text-muted`) + market badge
- MarketQuoteCard inline
- ☆ / ★ watchlist toggle button: outlined when not in watchlist (`border-hairline-on-dark`), filled Toss Blue when active

---

## ArrowGlyph

A shared primitive: `▲` in `text-trading-up`, `▼` in `text-trading-down`, `·` in `text-muted` for neutral. Used in WatchlistBar, QuantSignalsTable, SignalBreakdownPanel, and MarketQuoteCard.

## scoreClass() Utility

`format.ts` exports `scoreClass(score: number)`:
- `score > 0` → `text-trading-up`
- `score < 0` → `text-trading-down`
- `score === 0` → `text-muted-strong`

Applied consistently on all score columns across QuantSignalsTable and SignalBreakdownPanel.

---

## Do's and Don'ts

### Do

- Use `{colors.primary}` (#3182F6) exclusively for interactive elements: CTA backgrounds, active states, focus rings, the watchlist star fill, and links. Never for data or decorative fills.
- Apply `.font-mono.tabular` to every number. Prices, scores, volumes, percentages — always JetBrains Mono with tabular-nums. Mixing Inter into a numeric cell breaks scan readability.
- Apply `.shadow-card` to every top-level content card. The shadow is subtle — omitting it makes cards disappear into the canvas floor.
- Use `{colors.trading-up}` (red) for positive price direction and `{colors.trading-down}` (blue) for negative. This is Korean market convention — do not apply western green/red mapping.
- Keep `{rounded.xl}` (18px) for large card containers. The softer radius is part of the Toss brand language.
- Keep section-header labels at `text-[11px] uppercase tracking-widest text-muted`. This rhythm is consistent across all panel headers.

### Don't

- Don't use `{colors.trading-up}` or `{colors.trading-down}` for generic success/error states. They carry strict price-direction semantics.
- Don't add drop shadows beyond `.shadow-card`. The system uses a single shadow level — adding heavier shadows creates visual noise on the light canvas.
- Don't use `{colors.primary}` on large surface fills or decorative backgrounds. Toss Blue is a small-target color — buttons, icons, indicators, never card backgrounds.
- Don't use colored card backgrounds for verdict or signal states except as a very light tint (`/10` alpha). The card face stays white; only text and small fills take the trading colors.
- Don't remove the sticky header or WatchlistBar. Layout flow assumes they are always present.
- Don't add `border-radius` values outside the token scale. All radii come from `{rounded.xs}` through `{rounded.pill}`.

---

## Iteration Guide

1. **Token first**: change a CSS variable in `globals.css @theme` to update every component that references it. Only components with hardcoded hex strings (StockPriceChart) need separate updates.
2. **New cards get `shadow-card`**: add `className="rounded-xl bg-surface-card-dark border border-hairline-on-dark shadow-card"` as the container baseline.
3. **New numeric values get `.font-mono.tabular`**.
4. **New signal rows follow the `grid-cols-[...]` pattern** from QuantSignalsTable — no ad-hoc flex layouts for tabular data.
5. **Evidence refs always use `EvidenceRefList`** — don't inline the evidence rendering logic.
6. **Trading colors always via token** — `text-trading-up` / `text-trading-down`, never raw hex in components.
7. **Section headers follow**: `text-sm uppercase tracking-widest text-muted` for h2 inside `<header>` blocks.
