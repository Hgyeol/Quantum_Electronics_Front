import type { AISignal, QuantSignal } from "@/lib/api";
import { formatNumber, scoreClass } from "@/lib/format";

interface Props {
  quant: QuantSignal[];
  ai: AISignal[];
}

function arrow(direction: "positive" | "negative" | "neutral") {
  if (direction === "positive")
    return <span className="text-trading-up">▲</span>;
  if (direction === "negative")
    return <span className="text-trading-down">▼</span>;
  return <span className="text-muted">·</span>;
}

function signScore(score: number) {
  return score > 0 ? `+${score}` : String(score);
}

function quantInterpretation(label: string, value: number | null): string {
  if (value === null) return "데이터 없음";
  if (label.includes("골든크로스"))
    return value > 0
      ? "MA5 > MA20 상향 돌파"
      : value < 0
        ? "MA5 < MA20 하향 돌파"
        : "교차 없음";
  if (label.includes("이격도")) {
    if (value < 90) return `현재가/MA20 = ${value.toFixed(1)} · <90 과매도`;
    if (value > 110) return `현재가/MA20 = ${value.toFixed(1)} · >110 과매수`;
    return `현재가/MA20 = ${value.toFixed(1)} · 90~110 중립`;
  }
  if (label.includes("모멘텀")) {
    const pct = value.toFixed(1);
    if (value >= 30) return `60d return +${pct}% · ≥+30% 강세`;
    if (value <= -20) return `60d return ${pct}% · ≤-20% 약세`;
    return `60d return ${value >= 0 ? "+" : ""}${pct}% · 중립 구간`;
  }
  if (label.includes("외인")) {
    if (value > 0) return `3D 누적 순매수 +${formatNumber(value)} 주`;
    if (value < 0) return `3D 누적 순매도 ${formatNumber(value)} 주`;
    return "3D 누적 0";
  }
  if (label.includes("거래량")) {
    if (value >= 2) return `당일/20MA = ${value.toFixed(2)} · ≥2 급증`;
    if (value <= 0.5) return `당일/20MA = ${value.toFixed(2)} · ≤0.5 위축`;
    return `당일/20MA = ${value.toFixed(2)} · 정상`;
  }
  return "";
}

export default function SignalBreakdownPanel({ quant, ai }: Props) {
  return (
    <section className="rounded-2xl bg-white border border-[var(--c-border)] overflow-hidden">
      <header className="px-6 py-4 border-b border-hairline-on-dark">
        <h2 className="text-[15px] font-bold text-ink">
          시그널 상세
        </h2>
        <p className="text-xs text-muted-strong mt-1">
          Quant 5개 지표 · LLM 1개 해석. Final Verdict 점수 구성.
        </p>
      </header>

      <div className="px-6 py-5">
        <div className="flex items-baseline gap-3 mb-2">
          <h3 className="text-[13px] font-bold text-ink">
            퀀트 지표
          </h3>
          <span className="text-[11px] text-muted-strong font-mono">
            가격·수급 · KIS
          </span>
        </div>
        {quant.length === 0 ? (
          <p className="text-xs text-muted-strong py-3">
            집계된 퀀트 신호가 없습니다.
          </p>
        ) : (
          <ul>
            {quant.map((s, i) => (
              <li
                key={`q-${i}`}
                className="grid grid-cols-[14px_1fr_auto_44px] items-baseline gap-4 py-2 border-t border-hairline-on-dark/60 first:border-t-0"
              >
                <span className="text-xs leading-none">{arrow(s.direction)}</span>
                <div className="min-w-0">
                  <span className="text-sm text-on-dark">{s.label}</span>
                  <span className="text-[11px] text-muted-strong ml-2">
                    {quantInterpretation(s.label, s.value)}
                  </span>
                </div>
                <span className="font-mono tabular text-sm text-muted-strong text-right">
                  {formatNumber(s.value)}
                </span>
                <span
                  className={`font-mono tabular text-sm font-semibold text-right ${scoreClass(
                    s.score,
                  )}`}
                >
                  {signScore(s.score)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-6 py-5 border-t border-hairline-on-dark">
        <div className="flex items-baseline gap-3 mb-2">
          <h3 className="text-[13px] font-bold text-ink">
            AI 해석
          </h3>
          <span className="text-[11px] text-muted-strong font-mono">
            gpt-5.2 · 공시·재무 해석
          </span>
        </div>
        {ai.length === 0 ? (
          <p className="text-xs text-muted-strong py-3">LLM 신호가 없습니다.</p>
        ) : (
          <ul>
            {ai.map((s, i) => (
              <li
                key={`a-${i}`}
                className="grid grid-cols-[14px_1fr_auto_44px] items-baseline gap-4 py-2 border-t border-hairline-on-dark/60 first:border-t-0"
              >
                <span className="text-xs leading-none">{arrow(s.direction)}</span>
                <div className="min-w-0">
                  <span className="text-sm text-on-dark">{s.label}</span>
                  <span className="text-[11px] text-muted-strong ml-2">
                    evidence {s.evidence_ids.length}건
                  </span>
                </div>
                <span className="font-mono tabular text-sm text-muted-strong text-right">
                  conf {(s.confidence * 100).toFixed(0)}%
                </span>
                <span
                  className={`font-mono tabular text-sm font-semibold text-right ${scoreClass(
                    s.score,
                  )}`}
                >
                  {signScore(s.score)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
