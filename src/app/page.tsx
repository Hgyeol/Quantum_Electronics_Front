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
import SignalBreakdownPanel from "@/components/SignalBreakdownPanel";
import TechnicalIndicatorsPanel from "@/components/TechnicalIndicatorsPanel";
import QuantSignalsTable from "@/components/QuantSignalsTable";
import PositionContextCard from "@/components/PositionContextCard";
import EvidenceList from "@/components/EvidenceList";
import ErrorsBanner from "@/components/ErrorsBanner";
import ChartAnalysisCard from "@/components/ChartAnalysisCard";
import StockPreviewStats from "@/components/StockPreviewStats";
import RankingSection, { type TabId as RankTabId } from "@/components/RankingSection";
import ScreenerSection from "@/components/ScreenerSection";
import StockLogo from "@/components/StockLogo";
import StockSearchBox from "@/components/StockSearchBox";
import ThemeToggle from "@/components/ThemeToggle";
import CenturyToggle from "@/components/CenturyToggle";

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/^http/, "ws");

type HomeTab = 0 | 1 | 2 | 3;
const HOME_TABS = ["관심종목", "시장현황", "스크리너", "마이페이지"] as const;

interface LiveTick {
  price: number;
  change: number;
  change_rate: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  bsop_date?: string;
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

function IconUser({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className={active ? "text-ink" : "text-muted"}>
      <path d="M11 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 18.2a6.8 6.8 0 0 1 13 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
  const [hoveredQuote, setHoveredQuote] = useState<MarketQuote | null>(null);
  const [rankActiveTab, setRankActiveTab] = useState<RankTabId>("volume");
  const liveWsRef = useRef<WebSocket | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef<number | null>(null);
  const watchlist = useWatchlist();

  useEffect(() => {
    checkAuth().then((ok) => { if (!ok) router.replace("/login"); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // URL ?code= ↔ selectedCode 동기화 + 뒤로가기 시 홈 state 복원
  useEffect(() => {
    const sync = () => {
      const code = new URL(window.location.href).searchParams.get("code");
      setSelectedCode(code);
      if (!code) {
        setSelectedName(null);
        const st = window.history.state as
          | { homeTab?: HomeTab; rankActiveTab?: RankTabId; scrollY?: number }
          | null;
        if (st?.homeTab !== undefined) setHomeTab(st.homeTab);
        if (st?.rankActiveTab !== undefined) setRankActiveTab(st.rankActiveTab);
        if (typeof st?.scrollY === "number") pendingScrollRef.current = st.scrollY;
      }
    };
    sync(); // 초기 진입 시 URL 반영
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  // 뒤로가기 후 스크롤 위치 복원: 콘텐츠가 충분히 렌더될 때까지 retry
  useEffect(() => {
    if (selectedCode || pendingScrollRef.current == null) return;
    const target = pendingScrollRef.current;
    pendingScrollRef.current = null;

    let attempts = 0;
    const tryScroll = () => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll >= target || attempts > 60) {
        el.scrollTo(0, Math.min(target, maxScroll));
        return;
      }
      attempts++;
      requestAnimationFrame(tryScroll);
    };
    requestAnimationFrame(tryScroll);
  }, [selectedCode, homeTab, rankActiveTab]);

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
            setLiveTick({ price: tick.price, change: tick.change, change_rate: tick.change_rate, open: tick.open, high: tick.high, low: tick.low, volume: tick.volume, bsop_date: tick.bsop_date });
        } catch { /* ignore */ }
      };
    } catch { /* ignore */ }
    return () => { ws?.close(); liveWsRef.current = null; };
  }, [selectedCode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedCode) { setMarketQuote(null); return; }
    fetchMarketQuote(selectedCode).then(setMarketQuote).catch(() => {});
  }, [selectedCode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hoveredStock) {
      setHoveredQuote(null);
      return;
    }
    let cancelled = false;
    setHoveredQuote(null);
    fetchMarketQuote(hoveredStock.code)
      .then((quote) => {
        if (!cancelled) setHoveredQuote(quote);
      })
      .catch(() => {
        if (!cancelled) setHoveredQuote(null);
      });
    return () => {
      cancelled = true;
    };
  }, [hoveredStock?.code]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      if (media.matches && homeTab === 3) {
        setHomeTab(0);
      }
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [homeTab]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  function handleSelectStock(code: string, name?: string | null) {
    if (typeof window !== "undefined" && new URL(window.location.href).searchParams.get("code") !== code) {
      // 1) 현재 홈 페이지의 상태를 history entry에 박아둠 (뒤로가기 복원용)
      const onHome = !new URL(window.location.href).searchParams.has("code");
      if (onHome) {
        const scrollY = scrollContainerRef.current?.scrollTop ?? 0;
        window.history.replaceState({ homeTab, rankActiveTab, scrollY }, "");
      }
      // 2) stock detail URL을 새 history entry로 push
      window.history.pushState({}, "", `/?code=${encodeURIComponent(code)}`);
    }
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
    if (typeof window !== "undefined" && new URL(window.location.href).searchParams.has("code")) {
      window.history.pushState({}, "", "/");
    }
  }

