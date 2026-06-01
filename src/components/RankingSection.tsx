"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchVolumeRanking,
  fetchForeignRanking,
  fetchFluctuationRanking,
  type RankItem,
  type RankSort,
  type RankInvestor,
} from "@/lib/api";
import StockLogo from "@/components/StockLogo";

type TabId = "volume" | "amount" | "foreign" | "institution" | "gainer";

const TABS: { id: TabId; label: string }[] = [
  { id: "volume",      label: "거래량" },
  { id: "amount",      label: "거래대금" },
  { id: "gainer",      label: "급등주" },
  { id: "foreign",     label: "외국인 순매수" },
  { id: "institution", label: "기관 순매수" },
];

const POLL_INTERVAL_MS = 15_000;
const REALTIME_TABS = new Set<TabId>(["volume", "amount", "gainer"]);

function kstMinutes(): number {
  const now = new Date();
  return ((now.getUTCHours() + 9) * 60 + now.getUTCMinutes()) % (24 * 60);
}

function isTabAvailable(tab: TabId): boolean {
  if (tab === "foreign")     return kstMinutes() >= 9 * 60 + 30;
  if (tab === "institution") return kstMinutes() >= 10 * 60;
  return true;
}

const NOT_YET: Record<string, string> = {
  foreign:     "외국인 순매수는 오전 9:30부터 첫 집계가 시작됩니다.",
  institution: "기관 순매수는 오전 10:00부터 첫 집계가 시작됩니다.",
};

function formatNumber(n: number): string {
  if (n >= 1e12) return `${Math.floor(n / 1e11) / 10}조`;
  if (n >= 1e8) return `${Math.floor(n / 1e8)}억`;
  if (n >= 1e4) return `${Math.floor(n / 1e4)}만`;
  return n.toLocaleString("ko-KR");
}

