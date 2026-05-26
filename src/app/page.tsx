"use client";

import { useState, type FormEvent } from "react";
import { fetchOutlook, type OutlookQueryInput, type OutlookReport } from "@/lib/api";
import { useWatchlist } from "@/lib/watchlist";
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

const QUICK_PICKS = [
  { code: "005930", name: "삼성전자" },
  { code: "000660", name: "SK하이닉스" },
  { code: "373220", name: "LG에너지" },
  { code: "035420", name: "NAVER" },
  { code: "035720", name: "카카오" },
];

export default function Home() {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [report, setReport] = useState<OutlookReport | null>(null);
  const [outlookLoading, setOutlookLoading] = useState(false);
  const [outlookError, setOutlookError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const watchlist = useWatchlist();

  function handleSelectStock(code: string) {
    setSelectedCode(code);
    setReport(null);
    setOutlookError(null);
    setSearchError(null);
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    handleSelectStock(trimmed);
  }

  async function handleLoadOutlook(input?: OutlookQueryInput) {
    if (!selectedCode) return;
    setOutlookLoading(true);
    setOutlookError(null);
    try {
      const result = await fetchOutlook(input ?? { code: selectedCode });
      setReport(result);
    } catch (err) {
      setOutlookError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setOutlookLoading(false);
    }
  }

  function handleBack() {
    setSelectedCode(null);
    setReport(null);
    setOutlookError(null);
    setSearchError(null);
  }

  const isDetail = selectedCode !== null;
  const inWatchlist = selectedCode ? watchlist.has(selectedCode) : false;

  return (
    <div className="min-h-screen flex flex-col bg-canvas-dark">
      {/* ── 헤더 (항상 표시) ───────────────────────────── */}
      <header className="bg-surface-card-dark border-b border-hairline-on-dark sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center gap-3">
          {isDetail ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-muted hover:text-on-dark transition-colors cursor-pointer shrink-0"
            >
              <span className="text-base leading-none">←</span>
              <span className="text-sm font-semibold text-primary">Quantum</span>
            </button>
          ) : (
            <span className="text-primary font-bold text-base tracking-tight shrink-0">
              Quantum
            </span>
          )}

          {isDetail && (
            <span className="text-sm font-semibold text-on-dark truncate hidden sm:block">
              {report?.stock_name ?? selectedCode}
            </span>
          )}

          <span className="flex-1" />

          <form onSubmit={handleSearch} className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="종목코드 · 종목명"
              className="w-48 h-9 px-3 rounded-lg border border-hairline-on-dark bg-surface-elevated-dark text-sm text-on-dark placeholder:text-muted font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors"
            />
            <button
              type="submit"
              className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-active text-on-primary text-sm font-semibold transition-colors cursor-pointer"
            >
              조회
            </button>
          </form>
        </div>
      </header>

      {/* ── 홈 뷰 ───────────────────────────────────────── */}
      {!isDetail && (
        <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-7 space-y-4">
          {searchError && (
            <div className="bg-surface-card-dark rounded-xl shadow-card px-5 py-4 text-sm text-trading-down border-l-4 border-trading-down">
              {searchError}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-muted shrink-0">빠른 조회</span>
            <div className="w-px h-3 bg-hairline-on-dark shrink-0" />
            {QUICK_PICKS.map((p) => (
              <button
                key={p.code}
                type="button"
                onClick={() => handleSelectStock(p.code)}
                className="text-[13px] text-muted-strong hover:text-on-dark transition-colors cursor-pointer"
              >
                {p.name}
                <span className="font-mono text-[11px] text-muted ml-1">{p.code}</span>
              </button>
            ))}
          </div>

          <WatchlistTable
            codes={watchlist.codes}
            onSelect={handleSelectStock}
            onRemove={watchlist.remove}
            activeCode={null}
          />

          {watchlist.codes.length === 0 && (
            <div className="bg-surface-card-dark rounded-xl shadow-card px-6 py-12 text-center">
              <p className="text-muted text-sm">관심종목이 없습니다.</p>
              <p className="text-muted-strong text-xs mt-1">
                종목을 조회한 뒤 ☆ 버튼으로 추가하세요.
              </p>
            </div>
          )}
        </main>
      )}

      {/* ── 상세 뷰 ─────────────────────────────────────── */}
      {isDetail && selectedCode && (
        <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-7 space-y-4">
          {/* 종목 헤더 */}
          <div className="bg-surface-card-dark rounded-xl shadow-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-xl font-bold text-ink">
                  {report?.stock_name ?? selectedCode}
                </h1>
                <span className="text-sm text-muted font-mono">{selectedCode}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => watchlist.toggle(selectedCode)}
                  className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border transition-colors cursor-pointer ${
                    inWatchlist
                      ? "border-trading-down/30 text-trading-down bg-trading-down/5 hover:bg-trading-down/10"
                      : "border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
                  }`}
                >
                  <span>{inWatchlist ? "★" : "☆"}</span>
                  {inWatchlist ? "관심 해제" : "관심 추가"}
                </button>
                {!report && (
                  <button
                    onClick={() => handleLoadOutlook()}
                    disabled={outlookLoading}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted-strong text-on-primary text-sm font-semibold transition-colors cursor-pointer"
                  >
                    {outlookLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                        분석 중
                      </>
                    ) : (
                      "전망 보기"
                    )}
                  </button>
                )}
              </div>
            </div>
            {report?.market_quote && (
              <MarketQuoteCard quote={report.market_quote} stockName={report.stock_name} />
            )}
          </div>

          {/* 차트 분석 */}
          <ChartAnalysisCard stockCode={selectedCode} stockName={report?.stock_name ?? null} />

          {/* 전망 로드 에러 */}
          {outlookError && (
            <div className="bg-surface-card-dark rounded-xl shadow-card px-5 py-4 text-sm text-trading-down border-l-4 border-trading-down">
              {outlookError}
            </div>
          )}

          {/* 전망 로딩 스켈레톤 */}
          {outlookLoading && !report && (
            <div className="bg-surface-card-dark rounded-xl shadow-card p-6 space-y-3 animate-pulse">
              <div className="h-4 w-24 rounded bg-surface-elevated-dark" />
              <div className="h-8 w-40 rounded bg-surface-elevated-dark" />
              <div className="h-3 w-56 rounded bg-surface-elevated-dark" />
            </div>
          )}

          {/* 전망 결과 */}
          {report && (
            <div className="space-y-4">
              <FinalVerdictCard
                score={report.score}
                ai={report.ai_signals[0]}
                autoSummary={report.summary}
              />
              <SignalBreakdownPanel quant={report.quant_signals} ai={report.ai_signals} />
              <TechnicalIndicatorsPanel stockCode={report.stock_code} />
              {report.position_context && (
                <PositionContextCard ctx={report.position_context} />
              )}
              <QuantSignalsTable
                quant={report.quant_signals}
                financial={report.financial_signals}
                ai={report.ai_signals}
                evidence={report.evidence}
              />
              <EvidenceList evidence={report.evidence} />
              <ErrorsBanner errors={report.errors} />
              <p className="text-xs text-muted text-center pb-4">
                정보 제공용이며 투자 권유가 아닙니다. © Quantum Electronics
              </p>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
