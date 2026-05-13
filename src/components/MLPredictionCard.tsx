import type { MLPrediction } from "@/lib/api";
import { formatProbability } from "@/lib/format";

interface Props {
  prediction: MLPrediction;
}

const MODEL_TRAINING_NOTE =
  "logistic_regression_v1 · 학습 3종목 × 154 거래일 · validation precision 0.56";

function ConflictBanner({
  ruleDirection,
  mlIsPositive,
}: {
  ruleDirection: "positive" | "negative" | "neutral";
  mlIsPositive: boolean;
}) {
  // No conflict if rule is neutral (it doesn't take a side).
  if (ruleDirection === "neutral") return null;
  const ruleIsPositive = ruleDirection === "positive";
  if (ruleIsPositive === mlIsPositive) return null;
  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 mb-6">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-primary text-sm font-bold tracking-wide">⚠ RULE vs ML 충돌</span>
      </div>
      <p className="text-xs text-muted-strong leading-relaxed">
        규칙 기반 점수는 <span className={ruleIsPositive ? "text-trading-up" : "text-trading-down"}>
          {ruleIsPositive ? "POSITIVE" : "NEGATIVE"}
        </span>{" "}
        인데 ML 확률은{" "}
        <span className={mlIsPositive ? "text-trading-up" : "text-trading-down"}>
          {mlIsPositive ? "POSITIVE" : "NEGATIVE"}
        </span>{" "}
        쪽이에요. 학습 데이터 universe 밖 종목이거나 모델이 보지 못한 패턴일 가능성. 해석에 주의.
      </p>
    </div>
  );
}

export default function MLPredictionCard({ prediction }: Props) {
  const pct = prediction.probability * 100;
  const isPositive = pct >= 50;
  const probColor = isPositive ? "text-trading-up" : "text-trading-down";
  const ruleColor =
    prediction.rule_score > 0
      ? "text-trading-up"
      : prediction.rule_score < 0
        ? "text-trading-down"
        : "text-muted-strong";

  const isConflict =
    prediction.rule_direction !== "neutral" &&
    (prediction.rule_direction === "positive") !== isPositive;

  return (
    <section
      className={`rounded-xl bg-surface-card-dark border p-6 ${
        isConflict ? "border-primary/60" : "border-hairline-on-dark"
      }`}
    >
      <header className="flex items-baseline justify-between mb-6">
        <h2 className="text-sm uppercase tracking-widest text-muted">
          ML Prediction
        </h2>
        <span className="text-xs text-muted-strong font-mono">
          {prediction.model} · {prediction.features_version}
        </span>
      </header>

      <ConflictBanner
        ruleDirection={prediction.rule_direction}
        mlIsPositive={isPositive}
      />

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: probability + bar + rule comparison */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-muted">
              다음 거래일 상승 확률
            </span>
            <span
              className={`font-mono tabular text-6xl font-bold leading-none ${probColor}`}
            >
              {formatProbability(prediction.probability)}
            </span>
          </div>

          <div className="h-1.5 rounded-pill bg-canvas-dark overflow-hidden">
            <div
              className={`h-full ${
                isPositive ? "bg-trading-up" : "bg-trading-down"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-hairline-on-dark">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">
                ML 방향
              </span>
              <span className={`font-mono tabular text-lg font-semibold ${probColor}`}>
                {isPositive ? "POSITIVE" : "NEGATIVE"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">
                Rule 방향
              </span>
              <span
                className={`font-mono tabular text-lg font-semibold ${ruleColor}`}
              >
                {prediction.rule_direction.toUpperCase()}{" "}
                <span className="text-xs text-muted-strong">
                  ({prediction.rule_score >= 0 ? "+" : ""}
                  {prediction.rule_score})
                </span>
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-strong leading-relaxed italic">
            {prediction.explanation}
          </p>
        </div>

        {/* Right: feature contributions */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-muted mb-3">
            Top Feature Contributions
          </h3>
          {prediction.top_contributions.length === 0 ? (
            <p className="text-sm text-muted-strong">
              기여도 데이터가 없습니다.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {prediction.top_contributions.map((c) => {
                const isPos = c.contribution >= 0;
                const magnitude = Math.min(
                  1,
                  Math.abs(c.contribution) /
                    Math.max(
                      ...prediction.top_contributions.map((x) =>
                        Math.abs(x.contribution),
                      ),
                      1e-6,
                    ),
                );
                return (
                  <li key={c.feature} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-mono text-on-dark text-xs">
                        {c.feature}
                      </span>
                      <span
                        className={`font-mono tabular text-xs ${
                          isPos ? "text-trading-up" : "text-trading-down"
                        }`}
                      >
                        {isPos ? "+" : ""}
                        {c.contribution.toFixed(4)}
                      </span>
                    </div>
                    <div className="h-1 rounded-pill bg-canvas-dark overflow-hidden">
                      <div
                        className={`h-full ${
                          isPos ? "bg-trading-up" : "bg-trading-down"
                        }`}
                        style={{ width: `${magnitude * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <footer className="mt-6 pt-4 border-t border-hairline-on-dark">
        <p className="text-xs text-muted font-mono">{MODEL_TRAINING_NOTE}</p>
      </footer>
    </section>
  );
}
