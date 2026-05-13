import type { AISignal, ScoreBreakdown } from "@/lib/api";

interface Props {
  score: ScoreBreakdown;
  ai: AISignal | undefined;
  autoSummary?: string | null;
}

function directionStyle(direction: "positive" | "negative" | "neutral") {
  if (direction === "positive")
    return {
      label: "POSITIVE",
      caption: "다음 거래일 상승 우세",
      text: "text-trading-up",
      bg: "bg-trading-up",
      glow: "shadow-[0_0_40px_rgba(14,203,129,0.15)]",
    };
  if (direction === "negative")
    return {
      label: "NEGATIVE",
      caption: "다음 거래일 하락 우세",
      text: "text-trading-down",
      bg: "bg-trading-down",
      glow: "shadow-[0_0_40px_rgba(246,70,93,0.15)]",
    };
  return {
    label: "NEUTRAL",
    caption: "방향성 정렬 어려움",
    text: "text-muted-strong",
    bg: "bg-muted",
    glow: "",
  };
}

function ComponentCell({
  label,
  score,
  caption,
}: {
  label: string;
  score: number;
  caption: string;
}) {
  const color =
    score > 0
      ? "text-trading-up"
      : score < 0
        ? "text-trading-down"
        : "text-muted-strong";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className={`font-mono tabular text-2xl font-bold leading-none ${color}`}>
        {score > 0 ? `+${score}` : score}
      </span>
      <span className="text-xs text-muted-strong">{caption}</span>
    </div>
  );
}

export default function FinalVerdictCard({ score, ai, autoSummary }: Props) {
  const style = directionStyle(score.direction);
  const quantPlusAI = score.quant_score + score.ai_score;

  return (
    <section
      className={`rounded-xl bg-surface-card-dark border border-hairline-on-dark p-8 ${style.glow}`}
    >
      <header className="flex items-baseline justify-between mb-6">
        <h2 className="text-sm uppercase tracking-widest text-muted">
          Final Verdict
        </h2>
        <span className="text-xs text-muted-strong font-mono">
          Quant + LLM + Financial 종합
        </span>
      </header>

      <div className="flex flex-wrap items-end gap-6 mb-8">
        <div className="flex flex-col gap-1">
          <span className={`text-5xl font-bold tracking-tight ${style.text}`}>
            {style.label}
          </span>
          <span className="text-xs text-muted">{style.caption}</span>
        </div>
        <div className="flex flex-col gap-1 ml-auto items-end">
          <span className="text-xs uppercase tracking-wide text-muted">
            합산 점수
          </span>
          <span
            className={`font-mono tabular text-6xl font-bold leading-none ${style.text}`}
          >
            {score.total_score >= 0 ? `+${score.total_score}` : score.total_score}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-6 border-b border-hairline-on-dark">
        <ComponentCell
          label="Quant"
          score={score.quant_score}
          caption="가격·수급 5개"
        />
        <ComponentCell
          label="LLM"
          score={score.ai_score}
          caption="공시·재무 해석"
        />
        <ComponentCell
          label="Quant + LLM"
          score={quantPlusAI}
          caption="시장+해석 소계"
        />
        <ComponentCell
          label="Financial"
          score={score.financial_score}
          caption="재무지표 점수"
        />
      </div>

      <div className="mt-6 space-y-3">
        {ai?.summary && (
          <blockquote className="border-l-2 border-primary pl-4 py-1 text-on-dark text-base leading-relaxed">
            {ai.summary}
            <span className="block text-xs text-muted-strong mt-2 font-mono">
              — gpt-5.2 · confidence {(ai.confidence * 100).toFixed(0)}%
            </span>
          </blockquote>
        )}
        {autoSummary && (
          <p className="text-sm text-muted-strong leading-relaxed">
            {autoSummary}
          </p>
        )}
      </div>
    </section>
  );
}
