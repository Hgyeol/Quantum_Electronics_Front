"use client";

import { useState, useMemo } from "react";
import type {
  AISignal,
  Evidence,
  FinancialSignal,
  QuantSignal,
} from "@/lib/api";
import { formatNumber, scoreClass } from "@/lib/format";

interface Props {
  quant: QuantSignal[];
  financial: FinancialSignal[];
  ai: AISignal[];
  evidence: Evidence[];
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

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      className={`inline-block text-muted-strong transition-transform duration-150 ${
        open ? "rotate-90" : ""
      }`}
    >
      ▶
    </span>
  );
}

const KIND_LABEL: Record<Evidence["kind"], string> = {
  news: "뉴스",
  disclosure: "공시",
  financial: "재무",
  market: "시장",
  quant: "퀀트",
};

function EvidenceRefList({
  evidenceIds,
  evidenceById,
}: {
  evidenceIds: string[];
  evidenceById: Map<string, Evidence>;
}) {
  if (evidenceIds.length === 0) {
    return (
      <p className="text-xs text-muted-strong">근거 evidence가 없습니다.</p>
    );
  }
  return (
    <ul className="space-y-2">
      {evidenceIds.map((id) => {
        const item = evidenceById.get(id);
        if (!item) {
          return (
            <li
              key={id}
              className="text-xs text-muted-strong font-mono flex gap-2"
            >
              <span className="text-trading-down shrink-0">[missing]</span>
              {id}
            </li>
          );
        }
        return (
          <li key={id} className="flex items-start gap-2 text-sm">
            <span className="text-xs font-mono tabular bg-canvas-dark px-2 py-0.5 rounded-sm text-muted shrink-0 mt-0.5">
              {KIND_LABEL[item.kind]}
            </span>
            <div className="flex-1 min-w-0">
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-on-dark hover:text-primary block truncate"
                >
                  {item.title}
                </a>
              ) : (
                <span className="text-on-dark block truncate">
                  {item.title}
                </span>
              )}
              <div className="text-xs text-muted-strong mt-0.5 flex gap-3">
                <span>{item.source}</span>
                {item.published_at && (
                  <span className="font-mono tabular">
                    {item.published_at.slice(0, 10)}
                  </span>
                )}
                <span className="font-mono text-muted">{id}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function QuantDetail({ signal }: { signal: QuantSignal }) {
  // Pretty-print quant calculation hint based on label.
  let interpretation = "";
  if (signal.label.includes("골든크로스")) {
    interpretation = "단기(MA5) > 장기(MA20) 상향 돌파(+2) / 하향 돌파(-2). 그 외 중립.";
  } else if (signal.label.includes("이격도")) {
    interpretation = "현재가 / MA20 × 100. <90 과매도(+2), >110 과매수(-2), 그 외 중립.";
  } else if (signal.label.includes("모멘텀")) {
    interpretation = "60일 수익률. ≥+30%(+1) / ≤-20%(-1) / 그 외 중립.";
  } else if (signal.label.includes("외인")) {
    interpretation = "최근 3 거래일 외국인 순매수 합. >0 positive(+2), <0 negative(-2), 0 중립.";
  } else if (signal.label.includes("거래량")) {
    interpretation = "당일 거래량 / 20일 평균. ≥2.0 급증(+1), ≤0.5 위축(-1), 그 외 중립.";
  }

  return (
    <div className="bg-canvas-dark border border-hairline-on-dark rounded-lg p-4 space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted text-xs uppercase tracking-wide">측정값</span>
        <span className="font-mono tabular text-on-dark">
          {formatNumber(signal.value)}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted text-xs uppercase tracking-wide">KIS API</span>
        <span className="font-mono text-muted-strong text-xs">{signal.api_used}</span>
      </div>
      {interpretation && (
        <p className="text-xs text-muted-strong leading-relaxed pt-2 border-t border-hairline-on-dark">
          {interpretation}
        </p>
      )}
    </div>
  );
}

function FinancialDetail({
  signal,
  evidenceById,
}: {
  signal: FinancialSignal;
  evidenceById: Map<string, Evidence>;
}) {
  const thresholds: Record<string, string> = {
    revenue_growth: "≥5% positive(+1), ≤-5% negative(-1)",
    operating_margin: "≥10% positive(+2), ≤3% negative(-2)",
    debt_ratio: "≤100% positive(+2), ≥200% negative(-2) (낮을수록 좋음)",
    roe: "≥10% positive(+2), ≤0% negative(-2)",
    net_income: ">0 positive(+1), <0 negative(-1)",
  };
  return (
    <div className="bg-canvas-dark border border-hairline-on-dark rounded-lg p-4 space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex justify-between">
          <span className="text-muted text-xs uppercase tracking-wide">측정값</span>
          <span className="font-mono tabular text-on-dark">
            {formatNumber(signal.value)}
            {signal.metric === "net_income" ? "" : "%"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted text-xs uppercase tracking-wide">Metric</span>
          <span className="font-mono text-muted-strong text-xs">{signal.metric}</span>
        </div>
      </div>
      {thresholds[signal.metric] && (
        <p className="text-xs text-muted-strong border-t border-hairline-on-dark pt-2">
          기준: {thresholds[signal.metric]}
        </p>
      )}
      {signal.reason && (
        <p className="text-xs text-muted-strong">사유: {signal.reason}</p>
      )}
      {signal.evidence_ids && signal.evidence_ids.length > 0 && (
        <div className="pt-2 border-t border-hairline-on-dark">
          <span className="text-xs uppercase tracking-wide text-muted block mb-2">
            근거 Evidence
          </span>
          <EvidenceRefList
            evidenceIds={signal.evidence_ids}
            evidenceById={evidenceById}
          />
        </div>
      )}
    </div>
  );
}

function AIDetail({
  signal,
  evidenceById,
}: {
  signal: AISignal;
  evidenceById: Map<string, Evidence>;
}) {
  return (
    <div className="bg-canvas-dark border border-hairline-on-dark rounded-lg p-4 space-y-3 text-sm">
      <div>
        <span className="text-xs uppercase tracking-wide text-muted block mb-1">
          LLM 요약
        </span>
        <p className="text-on-dark leading-relaxed">{signal.summary}</p>
      </div>
      <div className="flex justify-between border-t border-hairline-on-dark pt-2">
        <span className="text-xs text-muted">Confidence</span>
        <span className="font-mono tabular text-muted-strong">
          {signal.confidence.toFixed(2)}
        </span>
      </div>
      <div className="border-t border-hairline-on-dark pt-2">
        <span className="text-xs uppercase tracking-wide text-muted block mb-2">
          참조 Evidence ({signal.evidence_ids.length}건)
        </span>
        <EvidenceRefList
          evidenceIds={signal.evidence_ids}
          evidenceById={evidenceById}
        />
      </div>
    </div>
  );
}

export default function QuantSignalsTable({
  quant,
  financial,
  ai,
  evidence,
}: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const evidenceById = useMemo(
    () => new Map(evidence.map((item) => [item.evidence_id, item])),
    [evidence],
  );

  function toggle(key: string) {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  type Row =
    | { kind: "quant"; key: string; signal: QuantSignal }
    | { kind: "financial"; key: string; signal: FinancialSignal }
    | { kind: "ai"; key: string; signal: AISignal };

  const rows: Row[] = [
    ...quant.map((s, i) => ({ kind: "quant" as const, key: `q-${i}`, signal: s })),
    ...financial.map((s, i) => ({
      kind: "financial" as const,
      key: `f-${i}`,
      signal: s,
    })),
    ...ai.map((s, i) => ({ kind: "ai" as const, key: `a-${i}`, signal: s })),
  ];

  return (
    <section className="rounded-xl bg-surface-card-dark border border-hairline-on-dark shadow-card overflow-hidden">
      <header className="px-6 py-4 border-b border-hairline-on-dark">
        <h2 className="text-sm uppercase tracking-widest text-muted">Signals</h2>
        <p className="text-xs text-muted-strong mt-1">
          행을 클릭하면 계산 근거 / 원본 evidence를 펼쳐볼 수 있습니다.
        </p>
      </header>

      <ul>
        {rows.map((row) => {
          const isOpen = openKey === row.key;
          const score = row.signal.score;
          const direction = row.signal.direction;

          let title: React.ReactNode;
          let source: string;
          let valueDisplay: React.ReactNode;

          if (row.kind === "quant") {
            const s = row.signal;
            title = s.label;
            source = s.api_used;
            valueDisplay = formatNumber(s.value);
          } else if (row.kind === "financial") {
            const s = row.signal;
            title = s.label;
            source = s.metric;
            valueDisplay = (
              <>
                {formatNumber(s.value)}
                {s.metric !== "net_income" && s.value !== null ? "%" : ""}
              </>
            );
          } else {
            const s = row.signal;
            title = (
              <span>
                LLM: <span className="text-muted-strong">{s.label}</span>
              </span>
            );
            source = "gpt-5.2";
            valueDisplay = `conf ${s.confidence.toFixed(2)}`;
          }

          return (
            <li key={row.key} className="border-t border-hairline-on-dark first:border-t-0">
              <button
                type="button"
                onClick={() => toggle(row.key)}
                className="w-full grid grid-cols-[24px_140px_1fr_120px_80px] items-center gap-4 px-6 py-3 hover:bg-canvas-dark text-left transition-colors cursor-pointer"
              >
                <span className="text-sm">
                  <ArrowGlyph direction={direction} />
                </span>
                <span className="text-xs text-muted-strong font-mono truncate">
                  {source}
                </span>
                <span className="text-sm text-on-dark truncate">{title}</span>
                <span className="text-sm font-mono tabular text-on-dark text-right truncate">
                  {valueDisplay}
                </span>
                <span
                  className={`text-sm font-mono tabular font-semibold text-right ${scoreClass(
                    score,
                  )}`}
                >
                  {score > 0 ? `+${score}` : score}
                  <span className="ml-2">
                    <Chevron open={isOpen} />
                  </span>
                </span>
              </button>

              {isOpen && (
                <div className="px-6 pb-4 pt-1">
                  {row.kind === "quant" && <QuantDetail signal={row.signal} />}
                  {row.kind === "financial" && (
                    <FinancialDetail
                      signal={row.signal}
                      evidenceById={evidenceById}
                    />
                  )}
                  {row.kind === "ai" && (
                    <AIDetail signal={row.signal} evidenceById={evidenceById} />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
