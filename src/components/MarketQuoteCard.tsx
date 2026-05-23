import type { MarketQuote } from "@/lib/api";
import {
  formatCompact,
  formatNumber,
  formatPct,
} from "@/lib/format";

interface Props {
  quote: MarketQuote;
  stockName?: string | null;
}

function changeClass(change: number): string {
  if (change > 0) return "text-trading-up";
  if (change < 0) return "text-trading-down";
  return "text-muted-strong";
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span
        className={`font-mono tabular text-sm font-semibold ${tone ?? "text-on-dark"}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function MarketQuoteCard({ quote, stockName }: Props) {
  const tone = changeClass(quote.change);
  const sign = quote.change > 0 ? "+" : quote.change < 0 ? "" : "";

  return (
    <section className="rounded-xl bg-surface-card-dark border border-hairline-on-dark p-8">
      <header className="flex items-baseline justify-between mb-6">
        <h2 className="text-sm uppercase tracking-widest text-muted">
          Live Quote
        </h2>
        <span className="text-xs text-muted-strong font-mono">
          KIS · 실시간 시세
        </span>
      </header>

      <div className="flex flex-wrap items-end gap-8 mb-8">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted">
            현재가{stockName ? ` · ${stockName}` : ""}
          </span>
          <span className="font-mono tabular text-5xl font-bold text-on-dark leading-none">
            {formatNumber(quote.price)}
            <span className="text-lg text-muted-strong font-mono ml-2">원</span>
          </span>
        </div>
        <div className="flex flex-col gap-1 ml-auto items-end">
          <span className="text-xs uppercase tracking-wide text-muted">
            전일 대비
          </span>
          <span
            className={`font-mono tabular text-3xl font-bold leading-none ${tone}`}
          >
            {sign}
            {formatNumber(quote.change)}
            <span className="text-base ml-3">
              ({formatPct(quote.change_rate)})
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 pt-6 border-t border-hairline-on-dark">
        <StatCell
          label="당일 고가"
          value={formatNumber(quote.high ?? null)}
          tone="text-trading-up"
        />
        <StatCell
          label="당일 저가"
          value={formatNumber(quote.low ?? null)}
          tone="text-trading-down"
        />
        <StatCell
          label="거래량"
          value={formatCompact(quote.volume ?? null)}
        />
        <StatCell
          label="52주 최고"
          value={formatNumber(quote.w52_high ?? null)}
        />
        <StatCell
          label="52주 최저"
          value={formatNumber(quote.w52_low ?? null)}
        />
      </div>
    </section>
  );
}