  function handleSelectHomeTab(tab: HomeTab) {
    setHomeTab(tab);
    if (selectedCode) {
      handleBack();
    }
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
      className="fixed inset-x-0 bottom-0 w-full shrink-0 bg-white flex items-center px-3 py-2.5 gap-2 z-20 border-t md:static md:w-[72px] md:flex-col md:items-center md:justify-start md:px-0 md:py-5 md:gap-1 md:border-t-0 md:border-r"
      style={{ borderColor: "var(--c-border)" }}
    >
      <div className="hidden w-10 h-10 rounded-xl bg-primary items-center justify-center shrink-0 md:flex md:mb-5">
        <span className="text-white font-extrabold text-[15px] tracking-tight">Q</span>
      </div>

      <div className="flex min-w-0 w-full items-center gap-1 md:w-auto md:flex-none md:flex-col md:justify-start">
        <button type="button" onClick={() => handleSelectHomeTab(0)} title="관심종목"
          className="min-w-0 flex-1 h-12 px-2 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors cursor-pointer md:w-14 md:h-14 md:flex-none"
          style={{ background: homeTab === 0 ? "var(--c-hover-md)" : undefined }}>
          <IconStar active={homeTab === 0} />
          <span className={`text-[10px] leading-none font-semibold ${homeTab === 0 ? "text-ink" : "text-muted"}`}>관심종목</span>
        </button>
        <button type="button" onClick={() => handleSelectHomeTab(1)} title="시장현황"
          className="min-w-0 flex-1 h-12 px-2 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors cursor-pointer md:w-14 md:h-14 md:flex-none"
          style={{ background: homeTab === 1 ? "var(--c-hover-md)" : undefined }}>
          <IconBarChart active={homeTab === 1} />
          <span className={`text-[10px] leading-none font-semibold ${homeTab === 1 ? "text-ink" : "text-muted"}`}>시장현황</span>
        </button>
        <button type="button" onClick={() => handleSelectHomeTab(2)} title="스크리너"
          className="min-w-0 flex-1 h-12 px-2 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors cursor-pointer md:w-14 md:h-14 md:flex-none"
          style={{ background: homeTab === 2 ? "var(--c-hover-md)" : undefined }}>
          <IconFilter active={homeTab === 2} />
          <span className={`text-[10px] leading-none font-semibold ${homeTab === 2 ? "text-ink" : "text-muted"}`}>스크리너</span>
        </button>
        <button type="button" onClick={() => handleSelectHomeTab(3)} title="마이페이지"
          className="min-w-0 flex-1 h-12 px-2 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors cursor-pointer md:hidden"
          style={{ background: homeTab === 3 ? "var(--c-hover-md)" : undefined }}>
          <IconUser active={homeTab === 3} />
          <span className={`text-[10px] leading-none font-semibold ${homeTab === 3 ? "text-ink" : "text-muted"}`}>마이</span>
        </button>
      </div>

    </aside>
  );

