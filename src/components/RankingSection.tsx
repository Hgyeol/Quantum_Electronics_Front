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
import { StockList, COLS, NameCell, PriceCell, ChangeRateBadge, RankCell, MutedNumber } from "@/components/StockList";
import { useAutoStockHover } from "@/lib/useAutoStockHover";

export type TabId = "volume" | "amount" | "foreign" | "institution" | "gainer";

const TABS: { id: TabId; label: string }[] = [
  { id: "volume",      label: "거래량" },
  { id: "amount",      label: "거래대금" },
  { id: "gainer",      label: "급등주" },
  { id: "foreign",     label: "외국인" },
  { id: "institution", label: "기관" },
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
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
}

export default function RankingSection({ onSelect, onHover, onHoverEnd, activeTab: activeTabProp, onTabChange }: Props) {
  const [activeTabInner, setActiveTabInner] = useState<TabId>("volume");
  const activeTab = activeTabProp ?? activeTabInner;
  const setActiveTab = (tab: TabId) => { onTabChange ? onTabChange(tab) : setActiveTabInner(tab); };
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

  const autoHover = useAutoStockHover({
    items,
    getKey: (i) => i.stock_code,
    toHoverPayload: (i) => ({
      code: i.stock_code,
      name: i.stock_name,
      price: i.price,
      changeRate: i.change_rate,
    }),
    onHover,
    onHoverEnd,
    resetKey: activeTab,
    enabled: isTabAvailable(activeTab) && !loading && !error,
  });

  return (
    <section>

      {/* 헤더 */}
      <header className="px-5 pt-4 pb-0 bg-white" style={{ borderBottom: "1px solid var(--c-border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs ml-auto">
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

      {/* 비집계 시간대 안내 */}
      {!loading && !isTabAvailable(activeTab) && (
        <div className="px-5 py-10 text-center">
          <p className="text-[13px] font-semibold text-ink mb-1">아직 집계 전이에요</p>
          <p className="text-xs text-muted">{NOT_YET[activeTab]}</p>
        </div>
      )}

      {error && !loading && (
        <div className="px-5 py-8 text-center text-sm text-muted">{error}</div>
      )}

      {/* 종목 목록 */}
      {isTabAvailable(activeTab) && !error && (
        <StockList
          items={items}
          getKey={(i) => i.stock_code}
          hoveredKey={autoHover.hoveredKey}
          onSelect={(i) => onSelect(i.stock_code, i.stock_name)}
          onRowHover={autoHover.handleRowHover}
          loading={loading}
          loadingRows={10}
          emptyMessage={
            <div>
              <p className="text-[13px] font-semibold text-ink mb-1">데이터가 없습니다</p>
              <p className="text-xs text-muted">장 마감 후에는 데이터가 제공되지 않을 수 있습니다.</p>
            </div>
          }
          columns={[
            { ...COLS.rank, mobileHidden: true, render: (i) => <RankCell rank={i.rank} /> },
            { ...COLS.name,   render: (i) => <NameCell code={i.stock_code} name={i.stock_name} /> },
            { ...COLS.price,  render: (i) => <PriceCell price={i.price} /> },
            { ...COLS.change, render: (i) => <ChangeRateBadge rate={i.change_rate} /> },
            { ...COLS.volume, key: "extra", label: extraLabel(activeTab), mobileHidden: true,
              render: (i) => <MutedNumber>{extraValue(i, activeTab)}</MutedNumber> },
          ]}
        />
      )}
    </section>
  );
}
