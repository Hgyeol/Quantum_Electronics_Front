"use client";

import { useEffect, useState } from "react";
import { fetchChartAnalysis } from "@/lib/api";
import type { ChartAnalysis, SupportResistanceLevel } from "@/lib/api";
import { formatKRW } from "@/lib/format";

// ── helpers ──────────────────────────────────────────────────────────────────

function actionStyle(action: "buy" | "hold" | "sell") {
  if (action === "buy")
    return { label: "BUY", text: "text-trading-up", border: "border-trading-up", glow: "shadow-[0_0_30px_rgba(14,203,129,0.12)]" };
  if (action === "sell")
    return { label: "SELL", text: "text-trading-down", border: "border-trading-down", glow: "shadow-[0_0_30px_rgba(246,70,93,0.12)]" };
  return { label: "HOLD", text: "text-primary", border: "border-primary", glow: "" };
}

function confidenceLabel(c: "low" | "medium" | "high") {
  return { low: "낮음", medium: "보통", high: "높음" }[c];
}

function zoneStyle(zone: "oversold" | "neutral" | "overbought") {
  if (zone === "oversold") return "text-trading-up";
  if (zone === "overbought") return "text-trading-down";
  return "text-muted-strong";
}

function strengthDots(s: "weak" | "medium" | "strong") {
  const filled = { weak: 1, medium: 2, strong: 3 }[s];
  return (
    <span className="inline-flex gap-0.5 items-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`inline-block w-1.5 h-1.5 rounded-full ${i < filled ? "bg-primary" : "bg-surface-elevated-dark"}`}
        />
      ))}
    </span>
  );
}

function LevelRow({ level }: { level: SupportResistanceLevel }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-hairline-on-dark last:border-0">
      <span className="font-mono tabular text-sm text-on-dark">{formatKRW(level.price)}</span>
      <div className="flex items-center gap-3">
        {strengthDots(level.strength)}
        <span className="text-xs text-muted w-12 text-right">{level.touch_count}회 터치</span>
      </div>
    </div>
  );
}

function StatCell({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="font-mono tabular text-sm text-on-dark">{value ?? "—"}</span>
      {sub && <span className="text-xs text-muted-strong">{sub}</span>}
    </div>
  );
}

