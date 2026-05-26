import type { MarketQuote } from "@/lib/api";
import { formatCompact, formatNumber, formatPct } from "@/lib/format";

interface Props {
  quote: MarketQuote;
  stockName?: string | null;
}

function changeClass(change: number) {
  if (change > 0) return "text-trading-up";
  if (change < 0) return "text-trading-down";
  return "text-muted-strong";
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted">{label}</span>
      <span className={`font-mono tabular text-sm font-semibold ${tone ?? "text-muted-strong"}`}>
        {value}
      </span>
    </div>
  );
}

export default function MarketQuoteCard({ quote }: Props) {
  const tone = changeClass(quote.change);
  const sign = quote.change > 0 ? "+" : "";

  return (
    <div className="rounded-xl bg-surface-card-dark px-6 py-5 flex flex-wrap items-center gap-x-8 gap-y-4">
      {/* 현재가 + 등락 */}
      <div className="flex items-baseline gap-4">
        <span className="font-mono tabular text-4xl font-bold text-on-dark tracking-tight">
          {formatNumber(quote.price)}
          <span className="text-lg text-muted font-normal ml-1">원</span>
        </span>
        <span className={`font-mono tabular text-xl font-semibold ${tone}`}>
          {sign}{formatNumber(quote.change)}
          <span className="text-base ml-2">({formatPct(quote.change_rate)})</span>
        </span>
      </div>

      {/* 구분선 */}
      <div className="hidden md:block w-px h-8 bg-hairline-on-dark" />

      {/* 세부 스탯 */}
      <div className="flex gap-6 flex-wrap">
        <Stat label="고가" value={formatNumber(quote.high ?? null)} tone="text-trading-up" />
        <Stat label="저가" value={formatNumber(quote.low ?? null)} tone="text-trading-down" />
        <Stat label="거래량" value={formatCompact(quote.volume ?? null)} />
        <Stat label="52W 고" value={formatNumber(quote.w52_high ?? null)} />
        <Stat label="52W 저" value={formatNumber(quote.w52_low ?? null)} />
      </div>
    </div>
  );
}
