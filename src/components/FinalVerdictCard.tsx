import type { AISignal, ScoreBreakdown } from "@/lib/api";

interface Props {
  score: ScoreBreakdown;
  ai: AISignal | undefined;
  autoSummary?: string | null;
}

type Direction = "positive" | "negative" | "neutral";

function verdictMeta(direction: Direction) {
  if (direction === "positive") return {
    label: "POSITIVE",
    sub: "상승 우세",
    text: "text-trading-up",
    glow: "shadow-[0_0_60px_-10px_rgba(14,203,129,0.35)]",
    border: "border-trading-up/20",
    bar: "bg-trading-up",
  };
  if (direction === "negative") return {
    label: "NEGATIVE",
    sub: "하락 우세",
    text: "text-trading-down",
    glow: "shadow-[0_0_60px_-10px_rgba(246,70,93,0.35)]",
    border: "border-trading-down/20",
    bar: "bg-trading-down",
  };
  return {
    label: "NEUTRAL",
    sub: "방향성 불명확",
    text: "text-muted-strong",
    glow: "",
    border: "border-hairline-on-dark",
    bar: "bg-muted",
  };
}

function ScoreBar({ label, score, max = 4 }: { label: string; score: number; max?: number }) {
  const pct = Math.min(Math.abs(score) / max, 1) * 100;
  const color = score > 0 ? "bg-trading-up" : score < 0 ? "bg-trading-down" : "bg-muted";
  const textColor = score > 0 ? "text-trading-up" : score < 0 ? "text-trading-down" : "text-muted-strong";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-muted">{label}</span>
        <span className={`font-mono tabular text-sm font-bold ${textColor}`}>
          {score > 0 ? `+${score}` : score}
        </span>
      </div>
      <div className="h-1 rounded-full bg-surface-elevated-dark overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function FinalVerdictCard({ score, ai, autoSummary }: Props) {
  const meta = verdictMeta(score.direction);

  return (
    <section className={`rounded-xl bg-surface-card-dark border ${meta.border} p-6 ${meta.glow}`}>
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        {/* 왼쪽: 버딕트 + 총점 */}
        <div className="flex items-center gap-5 md:border-r md:border-hairline-on-dark md:pr-8">
          <div className={`w-1.5 self-stretch rounded-full ${meta.bar}`} />
          <div>
            <div className={`text-4xl font-bold tracking-tight ${meta.text}`}>{meta.label}</div>
            <div className="text-xs text-muted mt-1">{meta.sub}</div>
          </div>
          <div className="ml-4 text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted mb-1">합산</div>
            <div className={`font-mono tabular text-5xl font-bold leading-none ${meta.text}`}>
              {score.total_score > 0 ? `+${score.total_score}` : score.total_score}
            </div>
          </div>
        </div>

        {/* 오른쪽: 점수 바 */}
        <div className="flex-1 grid grid-cols-1 gap-3 md:pl-2">
          <ScoreBar label="Quant (가격·수급)" score={score.quant_score} max={4} />
          <ScoreBar label="LLM (공시·뉴스 해석)" score={score.ai_score} max={4} />
          <ScoreBar label="Financial (재무지표)" score={score.financial_score} max={4} />
        </div>
      </div>

      {(ai?.summary || autoSummary) && (
        <div className="mt-5 pt-5 border-t border-hairline-on-dark space-y-2">
          {ai?.summary && (
            <p className="text-[15px] text-on-dark leading-relaxed">
              <span className={`font-semibold ${meta.text}`}>AI 해석 — </span>
              {ai.summary}
            </p>
          )}
          {autoSummary && (
            <p className="text-sm text-muted-strong leading-relaxed">{autoSummary}</p>
          )}
          {ai && (
            <div className="text-[11px] text-muted font-mono mt-1">
              gpt-5.2 · confidence {(ai.confidence * 100).toFixed(0)}%
            </div>
          )}
        </div>
      )}
    </section>
  );
}
