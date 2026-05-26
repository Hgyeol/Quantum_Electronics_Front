"use client";

import { useState } from "react";
import { fetchOutlook, type OutlookQueryInput, type OutlookReport } from "@/lib/api";
import { useWatchlist } from "@/lib/watchlist";
import OutlookForm from "@/components/OutlookForm";
import WatchlistBar from "@/components/WatchlistBar";
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
    <div className="min-h-screen flex flex-col">
      {/* ── 앱 헤더 ──────────────────────────────────────── */}
      <header className="border-b border-hairline-on-dark sticky top-0 z-20 bg-canvas-dark/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-baseline gap-2.5">
            <span className="text-primary text-lg font-bold tracking-tight">QUANTUM</span>
            <span className="text-muted text-xs">투자 전망</span>
          </div>
          <span className="text-[11px] text-muted font-mono">v1.0.0</span>
        </div>
      </header>

      {/* ── 관심종목 티커 스트립 ─────────────────────────── */}
      <WatchlistBar
        codes={watchlist.codes}
        onSelect={(code) => handleSubmit({ code })}
        onRemove={watchlist.remove}
      />

      {/* ── 메인 콘텐츠 ──────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-6">
        {/* 검색 폼 */}
        <OutlookForm onSubmit={handleSubmit} loading={loading} />

        {/* 에러 */}
        {error && (
          <div className="rounded-lg border border-trading-down/30 bg-surface-card-dark px-5 py-3 text-sm text-trading-down">
            {error}
          </div>
        )}

        {/* 결과 */}
        {report && (
          <div className="space-y-5">
            {/* 종목 헤더 */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-on-dark tracking-tight">
                  {report.stock_name ?? report.stock_code}
                  <span className="ml-3 text-base text-muted font-mono font-normal">
                    {report.stock_code}
                  </span>
                </h1>
                <span className="text-[11px] text-muted font-mono">
                  {report.generated_at}
                </span>
              </div>

              <button
                onClick={() => watchlist.toggle(report.stock_code)}
                className={`shrink-0 flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border transition-colors cursor-pointer ${
                  inWatchlist
                    ? "border-trading-down/40 text-trading-down hover:bg-trading-down/10"
                    : "border-primary/40 text-primary hover:bg-primary/10"
                }`}
              >
                <span className="text-base leading-none">{inWatchlist ? "★" : "☆"}</span>
                {inWatchlist ? "관심 해제" : "관심 추가"}
              </button>
            </div>

            {/* 시세 바 */}
            {report.market_quote && (
              <MarketQuoteCard
                quote={report.market_quote}
                stockName={report.stock_name}
              />
            )}

            {/* Final Verdict */}
            <FinalVerdictCard
              score={report.score}
              ai={report.ai_signals[0]}
              autoSummary={report.summary}
            />

            {/* 차트 분석 */}
            <ChartAnalysisCard
              stockCode={report.stock_code}
              stockName={report.stock_name}
            />

            {/* 신호 분류 */}
            <SignalBreakdownPanel
              quant={report.quant_signals}
              ai={report.ai_signals}
            />

            {/* 기술 지표 */}
            <TechnicalIndicatorsPanel stockCode={report.stock_code} />

            {/* 포지션 컨텍스트 */}
            {report.position_context && (
              <PositionContextCard ctx={report.position_context} />
            )}

            {/* 신호 상세 테이블 */}
            <QuantSignalsTable
              quant={report.quant_signals}
              financial={report.financial_signals}
              ai={report.ai_signals}
              evidence={report.evidence}
            />

            {/* Evidence */}
            <EvidenceList evidence={report.evidence} />

            {/* 에러 */}
            <ErrorsBanner errors={report.errors} />
          </div>
        )}
      </main>

      {/* ── 푸터 ─────────────────────────────────────────── */}
      <footer className="border-t border-hairline-on-dark mt-8">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-muted">
          © Quantum Electronics — 정보 제공용이며 투자 권유가 아닙니다.
        </div>
      </footer>
    </div>
  );
}