  return (
    <div className="app-root flex min-h-screen flex-col overflow-x-hidden bg-canvas-dark pb-[86px] md:h-screen md:flex-row md:overflow-hidden md:pb-0">

      {leftNav}

      {selectedCode ? (

        /* ── 종목 상세 (전체화면) ────────────────────────── */
        <div className="flex-1 flex flex-col overflow-hidden bg-white">

          {/* 상세 헤더 */}
          <header
            className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-3 bg-white md:h-[52px] md:relative md:flex-nowrap md:gap-0 md:px-5 md:py-0"
            style={{ borderBottom: "1px solid var(--c-border)" }}
          >
            <div className="w-full order-2 md:w-auto md:order-none md:absolute search-center-wrapper md:left-[calc(50vw-72px)] md:-translate-x-1/2">
              <StockSearchBox onSelect={handleSelectStock} />
            </div>
            <button
              type="button" onClick={handleLogout}
              className="hidden md:inline-flex md:ml-auto shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium text-muted-strong hover:text-ink transition-colors cursor-pointer"
              style={{ background: "var(--c-hover)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--c-hover-lg)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--c-hover)")}
            >
              로그아웃
            </button>
          </header>

          {/* 상세 컨텐츠 */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[900px]">

              {/* 종목 헤더 + 가격 */}
              <div className="px-5 pt-8 pb-6" style={{ borderBottom: "1px solid var(--c-border)" }}>
                <div className="mb-5 flex flex-wrap items-start gap-4 sm:flex-nowrap sm:items-center">
                  <StockLogo code={selectedCode} name={displayName} size={52} rounded="xl" />
                  <div className="min-w-0 flex-1">
                    <h1 className="text-[24px] font-bold text-ink leading-tight sm:text-[28px]">{displayName}</h1>
                    <span className="text-[13px] text-muted font-mono">{selectedCode}</span>
                  </div>
                  {/* CTA 버튼 */}
                  <div className="flex w-full flex-wrap gap-2 shrink-0 sm:w-auto">
                    <button type="button" onClick={() => watchlist.toggle(selectedCode)}
                      className={`h-[44px] flex-1 sm:flex-none px-5 rounded-xl text-[14px] font-bold transition-colors cursor-pointer border ${
                        inWatchlist
                          ? "border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
                          : "text-body hover:text-ink"
                      }`}
                      style={inWatchlist ? {} : { border: "1px solid var(--c-border-strong)", background: "var(--c-bg-subtle)" }}>
                      {inWatchlist ? "★ 관심 해제" : "☆ 관심 추가"}
                    </button>
                    {!report && (
                      <button type="button" onClick={() => handleLoadOutlook()} disabled={outlookLoading}
                        className="h-[44px] flex-1 sm:flex-none px-5 rounded-xl bg-primary hover:bg-primary-active disabled:bg-primary-disabled text-white text-[14px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-2">
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
                  <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                    <span className="font-mono tabular text-[36px] sm:text-[48px] font-bold text-ink leading-none tracking-tight">
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
                  liveTick={liveTick}
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

              {/* 에러 */}
              {outlookError && (
                <div className="px-5 py-4 text-[14px] text-trading-down border-l-4 border-trading-down"
                  style={{ borderBottom: "1px solid var(--c-border)" }}>
                  {outlookError}
                </div>
              )}

              {/* 로딩 스켈레톤 */}
              {outlookLoading && !report && (
                <div className="px-5 py-6 space-y-3 animate-pulse">
                  <div className="h-4 w-20 rounded-lg" style={{ background: "var(--c-bg-muted)" }} />
                  <div className="h-8 w-36 rounded-lg" style={{ background: "var(--c-bg-muted)" }} />
                  <div className="h-3 w-52 rounded-lg" style={{ background: "var(--c-bg-muted)" }} />
                </div>
              )}

              {/* 전망 결과 */}
              {report && (
                <>
                  <div className="px-5 py-6" style={{ borderBottom: "1px solid var(--c-border)" }}>
                    <FinalVerdictCard score={report.score} ai={report.ai_signals[0]} autoSummary={report.summary} />
                  </div>
                  <div className="px-5 py-6" style={{ borderBottom: "1px solid var(--c-border)" }}>
                    <SignalBreakdownPanel quant={report.quant_signals} ai={report.ai_signals} />
                  </div>
                  <div className="px-5 py-6" style={{ borderBottom: "1px solid var(--c-border)" }}>
                    <TechnicalIndicatorsPanel stockCode={report.stock_code} />
                  </div>
                  {report.position_context && (
                    <div className="px-5 py-6" style={{ borderBottom: "1px solid var(--c-border)" }}>
                      <PositionContextCard ctx={report.position_context} />
                    </div>
                  )}
                  <div className="px-5 py-6" style={{ borderBottom: "1px solid var(--c-border)" }}>
                    <QuantSignalsTable
                      quant={report.quant_signals}
                      financial={report.financial_signals}
                      ai={report.ai_signals}
                      evidence={report.evidence}
                    />
                  </div>
                  <div className="px-5 py-6" style={{ borderBottom: "1px solid var(--c-border)" }}>
                    <EvidenceList evidence={report.evidence} />
                  </div>
                  <ErrorsBanner errors={report.errors} />
                </>
              )}

              <p
                className="text-[11px] text-muted px-5 py-3 leading-relaxed"
                style={{ borderTop: "1px solid var(--c-border)", background: "var(--c-bg-subtle)" }}
              >
                정보 제공용이며 투자 권유가 아닙니다. © Quantum Electronics
              </p>

            </div>
          </div>
        </div>

      ) : (

        /* ── 3-컬럼 홈 레이아웃 ──────────────────────────── */
        <div className="flex-1 flex flex-col overflow-hidden bg-white">

          {/* 공통 헤더 (center + right 패널 전체 너비) */}
          <header
            className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-3 bg-white md:h-[52px] md:relative md:flex-nowrap md:gap-0 md:px-5 md:py-0"
            style={{ borderBottom: "1px solid var(--c-border)" }}
          >
            <span className="text-[15px] font-bold text-ink">{HOME_TABS[homeTab]}</span>
            <div className="w-full order-3 md:w-auto md:order-none md:absolute search-center-wrapper md:left-[calc(50vw-72px)] md:-translate-x-1/2">
              <StockSearchBox onSelect={handleSelectStock} />
            </div>
            <button
              type="button" onClick={handleLogout}
              className="hidden md:inline-flex md:ml-auto shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium text-muted-strong hover:text-ink transition-colors cursor-pointer"
              style={{ background: "var(--c-hover)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--c-hover-lg)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--c-hover)")}
            >
              로그아웃
            </button>
          </header>

          {/* 헤더 아래 center + right 영역 */}
          <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">

            {/* 중앙 컬럼 */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
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
                  activeTab={rankActiveTab}
                  onTabChange={setRankActiveTab}
                />
              )}
              {homeTab === 2 && (
                <ScreenerSection
                  onSelect={handleSelectStock}
                  onHover={setHoveredStock}
                  onHoverEnd={() => setHoveredStock(null)}
                />
              )}
              {homeTab === 3 && (
                <section className="px-5 py-6">
                  <div className="mx-auto w-full max-w-[560px] rounded-2xl bg-white p-6 shadow-card"
                    style={{ border: "1px solid var(--c-border)" }}>
                    <div className="mb-5">
                      <h2 className="text-[20px] font-bold text-ink">마이페이지</h2>
                      <p className="mt-1 text-[13px] text-muted-strong">계정 관련 작업을 여기서 관리합니다.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="h-11 w-full rounded-xl bg-primary text-white text-[14px] font-bold transition-colors cursor-pointer hover:bg-primary-active"
                    >
                      로그아웃
                    </button>
                  </div>
                </section>
              )}
            </div>

            {/* 우측 프리뷰 패널 */}
            <aside
              className={`${homeTab === 3 ? "hidden" : "hidden lg:flex"} shrink-0 bg-white lg:h-full lg:w-[420px] lg:flex-col lg:overflow-hidden lg:border-l`}
              style={{ borderColor: "var(--c-border)" }}
            >
            {hoveredStock ? (
              (() => {
                const previewPrice = hoveredQuote?.price ?? hoveredStock.price;
                const previewChangeRate = hoveredQuote?.change_rate ?? hoveredStock.changeRate;
                const up = previewChangeRate > 0;
                const flat = previewChangeRate === 0;
                const previewBadge = flat
                  ? "text-muted"
                  : up ? "bg-trading-up/10 text-trading-up" : "bg-trading-down/10 text-trading-down";
                const previewBadgeStyle = flat ? { background: "var(--c-bg-muted)" } : {};
                return (
                  <div className="flex-1 flex flex-col overflow-y-auto">
                    <div className="px-5 pt-5 pb-4">
                      <div className="flex items-center gap-3 mb-4">
                        <StockLogo code={hoveredStock.code} name={hoveredStock.name} size={40} rounded="xl" />
                        <div className="min-w-0 flex-1">
                          <h1 className="text-[20px] font-bold text-ink leading-tight truncate">{hoveredStock.name}</h1>
                          <span className="text-[12px] text-muted font-mono">{hoveredStock.code}</span>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="font-mono tabular text-[36px] font-bold text-ink leading-none tracking-tight">
                          {previewPrice.toLocaleString("ko-KR")}
                        </span>
                        <span className="text-[14px] text-muted">원</span>
                      </div>
                      <span className={`font-mono tabular text-[13px] font-bold px-2.5 py-1 rounded-full ${previewBadge}`} style={previewBadgeStyle}>
                        {flat ? "0.00%" : `${up ? "+" : ""}${previewChangeRate.toFixed(2)}%`}
                      </span>
                    </div>
                    <div className="ml-5 mr-[72px]" style={{ borderTop: "1px solid var(--c-border)" }} />
                    <ChartAnalysisCard
                      stockCode={hoveredStock.code}
                      chartOnly
                    />
                    <div className="ml-5 mr-[72px]" style={{ borderTop: "1px solid var(--c-border)" }} />
                    <StockPreviewStats stockCode={hoveredStock.code} />
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
