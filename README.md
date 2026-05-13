# Quantum Electronics — Frontend

Next.js 16 (App Router, TypeScript, Tailwind v4) visualization for the
`/Users/gimhangyeol/졸작` FastAPI backend. Renders the `OutlookReport`
payload (score breakdown, quant / financial / LLM signals, ML prediction,
position context, evidence) in a Binance-inspired dark theme.

## Quick Start

The backend (`uvicorn web.main:app`) must be running first on
`http://127.0.0.1:8000`. Then:

```bash
npm install     # one-time
npm run dev     # → http://localhost:3000
```

`npm run dev` and `npm run build` both pin webpack because Turbopack 16
panics on the non-ASCII path `졸작_프론트` (`turbopack-core/src/ident.rs:354`).

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` | FastAPI base URL used by `src/lib/api.ts` |

The backend allowlists `http://localhost:3000` for CORS by default; if you
serve the frontend from a different origin, set `OUTLOOK_CORS_ORIGINS` on
the backend side (comma-separated).

## Design System

Implements the documented Binance design language in CSS-only Tailwind v4
tokens (`src/app/globals.css`):

- Canvas `#0b0e11`, surface card `#1e2329`, primary yellow `#FCD535`.
- BinanceNova → Inter, BinancePlex → JetBrains Mono (numbers).
- Trading green `#0ecb81` / red `#f6465d` as text color only.
- Radius scale: md 6 / lg 8 / xl 12 / pill 9999.

## Layout

```
src/
├── app/
│   ├── globals.css        — Binance @theme tokens + base typography
│   ├── layout.tsx         — Inter + JetBrains Mono via next/font/google
│   └── page.tsx           — single-page outlook view
├── components/
│   ├── OutlookForm.tsx
│   ├── ScoreBreakdown.tsx
│   ├── QuantSignalsTable.tsx
│   ├── MLPredictionCard.tsx
│   ├── PositionContextCard.tsx
│   ├── EvidenceList.tsx
│   └── ErrorsBanner.tsx
└── lib/
    ├── api.ts             — typed fetch client + OutlookReport types
    └── format.ts          — KRW / pct / probability formatters
```

## Sample Calls

```bash
# Plain outlook
curl http://localhost:3000

# Backend directly (after CORS preflight)
curl "http://127.0.0.1:8000/outlook/stock/005930?avg_price=80000&quantity=10&held_since=2024-01-15"
```
