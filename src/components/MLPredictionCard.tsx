import type { MLPrediction } from "@/lib/api";
import { formatProbability } from "@/lib/format";

interface Props {
  prediction: MLPrediction;
}

export default function MLPredictionCard({ prediction }: Props) {
  const pct = prediction.probability * 100;
  const isPositive = pct >= 50;
  const probColor = isPositive ? "text-trading-up" : "text-trading-down";

  return (
    <section className="rounded-xl bg-surface-card-dark border border-hairline-on-dark p-6">
      <header className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm uppercase tracking-widest text-muted">ML Prediction</h2>
        <span className="text-xs text-muted-strong font-mono">
          {prediction.model} · {prediction.features_version}
        </span>
      </header>

      <div className="flex flex-col gap-2 mb-6">
        <span className="text-xs uppercase tracking-wide text-muted">
          다음 거래일 상승 확률
        </span>
        <span className={`font-mono tabular text-5xl font-bold leading-none ${probColor}`}>
          {formatProbability(prediction.probability)}
        </span>
      </div>

      <div className="h-1 rounded-pill bg-canvas-dark overflow-hidden mb-6">
        <div
          className={`h-full ${isPositive ? "bg-trading-up" : "bg-trading-down"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-muted-strong leading-relaxed mb-5 italic">
        {prediction.explanation}
      </p>

      <div>
        <h3 className="text-xs uppercase tracking-widest text-muted mb-3">
          Top Feature Contributions
        </h3>
        <ul className="space-y-2">
          {prediction.top_contributions.map((c) => (
            <li
              key={c.feature}
              className="flex items-baseline justify-between text-sm"
            >
              <span className="font-mono text-on-dark">{c.feature}</span>
              <span
                className={`font-mono tabular ${
                  c.contribution >= 0 ? "text-trading-up" : "text-trading-down"
                }`}
              >
                {c.contribution >= 0 ? "+" : ""}
                {c.contribution.toFixed(4)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
