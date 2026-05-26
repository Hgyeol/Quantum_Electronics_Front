"use client";

import { useState } from "react";
import { fetchOutlook, type OutlookQueryInput, type OutlookReport } from "@/lib/api";
import { useWatchlist } from "@/lib/watchlist";
import OutlookForm from "@/components/OutlookForm";
import WatchlistTable from "@/components/WatchlistTable";
import FinalVerdictCard from "@/components/FinalVerdictCard";
import MarketQuoteCard from "@/components/MarketQuoteCard";
import SignalBreakdownPanel from "@/components/SignalBreakdownPanel";
import TechnicalIndicatorsPanel from "@/components/TechnicalIndicatorsPanel";
import QuantSignalsTable from "@/components/QuantSignalsTable";
import PositionContextCard from "@/components/PositionContextCard";
import EvidenceList from "@/components/EvidenceList";
import ErrorsBanner from "@/components/ErrorsBanner";
import ChartAnalysisCard from "@/components/ChartAnalysisCard";

export default function Home() {
  const [report, setReport] = useState<OutlookReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchlist = useWatchlist();

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

  const inWatchlist = report ? watchlist.has(report.stock_code) : false;

  return (
    <div className="min-h-screen flex flex-col bg-canvas-dark">
      {/* ── 헤더 ─────────────────────────────────────────── */}
      <header className="bg-surface-card-dark border-b border-hairline-on-dark sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold text-lg tracking-tight">Quantum</span>
            <span className="text-muted text-sm">투자 전망</span>
          </div>
          <span className="text-xs text-muted font-mono">v1.0.0</span>
        </div>
      </header>

      {/* ── 메인 ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-7 space-y-4">
        {/* 관심종목 테이블 */}
        <WatchlistTable
          codes={watchlist.codes}
          onSelect={(code) => handleSubmit({ code })}
          onRemove={watchlist.remove}
          activeCode={report?.stock_code ?? null}
        />

        {/* 검색폼 */}
        <div className="bg-surface-card-dark rounded-xl shadow-card p-5">
          <OutlookForm onSubmit={handleSubmit} loading={loading} />
        </div>

        {/* 에러 */}
        {error && (
          <div className="bg-surface-card-dark rounded-xl shadow-card px-5 py-4 text-sm text-trading-down border-l-4 border-trading-down">
            {error}
          </div>
        )}

        {/* 결과 */}
        {report && (
          <div className="space-y-4">
            {/* 종목 헤더 + 현재가 통합 */}
            <div className="bg-surface-card-dark rounded-xl shadow-card p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold text-ink">
                    {report.stock_name ?? report.stock_code}
                  </h1>
                  <span className="text-sm text-muted font-mono">{report.stock_code}</span>
                </div>
                <button
                  onClick={() => watchlist.toggle(report.stock_code)}
                  className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border transition-colors cursor-pointer ${
                    inWatchlist
                      ? "border-trading-down/30 text-trading-down bg-trading-down/5 hover:bg-trading-down/10"
                      : "border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
                  }`}
                >
                  <span>{inWatchlist ? "★" : "☆"}</span>
                  {inWatchlist ? "관심 해제" : "관심 추가"}
                </button>
              </div>

              {report.market_quote && (
                <MarketQuoteCard quote={report.market_quote} stockName={report.stock_name} />
              )}
            </div>

            {/* Final Verdict */}
            <FinalVerdictCard
              score={report.score}
              ai={report.ai_signals[0]}
              autoSummary={report.summary}
            />

            {/* 차트 */}
            <ChartAnalysisCard stockCode={report.stock_code} stockName={report.stock_name} />

            {/* 신호 분류 */}
            <SignalBreakdownPanel quant={report.quant_signals} ai={report.ai_signals} />

            {/* 기술 지표 */}
            <TechnicalIndicatorsPanel stockCode={report.stock_code} />

            {/* 포지션 */}
            {report.position_context && (
              <PositionContextCard ctx={report.position_context} />
            )}

            {/* 신호 테이블 */}
            <QuantSignalsTable
              quant={report.quant_signals}
              financial={report.financial_signals}
              ai={report.ai_signals}
              evidence={report.evidence}
            />

            {/* Evidence */}
            <EvidenceList evidence={report.evidence} />

            <ErrorsBanner errors={report.errors} />

            <p className="text-xs text-muted text-center pb-4">
              정보 제공용이며 투자 권유가 아닙니다. © Quantum Electronics
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
