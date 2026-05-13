import type { QuantSignal, FinancialSignal, AISignal } from "@/lib/api";
import { directionClass, formatNumber, scoreClass } from "@/lib/format";

interface Props {
  quant: QuantSignal[];
  financial: FinancialSignal[];
  ai: AISignal[];
}

function ArrowGlyph({
  direction,
}: {
  direction: "positive" | "negative" | "neutral";
}) {
  if (direction === "positive") return <span className="text-trading-up">▲</span>;
  if (direction === "negative") return <span className="text-trading-down">▼</span>;
  return <span className="text-muted">·</span>;
}

export default function QuantSignalsTable({ quant, financial, ai }: Props) {
  return (
    <section className="rounded-xl bg-surface-card-dark border border-hairline-on-dark overflow-hidden">
      <header className="px-6 py-4 border-b border-hairline-on-dark">
        <h2 className="text-sm uppercase tracking-widest text-muted">Signals</h2>
      </header>

      <table className="w-full text-sm">
        <thead className="bg-canvas-dark text-muted">
          <tr>
            <th className="text-left px-6 py-3 font-medium">Signal</th>
            <th className="text-left px-2 py-3 font-medium">Source</th>
            <th className="text-right px-2 py-3 font-medium">Value</th>
            <th className="text-right px-6 py-3 font-medium">Score</th>
          </tr>
        </thead>
        <tbody>
          {quant.map((s, i) => (
            <tr key={`q-${i}`} className="border-t border-hairline-on-dark">
              <td className="px-6 py-3">
                <ArrowGlyph direction={s.direction} /> <span className="ml-2">{s.label}</span>
              </td>
              <td className="px-2 py-3 text-muted text-xs font-mono">{s.api_used}</td>
              <td className="px-2 py-3 text-right font-mono tabular text-on-dark">
                {formatNumber(s.value)}
              </td>
              <td className={`px-6 py-3 text-right font-mono tabular font-semibold ${scoreClass(s.score)}`}>
                {s.score > 0 ? `+${s.score}` : s.score}
              </td>
            </tr>
          ))}

          {financial.map((s, i) => (
            <tr key={`f-${i}`} className="border-t border-hairline-on-dark">
              <td className="px-6 py-3">
                <ArrowGlyph direction={s.direction} /> <span className="ml-2">{s.label}</span>
              </td>
              <td className="px-2 py-3 text-muted text-xs font-mono">{s.metric}</td>
              <td className="px-2 py-3 text-right font-mono tabular text-on-dark">
                {formatNumber(s.value)}
              </td>
              <td className={`px-6 py-3 text-right font-mono tabular font-semibold ${scoreClass(s.score)}`}>
                {s.score > 0 ? `+${s.score}` : s.score}
              </td>
            </tr>
          ))}

          {ai.map((s, i) => (
            <tr key={`a-${i}`} className="border-t border-hairline-on-dark">
              <td className="px-6 py-3">
                <ArrowGlyph direction={s.direction} />{" "}
                <span className="ml-2">LLM: {s.label}</span>
                <p className="ml-6 text-xs text-muted-strong leading-relaxed mt-1">
                  {s.summary}
                </p>
              </td>
              <td className="px-2 py-3 text-muted text-xs font-mono">gpt-5.2</td>
              <td className="px-2 py-3 text-right font-mono tabular text-on-dark">
                conf {s.confidence.toFixed(2)}
              </td>
              <td
                className={`px-6 py-3 text-right font-mono tabular font-semibold ${scoreClass(s.score)}`}
              >
                {s.score > 0 ? `+${s.score}` : s.score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
