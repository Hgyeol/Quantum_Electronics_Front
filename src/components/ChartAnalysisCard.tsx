"use client";

import { type ReactNode, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { fetchChartAnalysis, fetchMarketQuote } from "@/lib/api";
import type { ChartAnalysis, MarketQuote, OHLCVBar } from "@/lib/api";
import { formatKRW } from "@/lib/format";

// lightweight-charts uses window — load client-side only
const StockPriceChart = dynamic(() => import("./StockPriceChart"), { ssr: false });
const SimilarPatternsCard = dynamic(() => import("./SimilarPatternsCard"), { ssr: false });

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

function actionBadge(action: "buy" | "hold" | "sell") {
  if (action === "buy")  return { bg: "bg-trading-up/10", text: "text-trading-up" };
  if (action === "sell") return { bg: "bg-trading-down/10", text: "text-trading-down" };
  return { bg: "bg-primary/10", text: "text-primary" };
}

function sourceLabel(source?: string) {
  const map: Record<string, string> = {
    poc:  "POC",
    hvn:  "HVN",
    vwap: "VWAP",
    swing: "스윙",
    ma20: "MA20",
    ma60: "MA60",
    bb_lower: "BB하단",
    bb_upper: "BB상단",
  };
  return map[source ?? ""] ?? "";
}

// ── Signal Summary ─────────────────────────────────────────────────────────────

function SignalSummary({ data, livePrice }: { data: ChartAnalysis; livePrice?: number | null }) {
  const { signal } = data;
  const badge = actionBadge(signal.action);
  const cur = livePrice ?? data.current_price;

  return (
    <div className="bg-white rounded-[24px] border border-[var(--c-border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ borderBottom: "1px solid var(--c-border)" }}>
        <h3 className="text-[15px] font-bold text-ink">매매 시그널</h3>
        <span className="text-muted">·</span>
        <span className={`text-[12px] font-bold px-2 py-0.5 rounded-[6px] ${badge.bg} ${badge.text}`}>
          {actionKo(signal.action)}
        </span>
        <span className="text-[12px] text-muted-strong">{confidenceKo(signal.confidence)}</span>
        <span className="ml-auto text-[11px] text-muted font-mono tabular">{data.analysis_period_days}일 분석</span>
      </div>

      {/* Price grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3">
        {/* 매수 구간 */}
        <div className="px-5 py-4 border-b border-hairline-on-dark sm:border-b-0 sm:border-r">
          <div className="text-[11px] text-trading-up font-semibold mb-1.5">매수 구간</div>
          {signal.entry_zone_low && signal.entry_zone_high ? (
            <>
              <div className="font-mono tabular text-[14px] text-ink font-bold leading-tight">{formatKRW(signal.entry_zone_low)}</div>
              <div className="font-mono tabular text-[13px] text-body-secondary leading-tight mt-0.5">~ {formatKRW(signal.entry_zone_high)}</div>
              {signal.stop_loss && (
                <div className="text-[11px] text-muted-strong mt-2">
                  손절 <span className="font-mono tabular text-body">{formatKRW(signal.stop_loss)}</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-[12px] text-muted">현재 매수 구간 없음</div>
          )}
        </div>

        {/* 현재가 */}
        <div className="px-5 py-4 flex flex-col justify-center items-center text-center border-b border-hairline-on-dark sm:border-b-0 sm:border-r">
          <div className="text-[11px] text-muted font-semibold mb-1.5">현재가</div>
          <div className="font-mono tabular text-[18px] text-ink font-bold leading-none">{formatKRW(cur)}</div>
        </div>

        {/* 매도 목표 */}
        <div className="px-5 py-4">
          <div className="text-[11px] text-trading-down font-semibold mb-1.5">매도 목표</div>
          {signal.primary_target ? (
            <>
              <div className="font-mono tabular text-[14px] text-ink font-bold leading-tight">
                {formatKRW(signal.primary_target)}
              </div>
              <div className="text-[11px] text-muted-strong leading-tight mt-0.5">
                1차 <span className="font-mono tabular">{pct(signal.primary_target, cur)}</span>
              </div>
              {signal.secondary_target && (
                <div className="text-[11px] text-muted mt-2">
                  2차 <span className="font-mono tabular text-body">{formatKRW(signal.secondary_target)}</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-[12px] text-muted">저항선 없음</div>
          )}
        </div>
      </div>

      {/* R/R + Reasoning footer */}
      {(signal.risk_reward_ratio || signal.reasoning.length > 0) && (
        <div className="px-5 py-3" style={{ borderTop: "1px solid var(--c-border)", background: "var(--c-bg-subtle)" }}>
          {signal.risk_reward_ratio && (
            <div className="flex items-center gap-1.5 text-[12px] mb-2">
              <span className="text-muted-strong">리스크 대비 수익</span>
              <span className="font-mono tabular text-ink font-bold">1 : {signal.risk_reward_ratio}</span>
            </div>
          )}
          {signal.reasoning.length > 0 && (
            <ul className="space-y-1">
              {signal.reasoning.map((r, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-body-secondary leading-snug">
                  <span className="text-muted mt-[1px] flex-shrink-0">·</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
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
    <div className="bg-white rounded-[24px] border border-[var(--c-border)] overflow-hidden grid grid-cols-2">
      <div style={{ borderRight: "1px solid var(--c-border)" }}>
        <div
          className="px-4 py-2.5 text-[13px] font-bold text-ink flex items-center gap-1.5"
          style={{ borderBottom: "1px solid var(--c-border)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-trading-up" />
          지지선
        </div>
        {supports.length === 0 ? (
          <div className="px-4 py-6 text-center text-[12px] text-muted">감지된 지지선 없음</div>
        ) : (
          supports.map((l, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-2.5 gap-3"
              style={{ borderTop: i > 0 ? "1px solid var(--c-border)" : undefined }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono tabular text-[13px] text-ink font-bold">{formatKRW(l.price)}</span>
                {l.source && (
                  <span
                    className="text-[10px] text-muted-strong font-semibold px-1.5 py-[1px] rounded-[4px]"
                    style={{ background: "var(--c-bg-muted)" }}
                  >
                    {sourceLabel(l.source)}
                  </span>
                )}
              </div>
              <span className="font-mono tabular text-[11px] text-trading-down">{pct(l.price, cur)}</span>
            </div>
          ))
        )}
      </div>
      <div>
        <div
          className="px-4 py-2.5 text-[13px] font-bold text-ink flex items-center gap-1.5"
          style={{ borderBottom: "1px solid var(--c-border)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-trading-down" />
          저항선
        </div>
        {resistances.length === 0 ? (
          <div className="px-4 py-6 text-center text-[12px] text-muted">감지된 저항선 없음</div>
        ) : (
          resistances.map((l, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-2.5 gap-3"
              style={{ borderTop: i > 0 ? "1px solid var(--c-border)" : undefined }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono tabular text-[13px] text-ink font-bold">{formatKRW(l.price)}</span>
                {l.source && (
                  <span
                    className="text-[10px] text-muted-strong font-semibold px-1.5 py-[1px] rounded-[4px]"
                    style={{ background: "var(--c-bg-muted)" }}
                  >
                    {sourceLabel(l.source)}
                  </span>
                )}
              </div>
              <span className="font-mono tabular text-[11px] text-trading-up">{pct(l.price, cur)}</span>
            </div>
          ))
        )}
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
  onSelectStock?: (code: string, name: string) => void;
  chartOnly?: boolean;
  liveTick?: LiveTick | null;
  outlookSlotMain?: ReactNode;
  outlookSlotSidebar?: ReactNode;
  onRequestOutlook?: () => void;
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

export default function ChartAnalysisCard({ stockCode, stockName, onNameResolved, onBarHover, onBarClick, onSelectStock, chartOnly, liveTick, outlookSlotMain, outlookSlotSidebar, onRequestOutlook }: Props) {
  const [data, setData] = useState<ChartAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'similar' | 'outlook'>('chart');
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
    <div className="flex flex-col xl:flex-row items-start gap-6 relative">
      
      {/* ── 좌측 메인 영역 ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-6 w-full">
        {/* 탭 네비게이션 */}
        <div className="flex gap-6 px-2 border-b border-[var(--c-border)]">
          {[
            { id: 'chart', label: '차트 분석' },
            { id: 'similar', label: '유사 패턴' },
            { id: 'outlook', label: '전망 분석' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as 'chart' | 'similar' | 'outlook');
                if (tab.id === 'outlook') onRequestOutlook?.();
              }}
              className={`pb-3 text-[16px] md:text-[18px] font-bold transition-colors relative ${
                activeTab === tab.id ? 'text-ink' : 'text-muted hover:text-body'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-ink rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="bg-white rounded-[24px] border border-[var(--c-border)] overflow-hidden flex items-center justify-center gap-2 py-24 text-muted text-sm px-5">
            <span className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
            데이터를 불러오는 중…
          </div>
        )}

        {error && !loading && (
          <div className="bg-white rounded-[24px] border border-[var(--c-border)] overflow-hidden">
            <p className="text-trading-down text-[15px] font-medium py-6 px-6">{error}</p>
          </div>
        )}

        {data && !loading && (
          <>
            {activeTab === 'chart' && (
              <div className="bg-white rounded-[24px] border border-[var(--c-border)] flex flex-col overflow-hidden h-[460px] md:h-[540px] w-full">
                <div className="px-6 pt-6 pb-2 flex justify-between items-center">
                  <h3 className="text-[18px] font-bold text-ink tracking-tight">차트</h3>
                </div>
                <div className="px-6 pb-6 flex-1 min-h-0 relative">
                  <StockPriceChart
                    ohlcv={data.ohlcv}
                    todayBar={todayBar(data.ohlcv)}
                    supports={data.support_levels}
                    resistances={data.resistance_levels}
                    currentPrice={livePrice ?? data.current_price}
                    onBarHover={onBarHover}
                    onBarClick={onBarClick}
                  />
                </div>
              </div>
            )}

            {/* 전망 분석 (메인 영역 슬롯) */}
            {activeTab === 'outlook' && outlookSlotMain}

            {activeTab === 'similar' && (
              <SimilarPatternsCard stockCode={stockCode} ohlcv={data.ohlcv} onSelect={onSelectStock} />
            )}
          </>
        )}
      </div>

      {/* ── 우측 사이드바 영역 ── */}
      <div className="w-full xl:w-[340px] shrink-0 flex flex-col gap-6 xl:sticky xl:top-6">
        {data && !loading && (activeTab !== 'outlook' || !outlookSlotSidebar) && (
          <div className="flex flex-col gap-6">
            <SignalSummary data={data} livePrice={livePrice} />
            <LevelsTable data={data} livePrice={livePrice} />
          </div>
        )}

        {/* 전망 분석 (사이드바 슬롯) */}
        {activeTab === 'outlook' && outlookSlotSidebar && (
          <div className="flex flex-col gap-6">
            {outlookSlotSidebar}
          </div>
        )}
      </div>

    </div>
  );
}
