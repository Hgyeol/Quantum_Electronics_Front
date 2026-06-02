"use client";

import { useEffect, useState } from "react";
import { fetchMarketQuote, type MarketQuote } from "@/lib/api";

interface Props {
  stockCode: string;
}

function deriveSummary(q: MarketQuote): string {
  const fromHigh = q.w52_high ? ((q.w52_high - q.price) / q.w52_high) * 100 : null;
  const fromLow  = q.w52_low  ? ((q.price - q.w52_low) / q.w52_low) * 100   : null;

  // 등락 상태
  let move: string;
  if      (q.change_rate >=  5) move = `급등 +${q.change_rate.toFixed(1)}%`;
  else if (q.change_rate <= -5) move = `급락 ${q.change_rate.toFixed(1)}%`;
  else if (q.change_rate >=  2) move = `상승 +${q.change_rate.toFixed(1)}%`;
  else if (q.change_rate <= -2) move = `하락 ${q.change_rate.toFixed(1)}%`;
  else                          move = `보합 ${q.change_rate >= 0 ? "+" : ""}${q.change_rate.toFixed(2)}%`;

  // 52주 위치
  let pos: string | null = null;
  if (fromHigh !== null && fromHigh < 3)     pos = "52주 고가 근접";
  else if (fromLow !== null && fromLow < 5)  pos = "52주 저가 근접";
  else if (fromHigh !== null)                pos = `52주 고가 대비 -${fromHigh.toFixed(0)}%`;

  return pos ? `${move} · ${pos}` : move;
}

function summaryTone(q: MarketQuote): { bg: string; text: string } {
  if      (q.change_rate >=  5) return { bg: "bg-trading-up/10",   text: "text-trading-up" };
  else if (q.change_rate <= -5) return { bg: "bg-trading-down/10", text: "text-trading-down" };
  return { bg: "", text: "text-body" };
}

function StatRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-muted-strong">{label}</span>
      <span className={`font-mono tabular text-[13px] font-semibold ${tone ?? "text-ink"}`}>{value}</span>
    </div>
  );
}

function fmt(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString("ko-KR");
}

export default function StockPreviewStats({ stockCode }: Props) {
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setQuote(null);
    fetchMarketQuote(stockCode)
      .then(setQuote)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [stockCode]);

  if (loading) {
    return (
      <div className="py-4 space-y-3" >
        <div className="ml-5 mr-[72px]">
          <div className="h-9 rounded-lg animate-pulse" style={{ background: "var(--c-bg-muted)" }} />
        </div>
        <div className="space-y-2 pt-2 ml-5 mr-[72px]">
          {[0,1,2,3,4].map((i) => (
            <div key={i} className="h-4 rounded animate-pulse" style={{ background: "var(--c-border)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (!quote) return null;

  const summary = deriveSummary(quote);
  const tone = summaryTone(quote);

  return (
    <div className="py-4 space-y-4" >
      {/* 한줄요약 — 차트와 동일한 폭 (mr-72) */}
      <div className="ml-5 mr-[72px]">
        <div
          className={`px-3 py-2 rounded-lg text-[12px] font-semibold ${tone.bg} ${tone.text}`}
          style={tone.bg ? {} : { background: "var(--c-bg-subtle)" }}
        >
          {summary}
        </div>
      </div>

      {/* 시세 */}
      <div className="ml-5 mr-[72px] px-3">
        <h3 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-2">시세</h3>
        <div className="space-y-1.5">
          <StatRow label="고가"   value={fmt(quote.high)}   tone="text-trading-up" />
          <StatRow label="저가"   value={fmt(quote.low)}    tone="text-trading-down" />
          <StatRow label="거래량" value={quote.volume != null ? `${fmt(quote.volume)}주` : "—"} />
        </div>
      </div>

    </div>
  );
}
