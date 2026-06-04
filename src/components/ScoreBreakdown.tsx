import type { ScoreBreakdown as ScoreBreakdownT } from "@/lib/api";
import { directionClass } from "@/lib/format";

interface Props {
  score: ScoreBreakdownT;
  summary?: string | null;
}

function StatCell({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  const colorClass =
    value > 0 ? "text-trading-up" : value < 0 ? "text-trading-down" : "text-muted-strong";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span
        className={`font-mono tabular leading-none ${
          emphasis ? "text-5xl font-bold" : "text-3xl font-semibold"
        } ${emphasis ? "text-primary" : colorClass}`}
      >
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
}

export default function ScoreBreakdown({ score, summary }: Props) {
  return (
    <section className="rounded-xl bg-surface-card-dark border border-hairline-on-dark p-8">
      <div className="flex items-baseline gap-3 mb-6">
        <h2 className="text-sm uppercase tracking-widest text-muted">Rule Score</h2>
        <span className={`text-xs ${directionClass(score.direction)}`}>
          {score.direction.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <StatCell label="Total" value={score.total_score} emphasis />
        <StatCell label="Quant" value={score.quant_score} />
        <StatCell label="LLM" value={score.ai_score} />
        <StatCell label="Financial" value={score.financial_score} />
      </div>

      {summary && (
        <p className="mt-6 text-sm text-muted-strong leading-relaxed border-t border-hairline-on-dark pt-4">
          {summary}
        </p>
      )}
    </section>
  );
}
