"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  fetchOutlook, fetchMarketQuote, checkAuth, logout,
  type OutlookQueryInput, type OutlookReport, type MarketQuote, type OHLCVBar,
} from "@/lib/api";
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
import RankingSection from "@/components/RankingSection";
import ScreenerSection from "@/components/ScreenerSection";
import StockLogo from "@/components/StockLogo";
import StockSearchBox from "@/components/StockSearchBox";
import ThemeToggle from "@/components/ThemeToggle";
import CenturyToggle from "@/components/CenturyToggle";

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/^http/, "ws");

type HomeTab = 0 | 1 | 2;
const HOME_TABS = ["관심종목", "시장현황", "스크리너"] as const;

interface LiveTick {
  price: number;
  change: number;
  change_rate: number;
}

interface HoveredStock {
  code: string;
  name: string;
  price: number;
  changeRate: number;
}

// ── 좌측 내비 아이콘 ────────────────────────────────────────────
function IconStar({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className={active ? "text-ink" : "text-muted"}>
      <path d="M11 2.5L13.2 8.3L19.5 8.8L15 12.5L16.5 18.8L11 15.6L5.5 18.8L7 12.5L2.5 8.8L8.8 8.3L11 2.5Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
        fill={active ? "currentColor" : "none"} />
    </svg>
  );
}

