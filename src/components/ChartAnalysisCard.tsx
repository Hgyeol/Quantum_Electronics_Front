"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { fetchChartAnalysis, fetchMarketQuote } from "@/lib/api";
import type { ChartAnalysis, MarketQuote, OHLCVBar } from "@/lib/api";
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

function SignalSummary({ data, livePrice }: { data: ChartAnalysis; livePrice?: number | null }) {
  const { signal } = data;
  const colors = actionColors(signal.action);
  const cur = livePrice ?? data.current_price;

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

function LevelsTable({ data, livePrice }: { data: ChartAnalysis; livePrice?: number | null }) {
  const cur = livePrice ?? data.current_price;
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

interface LiveTick {
  price: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  bsop_date?: string;
}

interface Props {
  stockCode: string;
  stockName?: string | null;
  onNameResolved?: (name: string) => void;
  onBarHover?: (bar: OHLCVBar | null) => void;
  onBarClick?: (bar: OHLCVBar | null) => void;
  chartOnly?: boolean;
  liveTick?: LiveTick | null;
}

function todayKST(): string {
  // KST = UTC+9
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function buildTodayBarFromTick(tick: LiveTick): OHLCVBar | null {
  const open = tick.open && tick.open > 0 ? tick.open : null;
  const high = tick.high && tick.high > 0 ? tick.high : null;
  const low = tick.low && tick.low > 0 ? tick.low : null;
  if (!open || !high || !low) return null;
  const date = tick.bsop_date
    ? `${tick.bsop_date.slice(0, 4)}-${tick.bsop_date.slice(4, 6)}-${tick.bsop_date.slice(6, 8)}`
    : todayKST();
  return { date, open, high, low, close: tick.price, volume: tick.volume ?? 0 };
}

function buildTodayBarFromQuote(q: MarketQuote): OHLCVBar | null {
  if (!q.high || !q.low) return null;
  const open = q.price - q.change;
  if (open <= 0) return null;
  return { date: todayKST(), open, high: q.high, low: q.low, close: q.price, volume: q.volume ?? 0 };
}

export default function ChartAnalysisCard({ stockCode, stockName, onNameResolved, onBarHover, onBarClick, chartOnly, liveTick }: Props) {
  const [data, setData] = useState<ChartAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveQuote, setLiveQuote] = useState<MarketQuote | null>(null);

  const livePrice = liveTick?.price ?? liveQuote?.price ?? null;

  function todayBar(base: OHLCVBar[]): OHLCVBar | undefined {
    const bar = (liveTick && buildTodayBarFromTick(liveTick))
      ?? (liveQuote && buildTodayBarFromQuote(liveQuote));
    if (!bar) return undefined;
    if (base.length > 0 && base[base.length - 1].date >= bar.date) return undefined;
    return bar;
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    setLiveQuote(null);
    onBarClick?.(null);
    fetchChartAnalysis(stockCode)
      .then((d) => {
        setData(d);
        if (d.stock_name) onNameResolved?.(d.stock_name);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
    fetchMarketQuote(stockCode)
      .then(setLiveQuote)
      .catch(() => {});
  }, [stockCode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (chartOnly) {
    return (
      <section className="space-y-0">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted text-sm">
            <span className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
            차트 불러오는 중…
          </div>
        )}
        {error && !loading && (
          <p className="text-trading-down text-sm py-4 px-5">{error}</p>
        )}
        {data && !loading && (
          <StockPriceChart
            ohlcv={data.ohlcv}
            todayBar={todayBar(data.ohlcv)}
            supports={[]}
            resistances={[]}
            currentPrice={livePrice ?? data.current_price}
            onBarHover={onBarHover}
            onBarClick={onBarClick}
            defaultPeriod="3M"
            minimal
          />
        )}
      </section>
    );
  }

  return (
    <section className="space-y-0">
      <header className="flex items-baseline justify-between px-5 pt-5 pb-0">
        <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold">Chart Analysis</h2>
        <span className="text-[11px] text-muted">저점 · 고점 · 진입·이탈 시점</span>
      </header>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted text-sm px-5">
          <span className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
          차트 분석 중…
        </div>
      )}

      {error && !loading && (
        <p className="text-trading-down text-sm py-4 px-5">{error}</p>
      )}

      {data && !loading && (
        <div className="space-y-0">
          <StockPriceChart
            ohlcv={data.ohlcv}
            todayBar={todayBar(data.ohlcv)}
            supports={data.support_levels}
            resistances={data.resistance_levels}
            currentPrice={livePrice ?? data.current_price}
            onBarHover={onBarHover}
            onBarClick={onBarClick}
          />

          <div className="px-5 pt-4 pb-1">
            <SignalSummary data={data} livePrice={livePrice} />
          </div>

          <div className="px-5 pb-4">
            <LevelsTable data={data} livePrice={livePrice} />
          </div>

          <p className="text-[11px] text-muted px-5 pb-5 pt-3" style={{ borderTop: "1px solid var(--c-border)" }}>
            {data.disclaimer}
          </p>
        </div>
      )}
    </section>
  );
}