function IndicatorRow({
  label,
  value,
  zone,
  extra,
}: {
  label: string;
  value: React.ReactNode;
  zone?: "oversold" | "neutral" | "overbought" | null;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-hairline-on-dark last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted w-24">{label}</span>
      <span className={`font-mono tabular text-sm ${zone ? zoneStyle(zone) : "text-on-dark"}`}>
        {value ?? "—"}
      </span>
      {extra && <span className="text-xs text-muted-strong">{extra}</span>}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

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

  const style = data ? actionStyle(data.signal.action) : null;

  return (
    <section className={`rounded-xl bg-surface-card-dark border border-hairline-on-dark p-6 ${style?.glow ?? ""}`}>
      <header className="flex items-baseline justify-between mb-5">
        <h2 className="text-sm uppercase tracking-widest text-muted">Chart Analysis</h2>
        {data && (
          <span className="text-xs text-muted-strong font-mono">
            {stockName ?? stockCode} · {data.analysis_period_days}일 분석
          </span>
        )}
      </header>

      {/* loading */}
      {loading && (
        <div className="flex items-center gap-2 py-8 justify-center text-muted-strong text-sm">
          <span className="inline-block w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
          차트 분석 중…
        </div>
      )}

      {/* error */}
      {error && !loading && (
        <p className="text-trading-down text-sm py-4">{error}</p>
      )}

      {/* content */}
      {data && !loading && (
        <div className="space-y-6">

          {/* ── Signal ─────────────────────────────────────────────────── */}
          <div className={`rounded-lg border ${style!.border} p-4`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-3xl font-bold tracking-tight ${style!.text}`}>
                {style!.label}
              </span>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-muted uppercase tracking-wide">신뢰도</span>
                <span className={`text-sm font-semibold ${style!.text}`}>
                  {confidenceLabel(data.signal.confidence)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCell
                label="진입구간"
                value={
                  data.signal.entry_zone_low && data.signal.entry_zone_high
                    ? `${formatKRW(data.signal.entry_zone_low)} ~ ${formatKRW(data.signal.entry_zone_high)}`
                    : "—"
                }
              />
              <StatCell label="손절가" value={data.signal.stop_loss ? formatKRW(data.signal.stop_loss) : "—"} />
              <StatCell label="1차 목표" value={data.signal.primary_target ? formatKRW(data.signal.primary_target) : "—"} />
              <StatCell
                label="리스크/리워드"
                value={data.signal.risk_reward_ratio ? `1 : ${data.signal.risk_reward_ratio}` : "—"}
                sub={data.signal.secondary_target ? `2차목표 ${formatKRW(data.signal.secondary_target)}` : undefined}
              />
            </div>

            {data.signal.reasoning.length > 0 && (
              <ul className="mt-4 space-y-1">
                {data.signal.reasoning.map((r, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-strong">
                    <span className={`mt-0.5 flex-shrink-0 ${style!.text}`}>›</span>
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Indicators + Levels ────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* indicators */}
            <div>
              <h3 className="text-xs uppercase tracking-widest text-muted mb-3">보조지표</h3>
              <div>
                <IndicatorRow
                  label="RSI (14)"
                  value={data.indicators.rsi?.toFixed(1)}
                  zone={data.indicators.rsi_zone}
                  extra={data.indicators.rsi_zone === "oversold" ? "과매도" : data.indicators.rsi_zone === "overbought" ? "과매수" : "중립"}
                />
                <IndicatorRow
                  label="MACD"
                  value={data.indicators.macd?.toFixed(0)}
                  zone={
                    data.indicators.macd_crossover === "bullish" ? "oversold"
                      : data.indicators.macd_crossover === "bearish" ? "overbought"
                      : null
                  }
                  extra={
                    data.indicators.macd_crossover !== "none"
                      ? data.indicators.macd_crossover === "bullish" ? "골든크로스 ↑" : "데드크로스 ↓"
                      : `히스트 ${data.indicators.macd_histogram?.toFixed(0) ?? "—"}`
                  }
                />
                <IndicatorRow
                  label="Bollinger"
                  value={(() => {
                    const pos = data.indicators.bb_position;
                    const map: Record<string, string> = {
                      above_upper: "상단 돌파", near_upper: "상단 근접",
                      middle: "중간대", near_lower: "하단 근접", below_lower: "하단 이탈",
                    };
                    return map[pos] ?? pos;
                  })()}
                  zone={
                    data.indicators.bb_position === "below_lower" || data.indicators.bb_position === "near_lower"
                      ? "oversold"
                      : data.indicators.bb_position === "above_upper" || data.indicators.bb_position === "near_upper"
                      ? "overbought"
                      : null
                  }
                  extra={`상${formatKRW(data.indicators.bb_upper ?? 0)} 하${formatKRW(data.indicators.bb_lower ?? 0)}`}
                />
                <IndicatorRow
                  label="Stoch (14)"
                  value={`K ${data.indicators.stoch_k?.toFixed(1) ?? "—"} / D ${data.indicators.stoch_d?.toFixed(1) ?? "—"}`}
                  zone={data.indicators.stoch_zone}
                  extra={data.indicators.stoch_zone === "oversold" ? "과매도" : data.indicators.stoch_zone === "overbought" ? "과매수" : "중립"}
                />
              </div>
            </div>

            {/* support / resistance */}
            <div>
              <h3 className="text-xs uppercase tracking-widest text-muted mb-3">지지 / 저항선</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-trading-up mb-2">지지선 ↑</p>
                  {data.support_levels.length === 0
                    ? <p className="text-xs text-muted-strong">탐지된 레벨 없음</p>
                    : data.support_levels.map((l, i) => <LevelRow key={i} level={l} />)
                  }
                </div>
                <div>
                  <p className="text-xs text-trading-down mb-2">저항선 ↓</p>
                  {data.resistance_levels.length === 0
                    ? <p className="text-xs text-muted-strong">탐지된 레벨 없음</p>
                    : data.resistance_levels.map((l, i) => <LevelRow key={i} level={l} />)
                  }
                </div>
              </div>
            </div>
          </div>

          {/* ── disclaimer ──────────────────────────────────────────────── */}
          <p className="text-xs text-muted border-t border-hairline-on-dark pt-3">{data.disclaimer}</p>
        </div>
      )}
    </section>
  );
}
