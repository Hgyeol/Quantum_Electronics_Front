import type { Evidence } from "@/lib/api";

interface Props {
  evidence: Evidence[];
}

const KIND_LABEL: Record<Evidence["kind"], string> = {
  news: "뉴스",
  disclosure: "공시",
  financial: "재무",
  market: "시장",
  quant: "퀀트",
};

export default function EvidenceList({ evidence }: Props) {
  if (evidence.length === 0) {
    return (
      <section className="rounded-xl bg-surface-card-dark border border-hairline-on-dark shadow-card p-6">
        <h2 className="text-sm uppercase tracking-widest text-muted mb-3">Evidence</h2>
        <p className="text-sm text-muted-strong">수집된 evidence가 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-surface-card-dark border border-hairline-on-dark shadow-card overflow-hidden">
      <header className="px-6 py-4 border-b border-hairline-on-dark flex items-baseline justify-between">
        <h2 className="text-sm uppercase tracking-widest text-muted">Evidence</h2>
        <span className="text-xs text-muted font-mono tabular">
          {evidence.length}건
        </span>
      </header>

      <ul className="divide-y divide-hairline-on-dark">
        {evidence.map((item) => (
          <li key={item.evidence_id} className="px-6 py-4">
            <div className="flex items-start gap-3">
              <span className="text-xs font-mono tabular bg-canvas-dark px-2 py-0.5 rounded-sm text-muted shrink-0 mt-0.5">
                {KIND_LABEL[item.kind]}
              </span>
              <div className="flex-1 min-w-0">
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-on-dark hover:text-primary block truncate"
                  >
                    {item.title}
                  </a>
                ) : (
                  <span className="text-sm text-on-dark block truncate">
                    {item.title}
                  </span>
                )}
                <div className="text-xs text-muted-strong mt-1 flex gap-3">
                  <span>{item.source}</span>
                  {item.published_at && (
                    <span className="font-mono tabular">
                      {item.published_at.slice(0, 10)}
                    </span>
                  )}
                  <span className="font-mono text-muted">{item.evidence_id}</span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
