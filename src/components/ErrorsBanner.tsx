import type { AnalysisError } from "@/lib/api";

interface Props {
  errors: AnalysisError[];
}

export default function ErrorsBanner({ errors }: Props) {
  if (errors.length === 0) return null;
  return (
    <section className="rounded-lg border border-hairline-on-dark bg-canvas-dark p-4">
      <h3 className="text-xs uppercase tracking-widest text-muted mb-2">
        Partial Failures ({errors.length})
      </h3>
      <ul className="space-y-1 text-xs">
        {errors.map((err, i) => (
          <li key={i} className="flex gap-2 font-mono">
            <span className="text-trading-down shrink-0">[{err.source}]</span>
            <span className="text-muted-strong">{err.code}</span>
            <span className="text-muted truncate">— {err.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
