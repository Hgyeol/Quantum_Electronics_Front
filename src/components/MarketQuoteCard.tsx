import type { MarketQuote } from "@/lib/api";
import { formatCompact, formatNumber, formatPct } from "@/lib/format";

interface Props {
  quote: MarketQuote;
  stockName?: string | null;
}

function changeClass(change: number) {
  if (change > 0) return "text-trading-up";
  if (change < 0) return "text-trading-down";
  return "text-muted";
}

export default function MarketQuoteCard({ quote }: Props) {
  const tone = changeClass(quote.change);
  const sign = quote.change > 0 ? "+" : "";

  return (
    <div>
      {/* 현재가 + 등락 */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <span className="font-mono tabular text-[36px] font-bold text-ink leading-none tracking-tight">
          {formatNumber(quote.price)}
          <span className="text-base text-muted font-normal ml-1.5">원</span>
        </span>
        <span className={`font-mono tabular text-lg font-semibold ${tone} leading-none mb-0.5`}>
          {sign}{formatNumber(quote.change)} ({formatPct(quote.change_rate)})
        </span>
      </div>

      {/* 세부 스탯 */}
      <div className="flex gap-5 flex-wrap">
        {[
          { label: "고가", value: formatNumber(quote.high ?? null), tone: "text-trading-up" },
          { label: "저가", value: formatNumber(quote.low ?? null), tone: "text-trading-down" },
          { label: "거래량", value: formatCompact(quote.volume ?? null), tone: undefined },
          { label: "52W 고", value: formatNumber(quote.w52_high ?? null), tone: undefined },
          { label: "52W 저", value: formatNumber(quote.w52_low ?? null), tone: undefined },
        ].map(({ label, value, tone: t }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-[11px] text-muted uppercase tracking-wide">{label}</span>
            <span className={`font-mono tabular text-sm font-semibold ${t ?? "text-body"}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
