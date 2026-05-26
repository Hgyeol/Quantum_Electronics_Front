import type { AISignal, ScoreBreakdown } from "@/lib/api";

interface Props {
  score: ScoreBreakdown;
  ai: AISignal | undefined;
  autoSummary?: string | null;
}

type Direction = "positive" | "negative" | "neutral";

function verdictMeta(direction: Direction) {
  if (direction === "positive") return {
    label: "긍정적",
    sub: "상승 우세 신호",
    text: "text-trading-up",
    bg: "bg-trading-up/8",
    border: "border-trading-up/20",
    bar: "bg-trading-up",
    pill: "bg-trading-up/10 text-trading-up",
  };
  if (direction === "negative") return {
    label: "부정적",
    sub: "하락 우세 신호",
    text: "text-trading-down",
    bg: "bg-trading-down/8",
    border: "border-trading-down/20",
    bar: "bg-trading-down",
    pill: "bg-trading-down/10 text-trading-down",
  };
  return {
    label: "중립",
    sub: "방향성 불명확",
    text: "text-muted",
    bg: "bg-surface-elevated-dark",
    border: "border-hairline-on-dark",
    bar: "bg-muted",
    pill: "bg-surface-elevated-dark text-muted",
  };
}

function ScoreBar({ label, score, max = 4 }: { label: string; score: number; max?: number }) {
  const pct = Math.min(Math.abs(score) / max, 1) * 100;
  const color = score > 0 ? "bg-trading-up" : score < 0 ? "bg-trading-down" : "bg-muted";
  const textColor = score > 0 ? "text-trading-up" : score < 0 ? "text-trading-down" : "text-muted";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[13px] text-body">{label}</span>
        <span className={`font-mono tabular text-[13px] font-bold ${textColor}`}>
          {score > 0 ? `+${score}` : score}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-elevated-dark overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function FinalVerdictCard({ score, ai, autoSummary }: Props) {
  const meta = verdictMeta(score.direction);

  return (
    <section className={`bg-surface-card-dark rounded-xl shadow-card border ${meta.border} overflow-hidden`}>
      {/* 상단 버딕트 바 */}
      <div className={`${meta.bg} px-6 py-5 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold ${meta.text}`}>{meta.label}</span>
          <span className="text-sm text-muted">{meta.sub}</span>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted mb-0.5">합산 점수</div>
          <div className={`font-mono tabular text-4xl font-bold ${meta.text}`}>
            {score.total_score > 0 ? `+${score.total_score}` : score.total_score}
          </div>
        </div>
      </div>

      {/* 점수 바 */}
      <div className="px-6 py-5 space-y-4 border-t border-hairline-on-dark">
        <ScoreBar label="Quant · 가격·수급 신호" score={score.quant_score} max={4} />
        <ScoreBar label="LLM · 공시·뉴스 해석" score={score.ai_score} max={4} />
        <ScoreBar label="Financial · 재무지표" score={score.financial_score} max={4} />
      </div>

      {/* AI 요약 */}
      {(ai?.summary || autoSummary) && (
        <div className="px-6 pb-5 pt-1 border-t border-hairline-on-dark space-y-2">
          {ai?.summary && (
            <p className="text-[15px] text-ink leading-relaxed">{ai.summary}</p>
          )}
          {autoSummary && (
            <p className="text-sm text-body leading-relaxed">{autoSummary}</p>
          )}
          {ai && (
            <span className="text-xs text-muted font-mono">
              gpt-5.2 · confidence {(ai.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      )}
    </section>
  );
}
