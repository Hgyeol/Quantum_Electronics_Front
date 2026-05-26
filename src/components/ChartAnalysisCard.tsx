"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { fetchChartAnalysis } from "@/lib/api";
import type { ChartAnalysis } from "@/lib/api";
import { formatKRW } from "@/lib/format";

// lightweight-charts uses window — load client-side only
const StockPriceChart = dynamic(() => import("./StockPriceChart"), { ssr: false });

// ── helpers ───────────────────────────────────────────────────────────────────

function pct(a: number, b: number) {
  const v = ((a - b) / b) * 100;
  return (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
}

function actionKo(action: "buy" | "hold" | "sell") {
  return { buy: "매수 고려", hold: "관망", sell: "매도 고려" }[action];
}

function confidenceKo(c: "low" | "medium" | "high") {
  return { low: "신호 약함", medium: "신호 보통", high: "신호 강함" }[c];
}

function actionColors(action: "buy" | "hold" | "sell") {
  if (action === "buy")
    return { badge: "bg-trading-up text-canvas-dark", border: "border-trading-up/30" };
  if (action === "sell")
    return { badge: "bg-trading-down text-canvas-dark", border: "border-trading-down/30" };
  return { badge: "bg-primary text-canvas-dark", border: "border-primary/30" };
}

function sourceLabel(source?: string) {
  const map: Record<string, string> = {
    swing: "스윙포인트",
    ma20: "MA20",
    ma60: "MA60",
    bb_lower: "BB 하단",
    bb_upper: "BB 상단",
  };
  return map[source ?? ""] ?? "";
}

// ── Signal Summary ─────────────────────────────────────────────────────────────

function SignalSummary({ data }: { data: ChartAnalysis }) {
  const { signal } = data;
  const colors = actionColors(signal.action);
  const cur = data.current_price;

  return (
    <div className={`rounded-lg border ${colors.border} bg-surface-elevated-dark p-5 space-y-4`}>
      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${colors.badge}`}>
          {actionKo(signal.action)}
        </span>
        <span className="text-xs text-muted-strong">{confidenceKo(signal.confidence)}</span>
        <span className="ml-auto text-xs text-muted font-mono">{data.analysis_period_days}일 분석</span>
      </div>

      {/* Price grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* 매수 구간 */}
        <div className="rounded-md bg-trading-up/10 border border-trading-up/20 p-3">
          <div className="text-[11px] text-trading-up font-semibold mb-2">매수 구간</div>
          {signal.entry_zone_low && signal.entry_zone_high ? (
            <div className="space-y-0.5">
              <div className="font-mono text-xs text-trading-up font-bold">{formatKRW(signal.entry_zone_low)}</div>
              <div className="font-mono text-xs text-trading-up font-bold">~ {formatKRW(signal.entry_zone_high)}</div>
              {signal.stop_loss && (
                <div className="text-[11px] text-muted-strong mt-1">
                  손절 <span className="font-mono">{formatKRW(signal.stop_loss)}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-strong">현재 매수 구간 없음</div>
          )}
        </div>

        {/* 현재가 */}
        <div className="rounded-md bg-primary/10 border border-primary/20 p-3 flex flex-col justify-center items-center text-center">
          <div className="text-[11px] text-primary font-semibold mb-2">현재가</div>
          <div className="font-mono text-sm font-bold text-primary">{formatKRW(cur)}</div>
        </div>

        {/* 매도 목표 */}
        <div className="rounded-md bg-trading-down/10 border border-trading-down/20 p-3">
          <div className="text-[11px] text-trading-down font-semibold mb-2">매도 목표</div>
          {signal.primary_target ? (
            <div className="space-y-0.5">
              <div className="font-mono text-xs text-trading-down font-bold">
                1차 {formatKRW(signal.primary_target)}
              </div>
              <div className="text-[11px] text-muted-strong">{pct(signal.primary_target, cur)}</div>
              {signal.secondary_target && (
                <div className="font-mono text-xs text-trading-down/70">
                  2차 {formatKRW(signal.secondary_target)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-strong">저항선 없음</div>
          )}
        </div>
      </div>

      {/* R/R */}
      {signal.risk_reward_ratio && (
        <div className="text-xs text-muted-strong">
          리스크 대비 수익 <span className="text-on-dark font-mono font-semibold">1 : {signal.risk_reward_ratio}</span>
        </div>
      )}

      {/* Reasoning */}
      <div className="space-y-1 pt-1 border-t border-hairline-on-dark">
        {signal.reasoning.map((r, i) => (
          <div key={i} className="flex gap-2 text-xs text-muted-strong">
            <span className="text-muted mt-0.5 flex-shrink-0">•</span>
            <span>{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Support / Resistance Table ─────────────────────────────────────────────────

function LevelsTable({ data }: { data: ChartAnalysis }) {
  const cur = data.current_price;
  const supports = data.support_levels;
  const resistances = data.resistance_levels;

  if (supports.length === 0 && resistances.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="text-xs text-trading-up font-semibold mb-2">지지선 (저점 · 매수 구간)</div>
        {supports.map((l, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-hairline-on-dark last:border-0 gap-3">
            <span className="font-mono text-sm text-trading-up font-semibold">{formatKRW(l.price)}</span>
            <div className="text-right">
              <div className="text-xs text-muted-strong">{pct(l.price, cur)}</div>
              {l.source && <div className="text-[10px] text-muted">{sourceLabel(l.source)}</div>}
            </div>
          </div>
        ))}
      </div>
      <div>
        <div className="text-xs text-trading-down font-semibold mb-2">저항선 (고점 · 매도 목표)</div>
        {resistances.map((l, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-hairline-on-dark last:border-0 gap-3">
            <span className="font-mono text-sm text-trading-down font-semibold">{formatKRW(l.price)}</span>
            <div className="text-right">
              <div className="text-xs text-muted-strong">{pct(l.price, cur)}</div>
              {l.source && <div className="text-[10px] text-muted">{sourceLabel(l.source)}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  stockCode: string;
  stockName?: string | null;
}

export default function ChartAnalysisCard({ stockCode, stockName }: Props) {
  const [data, setData] = useState<ChartAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    fetchChartAnalysis(stockCode)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [stockCode]);

  return (
    <section className="rounded-xl bg-surface-card-dark border border-hairline-on-dark shadow-card p-6 space-y-6">
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm uppercase tracking-widest text-muted">Chart Analysis</h2>
        <span className="text-xs text-muted-strong">저점 · 고점 · 진입·이탈 시점</span>
      </header>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-strong text-sm">
          <span className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
          차트 분석 중…
        </div>
      )}

      {error && !loading && (
        <p className="text-trading-down text-sm py-4">{error}</p>
      )}

      {data && !loading && (
        <div className="space-y-6">
          {/* 1. 실제 가격 차트 */}
          <StockPriceChart
            ohlcv={data.ohlcv}
            supports={data.support_levels}
            resistances={data.resistance_levels}
            currentPrice={data.current_price}
          />

          {/* 2. 매수/매도 신호 요약 */}
          <SignalSummary data={data} />

          {/* 3. 지지/저항 레벨 목록 */}
          <LevelsTable data={data} />

          <p className="text-xs text-muted border-t border-hairline-on-dark pt-3">
            {data.disclaimer}
          </p>
        </div>
      )}
    </section>
  );
}
