import type { AISignal } from "@/lib/api";

interface Props {
  signal: AISignal | undefined;
}

function directionStyle(direction: "positive" | "negative" | "neutral") {
  if (direction === "positive")
    return {
      label: "POSITIVE",
      color: "text-trading-up",
      bar: "bg-trading-up",
    };
  if (direction === "negative")
    return {
      label: "NEGATIVE",
      color: "text-trading-down",
      bar: "bg-trading-down",
    };
  return {
    label: "NEUTRAL",
    color: "text-muted-strong",
    bar: "bg-muted",
  };
}

export default function LLMSummaryCard({ signal }: Props) {
  if (!signal) return null;
  const style = directionStyle(signal.direction);
  const confidencePct = Math.round(signal.confidence * 100);

  return (
    <section className="rounded-xl bg-surface-card-dark border border-hairline-on-dark p-6">
      <header className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm uppercase tracking-widest text-muted">
          AI Outlook
        </h2>
        <span className="text-xs text-muted-strong font-mono">
          gpt-5.2 · {signal.evidence_ids.length} evidence
        </span>
      </header>

      <div className="flex items-baseline gap-3 mb-4">
        <span className={`text-2xl font-bold tracking-tight ${style.color}`}>
          {style.label}
        </span>
        <span className={`text-xs ${style.color}`}>
          원점수{" "}
          <span className="font-mono tabular">
            {signal.score >= 0 ? `+${signal.score}` : signal.score}
          </span>
        </span>
      </div>

      <blockquote className="border-l-2 border-primary pl-4 py-1 text-on-dark text-base leading-relaxed">
        {signal.summary}
      </blockquote>

      <div className="mt-5 flex items-center gap-3">
        <span className="text-xs uppercase tracking-wide text-muted shrink-0">
          confidence
        </span>
        <div className="flex-1 h-1 rounded-pill bg-canvas-dark overflow-hidden">
          <div
            className={`h-full ${style.bar}`}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
        <span className="font-mono tabular text-sm text-muted-strong">
          {(signal.confidence * 100).toFixed(0)}%
        </span>
      </div>
    </section>
  );
}
