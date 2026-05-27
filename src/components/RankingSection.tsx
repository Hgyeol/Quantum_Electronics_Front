"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchVolumeRanking,
  fetchForeignRanking,
  type RankItem,
  type RankSort,
  type RankInvestor,
} from "@/lib/api";
import StockLogo from "@/components/StockLogo";

type TabId = "volume" | "amount" | "foreign" | "institution";

const TABS: { id: TabId; label: string }[] = [
  { id: "volume",      label: "거래량" },
  { id: "amount",      label: "거래대금" },
  { id: "foreign",     label: "외국인 순매수" },
  { id: "institution", label: "기관 순매수" },
];

// 거래량/거래대금만 15초 폴링, 외국인/기관은 하루 4회 가집계라 폴링 불필요
const POLL_INTERVAL_MS = 15_000;
const REALTIME_TABS = new Set<TabId>(["volume", "amount"]);

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

interface Props {
  onSelect: (code: string, name: string) => void;
}

export default function RankingSection({ onSelect }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("volume");
  const [items, setItems] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const cacheRef = useRef<Partial<Record<TabId, RankItem[]>>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (tab: TabId, isRefresh = false) => {
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

  // 탭 변경 시 초기 로드 + 폴링 설정
  useEffect(() => {
    fetchData(activeTab);

    if (REALTIME_TABS.has(activeTab)) {
      timerRef.current = setInterval(() => {
        fetchData(activeTab, true);
      }, POLL_INTERVAL_MS);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTab, fetchData]);

  function extraLabel(tab: TabId): string {
    if (tab === "volume") return "거래량";
    if (tab === "amount") return "거래대금";
    if (tab === "foreign") return "외국인 순매수";
    return "기관 순매수";
  }

  function extraValue(item: RankItem, tab: TabId): string {
    if (tab === "volume") return formatVolume(item.volume);
    if (tab === "amount") return formatNumber(item.trade_value);
    return `${item.extra_value.toLocaleString("ko-KR")}주`;
  }

  return (
    <section className="bg-surface-card-dark rounded-xl shadow-card overflow-hidden">
      {/* 헤더 */}
      <header className="px-6 pt-4 pb-0 border-b border-hairline-on-dark">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-on-dark">시장 현황</h2>
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
        {/* 탭 */}
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-muted-strong"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* 컬럼 레이블 */}
      <div className="grid grid-cols-[2rem_1fr_6rem_5rem_6rem] gap-3 px-6 py-2.5 bg-surface-elevated-dark/60 border-b border-hairline-on-dark">
        <span className="text-[10px] uppercase tracking-widest text-muted text-center">순위</span>
        <span className="text-[10px] uppercase tracking-widest text-muted">종목명</span>
        <span className="text-[10px] uppercase tracking-widest text-muted text-right">현재가</span>
        <span className="text-[10px] uppercase tracking-widest text-muted text-right">등락률</span>
        <span className="text-[10px] uppercase tracking-widest text-muted text-right">{extraLabel(activeTab)}</span>
      </div>

      {/* 목록 */}
      <ul>
        {loading && (
          Array.from({ length: 10 }).map((_, i) => (
            <li key={i} className="grid grid-cols-[2rem_1fr_6rem_5rem_6rem] gap-3 px-6 py-3 border-t border-hairline-on-dark first:border-t-0 animate-pulse">
              <span className="w-4 h-3 rounded bg-surface-elevated-dark mx-auto" />
              <span className="flex items-center gap-2">
                <span className="w-20 h-3 rounded bg-surface-elevated-dark" />
              </span>
              <span className="w-14 h-3 rounded bg-surface-elevated-dark ml-auto" />
              <span className="w-12 h-5 rounded-lg bg-surface-elevated-dark ml-auto" />
              <span className="w-12 h-3 rounded bg-surface-elevated-dark ml-auto" />
            </li>
          ))
        )}

        {error && !loading && (
          <li className="px-6 py-8 text-center text-sm text-muted">{error}</li>
        )}

        {!loading && !error && items.map((item) => {
          const up = item.change_rate > 0;
          const flat = item.change_rate === 0;
          const badgeBg = flat
            ? "bg-surface-elevated-dark text-muted"
            : up
              ? "bg-trading-up/10 text-trading-up"
              : "bg-trading-down/10 text-trading-down";
          const glyph = flat ? "" : up ? "▲" : "▼";

          return (
            <li
              key={item.stock_code}
              onClick={() => onSelect(item.stock_code, item.stock_name)}
              className="grid grid-cols-[2rem_1fr_6rem_5rem_6rem] gap-3 items-center px-6 py-3 border-t border-hairline-on-dark first:border-t-0 hover:bg-canvas-dark cursor-pointer transition-colors"
            >
              {/* 순위 */}
              <span className={`text-xs font-mono font-bold text-center select-none ${
                item.rank <= 3 ? "text-primary" : "text-muted"
              }`}>
                {item.rank}
              </span>

              {/* 종목명 */}
              <span className="flex items-center gap-2.5 min-w-0">
                <StockLogo code={item.stock_code} name={item.stock_name} size={32} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-on-dark truncate leading-tight">
                    {item.stock_name || item.stock_code}
                  </span>
                  <span className="block text-[11px] text-muted font-mono">{item.stock_code}</span>
                </span>
              </span>

              {/* 현재가 */}
              <span className="text-right font-mono text-sm font-semibold text-on-dark tabular">
                {item.price.toLocaleString("ko-KR")}
                <span className="text-[10px] text-muted font-normal ml-0.5">원</span>
              </span>

              {/* 등락률 */}
              <span className="flex justify-end">
                <span className={`inline-flex items-center gap-0.5 font-mono tabular text-xs font-semibold px-2 py-1 rounded-lg ${badgeBg}`}>
                  {glyph && <span className="text-[9px]">{glyph}</span>}
                  {flat ? "0.00%" : `${Math.abs(item.change_rate).toFixed(2)}%`}
                </span>
              </span>

              {/* 거래량/거래대금/순매수 */}
              <span className="text-right font-mono text-xs text-muted-strong tabular">
                {extraValue(item, activeTab)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