function IconBarChart({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className={active ? "text-ink" : "text-muted"}>
      <rect x="3" y="12" width="4" height="7" rx="1.5" fill="currentColor" />
      <rect x="9" y="7" width="4" height="12" rx="1.5" fill="currentColor" />
      <rect x="15" y="3" width="4" height="16" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function IconFilter({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className={active ? "text-ink" : "text-muted"}>
      <path d="M3 6H19M6 11H16M10 16H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-muted">
      <path d="M13 3H16.5C17.3 3 18 3.7 18 4.5V15.5C18 16.3 17.3 17 16.5 17H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 13L4 10L8 7M4 10H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-ink">
      <path d="M12.5 4L6 10L12.5 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const QUICK_PICKS = [
  { code: "005930", name: "삼성전자" },
  { code: "000660", name: "SK하이닉스" },
  { code: "373220", name: "LG에너지" },
  { code: "035420", name: "NAVER" },
  { code: "035720", name: "카카오" },
];

export default function Home() {
  const router = useRouter();
  const [homeTab, setHomeTab] = useState<HomeTab>(1);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [report, setReport] = useState<OutlookReport | null>(null);
  const [outlookLoading, setOutlookLoading] = useState(false);
  const [outlookError, setOutlookError] = useState<string | null>(null);
  const [liveTick, setLiveTick] = useState<LiveTick | null>(null);
  const [marketQuote, setMarketQuote] = useState<MarketQuote | null>(null);
  const [hoveredBar, setHoveredBar] = useState<OHLCVBar | null>(null);
  const [pinnedBar, setPinnedBar] = useState<OHLCVBar | null>(null);
  const [hoveredStock, setHoveredStock] = useState<HoveredStock | null>(null);
  const liveWsRef = useRef<WebSocket | null>(null);
  const watchlist = useWatchlist();

  useEffect(() => {
    checkAuth().then((ok) => { if (!ok) router.replace("/login"); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    liveWsRef.current?.close();
    liveWsRef.current = null;
    setLiveTick(null);
    if (!selectedCode) return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${WS_BASE}/ws/watchlist?codes=${selectedCode}`);
      liveWsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const tick = JSON.parse(e.data) as LiveTick & { stock_code: string };
          if (tick.stock_code === selectedCode)
            setLiveTick({ price: tick.price, change: tick.change, change_rate: tick.change_rate });
        } catch { /* ignore */ }
      };
    } catch { /* ignore */ }
    return () => { ws?.close(); liveWsRef.current = null; };
  }, [selectedCode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedCode) { setMarketQuote(null); return; }
    fetchMarketQuote(selectedCode).then(setMarketQuote).catch(() => {});
  }, [selectedCode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  function handleSelectStock(code: string, name?: string | null) {
    setSelectedCode(code);
    setSelectedName(name ?? null);
    setReport(null);
    setMarketQuote(null);
    setOutlookError(null);
    setHoveredBar(null);
    setPinnedBar(null);
    setHoveredStock(null);
  }

  function handleBack() {
    setSelectedCode(null);
    setSelectedName(null);
    setReport(null);
    setMarketQuote(null);
    setOutlookError(null);
    setHoveredBar(null);
    setPinnedBar(null);
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

  const inWatchlist = selectedCode ? watchlist.has(selectedCode) : false;
  const displayName = report?.stock_name ?? selectedName ?? selectedCode;

  const tick = liveTick ?? (marketQuote
    ? { price: marketQuote.price, change: marketQuote.change, change_rate: marketQuote.change_rate }
    : null);
  const priceUp = tick ? tick.change > 0 : null;
  const priceFlat = tick ? tick.change === 0 : null;
  const priceColor = priceFlat ? "text-body" : priceUp ? "text-trading-up" : "text-trading-down";
  const badgeBg = priceFlat
    ? "text-muted"
    : priceUp
      ? "bg-trading-up/10 text-trading-up"
      : "bg-trading-down/10 text-trading-down";
  const badgeStyle = priceFlat ? { background: "var(--c-bg-muted)" } : {};

  // ── 좌측 내비 (공통) ────────────────────────────────────────────
  const leftNav = (
    <aside
      className="w-[72px] shrink-0 bg-white flex flex-col items-center py-5 gap-1 z-10"
      style={{ borderRight: "1px solid var(--c-border)" }}
    >
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-5 shrink-0">
        <span className="text-white font-extrabold text-[15px] tracking-tight">Q</span>
      </div>

      {selectedCode ? (
        <button type="button" onClick={handleBack} title="뒤로"
          className="w-12 h-12 flex items-center justify-center rounded-xl transition-colors cursor-pointer"
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--c-hover-md)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
          <IconBack />
        </button>
      ) : (
        <>
          <button type="button" onClick={() => setHomeTab(0)} title="관심종목"
            className="w-12 h-12 flex items-center justify-center rounded-xl transition-colors cursor-pointer"
            style={{ background: homeTab === 0 ? "var(--c-hover-md)" : undefined }}>
            <IconStar active={homeTab === 0} />
          </button>
          <button type="button" onClick={() => setHomeTab(1)} title="시장현황"
            className="w-12 h-12 flex items-center justify-center rounded-xl transition-colors cursor-pointer"
            style={{ background: homeTab === 1 ? "var(--c-hover-md)" : undefined }}>
            <IconBarChart active={homeTab === 1} />
          </button>
          <button type="button" onClick={() => setHomeTab(2)} title="스크리너"
            className="w-12 h-12 flex items-center justify-center rounded-xl transition-colors cursor-pointer"
            style={{ background: homeTab === 2 ? "var(--c-hover-md)" : undefined }}>
            <IconFilter active={homeTab === 2} />
          </button>
        </>
      )}

      <div className="flex-1" />
      <button type="button" onClick={handleLogout} title="로그아웃"
        className="w-12 h-12 flex items-center justify-center rounded-xl transition-colors cursor-pointer"
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--c-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
        <IconLogout />
      </button>
    </aside>
  );

  return (
    <div className="app-root flex h-screen overflow-hidden bg-canvas-dark">

      {leftNav}

      {selectedCode ? (

        /* ── 종목 상세 (전체화면) ────────────────────────── */
        <div className="flex-1 flex flex-col overflow-hidden bg-white">

          {/* 상세 헤더 */}
          <header
            className="h-[52px] shrink-0 flex items-center justify-between px-5 bg-white"
            style={{ borderBottom: "1px solid var(--c-border)" }}
          >
            <div className="flex items-center gap-3">
              <StockLogo code={selectedCode} name={displayName} size={28} rounded="lg" />
              <span className="text-[15px] font-bold text-ink">{displayName}</span>
              <span className="text-[12px] text-muted font-mono">{selectedCode}</span>
              {liveTick && (
                <span className="flex items-center gap-1 text-[11px] text-trading-up font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-trading-up animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            {tick && (
              <div className="flex items-baseline gap-2">
                <span className="font-mono tabular text-[18px] font-bold text-ink">
                  {tick.price.toLocaleString("ko-KR")}
                </span>
                <span className="text-[12px] text-muted">원</span>
                <span className={`font-mono tabular text-[13px] font-bold px-2.5 py-1 rounded-full ${badgeBg}`} style={badgeStyle}>
                  {tick.change_rate > 0 ? "+" : ""}{tick.change_rate.toFixed(2)}%
                </span>
              </div>
            )}
          </header>

          {/* 상세 컨텐츠 */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[900px] mx-auto">

              {/* 종목 헤더 + 가격 */}
              <div className="px-8 pt-8 pb-6" style={{ borderBottom: "1px solid var(--c-border)" }}>
                <div className="flex items-center gap-4 mb-5">
                  <StockLogo code={selectedCode} name={displayName} size={52} rounded="xl" />
                  <div className="min-w-0 flex-1">
                    <h1 className="text-[28px] font-bold text-ink leading-tight">{displayName}</h1>
                    <span className="text-[13px] text-muted font-mono">{selectedCode}</span>
                  </div>
                  {/* CTA 버튼 */}
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => watchlist.toggle(selectedCode)}
                      className={`h-[44px] px-5 rounded-xl text-[14px] font-bold transition-colors cursor-pointer border ${
                        inWatchlist
                          ? "border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
                          : "text-body hover:text-ink"
                      }`}
                      style={inWatchlist ? {} : { border: "1px solid var(--c-border-strong)", background: "var(--c-bg-subtle)" }}>
                      {inWatchlist ? "★ 관심 해제" : "☆ 관심 추가"}
                    </button>
                    {!report && (
                      <button type="button" onClick={() => handleLoadOutlook()} disabled={outlookLoading}
                        className="h-[44px] px-5 rounded-xl bg-primary hover:bg-primary-active disabled:bg-primary-disabled text-white text-[14px] font-bold transition-colors cursor-pointer flex items-center gap-2">
                        {outlookLoading ? (
                          <>
                            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            분석 중
                          </>
                        ) : "전망 분석"}
                      </button>
                    )}
                  </div>
                </div>

                {tick ? (
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono tabular text-[48px] font-bold text-ink leading-none tracking-tight">
                      {tick.price.toLocaleString("ko-KR")}
                    </span>
                    <span className="text-[16px] text-muted">원</span>
                    <span className={`font-mono tabular text-[15px] font-semibold ${priceColor}`}>
                      {tick.change > 0 ? "+" : ""}{tick.change.toLocaleString("ko-KR")}
                    </span>
                    <span className={`font-mono tabular text-[14px] font-bold px-3 py-1.5 rounded-full ${badgeBg}`} style={badgeStyle}>
                      {tick.change_rate > 0 ? "+" : ""}{tick.change_rate.toFixed(2)}%
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-12 w-48 rounded-lg" style={{ background: "var(--c-bg-muted)" }} />
                    <div className="h-6 w-28 rounded-full" style={{ background: "var(--c-bg-muted)" }} />
                  </div>
                )}
              </div>

              {/* 차트 */}
              <div className="relative" style={{ borderBottom: "1px solid var(--c-border)" }}>
                <ChartAnalysisCard
                  stockCode={selectedCode}
                  stockName={report?.stock_name ?? selectedName ?? null}
                  onNameResolved={(name) => setSelectedName((prev) => prev ?? name)}
                  onBarHover={setHoveredBar}
                  onBarClick={(bar) => { if (bar) setPinnedBar(bar); }}
                />
                {(pinnedBar ?? hoveredBar) && (
                  <div className="absolute top-3 right-3 z-10 w-36 rounded-xl bg-white px-3.5 py-3 text-xs font-mono space-y-1.5 pointer-events-auto"
                    style={{ border: "1px solid var(--c-border-md)", boxShadow: "0 4px 20px var(--c-shadow)" }}>
                    <div className="flex items-center justify-between pb-1.5" style={{ borderBottom: "1px solid var(--c-border)" }}>
                      <span className="text-muted text-[10px] font-sans">{(pinnedBar ?? hoveredBar)!.date}</span>
                      {pinnedBar && (
                        <button type="button" onClick={() => setPinnedBar(null)}
                          className="text-muted hover:text-body w-4 h-4 flex items-center justify-center rounded cursor-pointer"
                          style={{ background: "var(--c-bg-muted)" }}>✕</button>
                      )}
                    </div>
                    {[
                      { label: "시가", value: (pinnedBar ?? hoveredBar)!.open.toLocaleString(), color: "text-body" },
                      { label: "고가", value: (pinnedBar ?? hoveredBar)!.high.toLocaleString(), color: "text-trading-up" },
                      { label: "저가", value: (pinnedBar ?? hoveredBar)!.low.toLocaleString(), color: "text-trading-down" },
                      { label: "종가", value: (pinnedBar ?? hoveredBar)!.close.toLocaleString(), color: "text-ink" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex justify-between gap-2">
                        <span className="text-muted font-sans">{label}</span>
                        <span className={color}>{value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between gap-2 pt-1.5" style={{ borderTop: "1px solid var(--c-border)" }}>
                      <span className="text-muted font-sans">거래량</span>
                      <span className="text-body">{((pinnedBar ?? hoveredBar)!.volume / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 시세 상세 */}
              {(marketQuote ?? report?.market_quote) && (
                <div className="px-8 py-6" style={{ borderBottom: "1px solid var(--c-border)" }}>
                  <MarketQuoteCard
                    quote={tick
                      ? { ...(marketQuote ?? report!.market_quote!), price: tick.price, change: tick.change, change_rate: tick.change_rate }
                      : (marketQuote ?? report!.market_quote!)}
                    stockName={report?.stock_name ?? selectedName}
                  />
                </div>
              )}

              {/* 에러 */}
              {outlookError && (
                <div className="px-8 py-4 text-[14px] text-trading-down border-l-4 border-trading-down"
                  style={{ borderBottom: "1px solid var(--c-border)" }}>
                  {outlookError}
                </div>
              )}

              {/* 로딩 스켈레톤 */}
              {outlookLoading && !report && (
                <div className="px-8 py-6 space-y-3 animate-pulse">
                  <div className="h-4 w-20 rounded-lg" style={{ background: "var(--c-bg-muted)" }} />
                  <div className="h-8 w-36 rounded-lg" style={{ background: "var(--c-bg-muted)" }} />
                  <div className="h-3 w-52 rounded-lg" style={{ background: "var(--c-bg-muted)" }} />
                </div>
              )}

              {/* 전망 결과 */}
              {report && (
                <>
                  <div className="px-8 py-6" style={{ borderBottom: "1px solid var(--c-border)" }}>
                    <FinalVerdictCard score={report.score} ai={report.ai_signals[0]} autoSummary={report.summary} />
                  </div>
                  <div className="px-8 py-6" style={{ borderBottom: "1px solid var(--c-border)" }}>
                    <SignalBreakdownPanel quant={report.quant_signals} ai={report.ai_signals} />
                  </div>
                  <div className="px-8 py-6" style={{ borderBottom: "1px solid var(--c-border)" }}>
                    <TechnicalIndicatorsPanel stockCode={report.stock_code} />
                  </div>
                  {report.position_context && (
                    <div className="px-8 py-6" style={{ borderBottom: "1px solid var(--c-border)" }}>
                      <PositionContextCard ctx={report.position_context} />
                    </div>
                  )}
                  <div className="px-8 py-6" style={{ borderBottom: "1px solid var(--c-border)" }}>
                    <QuantSignalsTable
                      quant={report.quant_signals}
                      financial={report.financial_signals}
                      ai={report.ai_signals}
                      evidence={report.evidence}
                    />
                  </div>
                  <div className="px-8 py-6" style={{ borderBottom: "1px solid var(--c-border)" }}>
                    <EvidenceList evidence={report.evidence} />
                  </div>
                  <ErrorsBanner errors={report.errors} />
                  <p className="text-[11px] text-muted text-center py-6 px-8">
                    정보 제공용이며 투자 권유가 아닙니다. © Quantum Electronics
                  </p>
                </>
              )}

            </div>
          </div>
        </div>

      ) : (

        /* ── 3-컬럼 홈 레이아웃 ──────────────────────────── */
        <div className="flex-1 flex flex-col overflow-hidden bg-white">

          {/* 공통 헤더 (center + right 패널 전체 너비) */}
          <header
            className="h-[52px] shrink-0 relative flex items-center px-5 bg-white"
            style={{ borderBottom: "1px solid var(--c-border)" }}
          >
            <span className="text-[15px] font-bold text-ink">{HOME_TABS[homeTab]}</span>
            <div className="search-center-wrapper absolute" style={{ left: "calc(50vw - 72px)", transform: "translateX(-50%)" }}>
              <StockSearchBox onSelect={handleSelectStock} />
            </div>
          </header>

          {/* 헤더 아래 center + right 영역 */}
          <div className="flex-1 flex overflow-hidden">

            {/* 중앙 컬럼 */}
            <div className="flex-1 overflow-y-auto">
              {homeTab === 0 && (
                <>
                  <div className="flex items-center gap-3 px-5 py-3 flex-wrap"
                    style={{ borderBottom: "1px solid var(--c-border)" }}>
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-widest shrink-0">빠른 조회</span>
                    {QUICK_PICKS.map((p) => (
                      <button key={p.code} type="button" onClick={() => handleSelectStock(p.code, p.name)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] text-muted-strong hover:text-ink transition-colors cursor-pointer"
                        style={{ background: "var(--c-hover)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--c-hover-lg)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--c-hover)")}>
                        <StockLogo code={p.code} name={p.name} size={16} rounded="lg" />
                        <span className="font-medium">{p.name}</span>
                      </button>
                    ))}
                  </div>
                  <WatchlistTable
                    codes={watchlist.codes}
                    onSelect={handleSelectStock}
                    onRemove={watchlist.remove}
                    activeCode={null}
                    onHover={setHoveredStock}
                    onHoverEnd={() => setHoveredStock(null)}
                  />
                  {watchlist.codes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 gap-2">
                      <p className="text-[15px] font-bold text-ink">관심종목이 없어요</p>
                      <p className="text-[13px] text-muted-strong">종목 조회 후 ☆ 버튼으로 추가하세요.</p>
                    </div>
                  )}
                </>
              )}
              {homeTab === 1 && (
                <RankingSection
                  onSelect={handleSelectStock}
                  onHover={setHoveredStock}
                  onHoverEnd={() => setHoveredStock(null)}
                />
              )}
              {homeTab === 2 && (
                <ScreenerSection
                  onSelect={handleSelectStock}
                  onHover={setHoveredStock}
                  onHoverEnd={() => setHoveredStock(null)}
                />
              )}
            </div>

            {/* 우측 프리뷰 패널 */}
            <aside
              className="w-[420px] shrink-0 bg-white flex flex-col overflow-hidden h-full"
              style={{ borderLeft: "1px solid var(--c-border)" }}
            >
            {hoveredStock ? (
              (() => {
                const up = hoveredStock.changeRate > 0;
                const flat = hoveredStock.changeRate === 0;
                const previewBadge = flat
                  ? "text-muted"
                  : up ? "bg-trading-up/10 text-trading-up" : "bg-trading-down/10 text-trading-down";
                const previewBadgeStyle = flat ? { background: "var(--c-bg-muted)" } : {};
                return (
                  <div className="flex-1 flex flex-col overflow-y-auto">
                    <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--c-border)" }}>
                      <div className="flex items-center gap-3 mb-4">
                        <StockLogo code={hoveredStock.code} name={hoveredStock.name} size={40} rounded="xl" />
                        <div className="min-w-0 flex-1">
                          <h1 className="text-[20px] font-bold text-ink leading-tight truncate">{hoveredStock.name}</h1>
                          <span className="text-[12px] text-muted font-mono">{hoveredStock.code}</span>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="font-mono tabular text-[36px] font-bold text-ink leading-none tracking-tight">
                          {hoveredStock.price.toLocaleString("ko-KR")}
                        </span>
                        <span className="text-[14px] text-muted">원</span>
                      </div>
                      <span className={`font-mono tabular text-[13px] font-bold px-2.5 py-1 rounded-full ${previewBadge}`} style={previewBadgeStyle}>
                        {flat ? "0.00%" : `${up ? "+" : ""}${hoveredStock.changeRate.toFixed(2)}%`}
                      </span>
                    </div>
                    <ChartAnalysisCard
                      stockCode={hoveredStock.code}
                      chartOnly
                    />
                  </div>
                );
              })()
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: "var(--c-hover)" }}>
                  <IconBarChart active={false} />
                </div>
                <p className="text-[15px] font-bold text-ink">종목을 선택하세요</p>
                <p className="text-[13px] text-muted-strong leading-relaxed">
                  좌측 목록에서 종목을 클릭하거나<br />검색으로 조회하세요.
                </p>
              </div>
            )}
            </aside>

          </div>
        </div>

      )}

      <CenturyToggle />
      <ThemeToggle />
    </div>
  );
}
