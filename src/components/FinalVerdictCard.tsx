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

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
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
    <section className={`bg-white rounded-[24px] border border-[var(--c-border)] ${meta.border} overflow-hidden`}>
      {/* 상단 버딕트 바 (크게 강조) */}
      <div className={`${meta.bg} px-6 py-7 md:px-8 md:py-10 flex items-center justify-between gap-4`}>
        <div className="min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <span className={`text-[28px] md:text-[40px] font-bold leading-tight tracking-tight ${meta.text}`}>{meta.label}</span>
          </div>
          <span className="whitespace-nowrap text-[14px] md:text-[18px] font-medium text-muted-strong">{meta.sub}</span>
        </div>
        
        <div className="shrink-0 flex items-baseline gap-2 text-right md:block">
          <div className="whitespace-nowrap text-[12px] md:text-[15px] font-medium text-muted md:mb-1">합산 점수</div>
          <div className={`font-mono tabular-nums text-[42px] md:text-[72px] font-bold leading-none tracking-tight ${meta.text}`}>
            {score.total_score > 0 ? `+${score.total_score}` : score.total_score}
          </div>
        </div>
      </div>

      {/* AI 요약 (크게 강조) */}
      {(ai?.summary || autoSummary) && (
        <div className="px-6 py-8 md:px-8 md:py-10 border-t border-[var(--c-border)] space-y-3">
          {ai?.summary && (
            <p className="text-[17px] md:text-[20px] font-medium text-ink leading-relaxed break-keep">
              {ai.summary}
            </p>
          )}
          {autoSummary && (
            <p className="text-[15px] text-body leading-relaxed break-keep">{autoSummary}</p>
          )}
          {ai && (
            <div className="pt-2">
              <span className="text-[13px] text-muted font-mono font-medium px-3 py-1.5 rounded-lg bg-[var(--c-bg-subtle)]">
                gpt-5.2 · confidence {(ai.confidence * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* 점수 바 (하단에 배치) */}
      <div className="px-6 py-6 md:px-8 md:py-8 space-y-5 border-t border-[var(--c-border)] bg-[var(--c-bg-subtle)]/50">
        <ScoreBar label="Quant · 가격·수급 신호" score={score.quant_score} max={8} />
        <ScoreBar label="LLM · 공시·뉴스 해석" score={score.ai_score} max={8} />
        <ScoreBar label="Financial · 재무지표" score={score.financial_score} max={7} />
      </div>
    </section>
  );
}
