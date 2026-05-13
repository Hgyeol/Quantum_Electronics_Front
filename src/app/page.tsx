"use client";

import { useState } from "react";
import { fetchOutlook, type OutlookQueryInput, type OutlookReport } from "@/lib/api";
import OutlookForm from "@/components/OutlookForm";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import QuantSignalsTable from "@/components/QuantSignalsTable";
import PositionContextCard from "@/components/PositionContextCard";
import MLPredictionCard from "@/components/MLPredictionCard";
import EvidenceList from "@/components/EvidenceList";
import ErrorsBanner from "@/components/ErrorsBanner";

export default function Home() {
  const [report, setReport] = useState<OutlookReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(input: OutlookQueryInput) {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOutlook(input);
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-hairline-on-dark">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-primary text-xl font-bold tracking-tight">
              QUANTUM
            </span>
            <span className="text-muted text-sm">Electronics · 투자 전망</span>
          </div>
          <span className="text-xs text-muted font-mono tabular">v1.0.0</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <section>
          <h1 className="text-4xl font-bold text-on-dark mb-2 leading-tight">
            KOSPI 종목 전망
          </h1>
          <p className="text-muted text-base">
            퀀트·재무·LLM 신호 + 학습 모델 예측 + 포지션 컨텍스트를 한 호출에.
          </p>
        </section>

        <OutlookForm onSubmit={handleSubmit} loading={loading} />

        {error && (
          <div className="rounded-lg border border-trading-down/30 bg-canvas-dark p-4 text-sm text-trading-down">
            {error}
          </div>
        )}

        {report && (
          <div className="space-y-8">
            <div className="flex items-baseline justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-on-dark">
                  {report.stock_name ?? report.stock_code}
                  <span className="ml-3 text-muted text-sm font-mono">
                    {report.stock_code}
                  </span>
                </h2>
                <span className="text-xs text-muted font-mono tabular">
                  generated at {report.generated_at}
                </span>
              </div>
            </div>

            <ScoreBreakdown score={report.score} summary={report.summary} />

            <div className="grid lg:grid-cols-2 gap-8">
              {report.ml_prediction && (
                <MLPredictionCard prediction={report.ml_prediction} />
              )}
              {report.position_context && (
                <PositionContextCard ctx={report.position_context} />
              )}
            </div>

            <QuantSignalsTable
              quant={report.quant_signals}
              financial={report.financial_signals}
              ai={report.ai_signals}
            />

            <EvidenceList evidence={report.evidence} />

            <ErrorsBanner errors={report.errors} />
          </div>
        )}
      </div>

      <footer className="bg-surface-soft-light text-body-on-light mt-20">
        <div className="max-w-6xl mx-auto px-6 py-10 text-sm text-muted">
          <p>© Quantum Electronics — 정보 제공용이며 투자 권유가 아닙니다.</p>
        </div>
      </footer>
    </main>
  );
}
