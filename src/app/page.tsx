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
  const [report, setReport] = useState<OutlookReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
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

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    handleSubmit({ code: trimmed });
  }

  function handleBack() {
    setReport(null);
    setError(null);
  }

  const inWatchlist = report ? watchlist.has(report.stock_code) : false;
  const isDetail = report !== null || (loading && !error);

  return (
    <div className="min-h-screen flex flex-col bg-canvas-dark">
      {/* ── 헤더 (항상 표시) ───────────────────────────── */}
      <header className="bg-surface-card-dark border-b border-hairline-on-dark sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center gap-3">
          {/* 로고 / 뒤로가기 */}
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

          <div className="w-px h-4 bg-hairline-on-dark shrink-0" />

          {/* 검색 인풋 */}
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 flex-1 max-w-sm"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="종목코드 · 종목명"
              className="flex-1 min-w-0 h-9 px-3 rounded-lg border border-hairline-on-dark bg-surface-elevated-dark text-sm text-on-dark placeholder:text-muted font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-active text-on-primary text-sm font-semibold disabled:bg-primary-disabled disabled:text-muted-strong transition-colors shrink-0 cursor-pointer"
            >
              {loading ? "…" : "조회"}
            </button>
          </form>

          {/* 상세 뷰일 때 종목명 */}
          {isDetail && report && (
            <span className="text-sm font-semibold text-on-dark truncate hidden sm:block">
              {report.stock_name ?? report.stock_code}
            </span>
          )}
        </div>
      </header>

      {/* ── 홈 뷰 ───────────────────────────────────────── */}
      {!isDetail && (
        <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-7 space-y-4">
          {/* 에러 */}
          {error && (
            <div className="bg-surface-card-dark rounded-xl shadow-card px-5 py-4 text-sm text-trading-down border-l-4 border-trading-down">
              {error}
            </div>
          )}

          {/* 빠른 조회 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-muted shrink-0">
              빠른 조회
            </span>
            <div className="w-px h-3 bg-hairline-on-dark shrink-0" />
            {QUICK_PICKS.map((p) => (
              <button
                key={p.code}
                type="button"
                disabled={loading}
                onClick={() => handleSubmit({ code: p.code })}
                className="text-[13px] text-muted-strong hover:text-on-dark disabled:opacity-40 transition-colors cursor-pointer"
              >
                {p.name}
                <span className="font-mono text-[11px] text-muted ml-1">{p.code}</span>
              </button>
            ))}
          </div>

          {/* 관심종목 테이블 */}
          <WatchlistTable
            codes={watchlist.codes}
            onSelect={(code) => handleSubmit({ code })}
            onRemove={watchlist.remove}
            activeCode={null}
          />

          {/* 관심종목 없을 때 안내 */}
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
      {isDetail && (
        <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-7 space-y-4">
          {/* 에러 */}
          {error && (
            <div className="bg-surface-card-dark rounded-xl shadow-card px-5 py-4 text-sm text-trading-down border-l-4 border-trading-down">
              {error}
            </div>
          )}

          {/* 로딩 스켈레톤 */}
          {loading && !report && (
            <div className="bg-surface-card-dark rounded-xl shadow-card p-6 space-y-3 animate-pulse">
              <div className="h-5 w-32 rounded bg-surface-elevated-dark" />
              <div className="h-10 w-48 rounded bg-surface-elevated-dark" />
              <div className="h-4 w-24 rounded bg-surface-elevated-dark" />
            </div>
          )}

          {report && (
            <div className="space-y-4">
              {/* 종목 헤더 + 현재가 */}
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

              <FinalVerdictCard
                score={report.score}
                ai={report.ai_signals[0]}
                autoSummary={report.summary}
              />

              <ChartAnalysisCard stockCode={report.stock_code} stockName={report.stock_name} />

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