function formatVolume(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억주`;
  if (n >= 1e4) return `${Math.round(n / 1e4)}만주`;
  return `${n.toLocaleString("ko-KR")}주`;
}

interface HoverPayload {
  code: string;
  name: string;
  price: number;
  changeRate: number;
}

interface Props {
  onSelect: (code: string, name: string) => void;
  onHover?: (stock: HoverPayload) => void;
  onHoverEnd?: () => void;
}

export default function RankingSection({ onSelect, onHover, onHoverEnd }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("volume");
  const [items, setItems] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const cacheRef = useRef<Partial<Record<TabId, RankItem[]>>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (tab: TabId, isRefresh = false) => {
    if (!isTabAvailable(tab)) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (isRefresh) {
      setRefreshing(true);
    } else {
      const cached = cacheRef.current[tab];
      if (cached) { setItems(cached); return; }
      setLoading(true);
    }
    setError(null);
    try {
      let data: RankItem[];
      if (tab === "volume" || tab === "amount") {
        data = await fetchVolumeRanking(tab as RankSort, 30);
      } else if (tab === "gainer") {
        data = await fetchFluctuationRanking(30);
      } else {
        data = await fetchForeignRanking(tab as RankInvestor, 30);
      }
      cacheRef.current[tab] = data;
      setItems(data);
      setLastUpdated(new Date());
    } catch {
      if (!isRefresh) setError("데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(activeTab);
    if (REALTIME_TABS.has(activeTab)) {
      timerRef.current = setInterval(() => fetchData(activeTab, true), POLL_INTERVAL_MS);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeTab, fetchData]);

  function extraLabel(tab: TabId): string {
    if (tab === "volume") return "거래량";
    if (tab === "amount") return "거래대금";
    if (tab === "foreign") return "외국인 순매수";
    if (tab === "gainer") return "거래량";
    return "기관 순매수";
  }

  function extraValue(item: RankItem, tab: TabId): string {
    if (tab === "volume") return formatVolume(item.volume);
    if (tab === "amount") return formatNumber(item.trade_value);
    if (tab === "gainer") return formatVolume(item.volume);
    return `${item.extra_value.toLocaleString("ko-KR")}주`;
  }

  return (
    <section>

      {/* 헤더 */}
      <header className="px-5 pt-4 pb-0 bg-white" style={{ borderBottom: "1px solid var(--c-border)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-ink">시장 현황</h2>
          <div className="flex items-center gap-2 text-xs">
            {REALTIME_TABS.has(activeTab) && (
              refreshing ? (
                <span className="flex items-center gap-1 text-muted">
                  <span className="w-3 h-3 border border-muted border-t-primary rounded-full animate-spin inline-block" />
                  갱신 중
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-strong">
                  <span className="w-1.5 h-1.5 rounded-full bg-trading-up animate-pulse inline-block" />
                  15초 갱신
                </span>
              )
            )}
            {lastUpdated && (
              <span className="text-muted font-mono">
                {lastUpdated.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        {/* 탭 (TDS underline style) */}
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-[13px] transition-colors cursor-pointer border-b-2 ${
                activeTab === tab.id
                  ? "border-ink text-ink font-bold"
                  : "border-transparent text-muted-strong hover:text-body font-medium"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* 컬럼 헤더 */}
      <div
        className="grid grid-cols-[2rem_1fr_5rem_5rem_5.5rem] gap-2 px-5 py-2 text-[10px] text-muted"
        style={{ background: "var(--c-bg-subtle)" }}
      >
        <span className="text-center">#</span>
        <span>종목명</span>
        <span className="text-right">현재가</span>
        <span className="text-right">등락률</span>
        <span className="text-right">{extraLabel(activeTab)}</span>
      </div>

      {/* 목록 */}
      <ul>
        {loading && Array.from({ length: 10 }).map((_, i) => (
          <li
            key={i}
            className="grid grid-cols-[2rem_1fr_5rem_5rem_5.5rem] gap-2 px-5 py-3.5 animate-pulse"
            style={{ borderTop: i > 0 ? "1px solid var(--c-border)" : undefined }}
          >
            <span className="w-4 h-3 rounded mx-auto mt-1" style={{ background: "var(--c-border)" }} />
            <span className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl shrink-0" style={{ background: "var(--c-border)" }} />
              <span className="flex-1 space-y-1.5">
                <span className="block w-20 h-3 rounded" style={{ background: "var(--c-border)" }} />
                <span className="block w-12 h-2 rounded" style={{ background: "var(--c-hover)" }} />
              </span>
            </span>
            <span className="w-14 h-3 rounded ml-auto mt-2" style={{ background: "var(--c-border)" }} />
            <span className="w-12 h-5 rounded-full ml-auto mt-1" style={{ background: "var(--c-border)" }} />
            <span className="w-12 h-3 rounded ml-auto mt-2" style={{ background: "var(--c-border)" }} />
          </li>
        ))}

        {!loading && !isTabAvailable(activeTab) && (
          <li className="px-5 py-10 text-center">
            <p className="text-[13px] font-semibold text-ink mb-1">아직 집계 전이에요</p>
            <p className="text-xs text-muted">{NOT_YET[activeTab]}</p>
          </li>
        )}

        {error && !loading && (
          <li className="px-5 py-8 text-center text-sm text-muted">{error}</li>
        )}

        {!loading && !error && isTabAvailable(activeTab) && items.length === 0 && (
          <li className="px-5 py-10 text-center">
            <p className="text-[13px] font-semibold text-ink mb-1">데이터가 없습니다</p>
            <p className="text-xs text-muted">장 마감 후에는 데이터가 제공되지 않을 수 있습니다.</p>
          </li>
        )}

        {!loading && !error && items.map((item, idx) => {
          const up = item.change_rate > 0;
          const flat = item.change_rate === 0;
          const badgeBg = flat
            ? "text-muted"
            : up
              ? "bg-trading-up/10 text-trading-up"
              : "bg-trading-down/10 text-trading-down";
          const badgeStyle = flat ? { background: "var(--c-bg-muted)" } : {};

          return (
            <li
              key={item.stock_code}
              onClick={() => onSelect(item.stock_code, item.stock_name)}
              className="grid grid-cols-[2rem_1fr_5rem_5rem_5.5rem] gap-2 items-center px-5 py-3 cursor-pointer transition-colors"
              style={{ borderTop: idx > 0 ? "1px solid var(--c-border)" : undefined }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--c-hover)";
                onHover?.({ code: item.stock_code, name: item.stock_name, price: item.price, changeRate: item.change_rate });
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "";
                onHoverEnd?.();
              }}
            >
              {/* 순위 */}
              <span className={`text-[13px] font-bold text-center select-none tabular font-mono ${
                item.rank <= 3 ? "text-primary" : "text-muted"
              }`}>
                {item.rank}
              </span>

              {/* 종목명 */}
              <span className="flex items-center gap-2 min-w-0">
                <StockLogo code={item.stock_code} name={item.stock_name} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-ink truncate leading-tight">
                    {item.stock_name || item.stock_code}
                  </span>
                  <span className="block text-[11px] text-muted font-mono">{item.stock_code}</span>
                </span>
              </span>

              {/* 현재가 */}
              <span className="text-right whitespace-nowrap">
                <span className="font-mono text-[13px] font-semibold text-ink tabular">
                  {item.price.toLocaleString("ko-KR")}<span className="text-[10px] text-muted font-normal ml-0.5">원</span>
                </span>
              </span>

              {/* 등락률 */}
              <span className="flex justify-end">
                <span className={`font-mono tabular text-[12px] font-bold px-2 py-1 rounded-full ${badgeBg}`} style={badgeStyle}>
                  {flat ? "0.00%" : `${up ? "+" : ""}${item.change_rate.toFixed(2)}%`}
                </span>
              </span>

              {/* 거래량/거래대금/순매수 */}
              <span className="text-right font-mono text-[12px] text-muted tabular">
                {extraValue(item, activeTab)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
