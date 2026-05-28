"use client";

import { useEffect, useRef, useState } from "react";
import { fetchWatchlist, fetchVolumeRanking, fetchForeignRanking, type WatchlistItem } from "@/lib/api";
import StockLogo from "@/components/StockLogo";

type SortType = "default" | "volume" | "amount" | "foreign" | "institution";

const SORT_TABS: { id: SortType; label: string }[] = [
  { id: "default",     label: "기본" },
  { id: "volume",      label: "거래량" },
  { id: "amount",      label: "거래대금" },
  { id: "foreign",     label: "외국인" },
  { id: "institution", label: "기관" },
];

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
  .replace(/^http/, "ws");

interface HoverPayload {
  code: string;
  name: string;
  price: number;
  changeRate: number;
}

interface Props {
  codes: string[];
  onSelect: (code: string, name?: string | null) => void;
  onRemove: (code: string) => void;
  activeCode?: string | null;
  onHover?: (stock: HoverPayload) => void;
  onHoverEnd?: () => void;
}

function formatTradeValue(tradeValue: number): string {
  if (tradeValue >= 1e12) return `${Math.floor(tradeValue / 1e11) / 10}조`;
  if (tradeValue >= 1e8) return `${Math.floor(tradeValue / 1e8)}억`;
  if (tradeValue >= 1e4) return `${Math.floor(tradeValue / 1e4)}만`;
  return "—";
}

function SkeletonRow() {
  return (
    <li className="flex items-center gap-4 px-6 py-4 border-t border-hairline-on-dark first:border-t-0 animate-pulse">
      <span className="w-5 h-3 rounded bg-surface-elevated-dark" />
      <span className="w-10 h-10 rounded-xl bg-surface-elevated-dark shrink-0" />
      <span className="flex-1 space-y-1.5">
        <span className="block w-24 h-3.5 rounded bg-surface-elevated-dark" />
        <span className="block w-14 h-2.5 rounded bg-surface-elevated-dark" />
      </span>
      <span className="w-20 h-4 rounded bg-surface-elevated-dark" />
      <span className="w-16 h-7 rounded-lg bg-surface-elevated-dark" />
      <span className="w-14 h-3 rounded bg-surface-elevated-dark" />
    </li>
  );
}

export default function WatchlistTable({
  codes,
  onSelect,
  onRemove,
  activeCode,
  onHover,
  onHoverEnd,
}: Props) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>("default");
  const [extraMap, setExtraMap] = useState<Map<string, number>>(new Map());
  const [extraLoading, setExtraLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const codesKey = codes.join(",");

  // 외국인/기관 정렬 선택 시 랭킹 데이터 조회
  useEffect(() => {
    if (sortBy !== "foreign" && sortBy !== "institution") { setExtraMap(new Map()); return; }
    setExtraLoading(true);
    const fetchFn = sortBy === "foreign"
      ? fetchForeignRanking("foreign", 100)
      : fetchForeignRanking("institution", 100);
    fetchFn
      .then((ranking) => {
        const map = new Map<string, number>();
        ranking.forEach((r) => map.set(r.stock_code, r.extra_value));
        setExtraMap(map);
      })
      .catch(() => {})
      .finally(() => setExtraLoading(false));
  }, [sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  // 정렬된 codes 계산
  const sortedCodes = (() => {
    if (sortBy === "default") return codes;
    return [...codes].sort((a, b) => {
      const ia = items.find((i) => i.stock_code === a);
      const ib = items.find((i) => i.stock_code === b);
      if (sortBy === "volume") return (ib?.volume ?? 0) - (ia?.volume ?? 0);
      if (sortBy === "amount") return (ib?.trade_value ?? 0) - (ia?.trade_value ?? 0);
      return (extraMap.get(b) ?? 0) - (extraMap.get(a) ?? 0);
    });
  })();

  // 초기 REST 조회
  useEffect(() => {
    if (codes.length === 0) { setItems([]); setFetched(false); return; }
    setLoading(true);
    setFetched(false);
    fetchWatchlist(codes)
      .then(setItems)
      .catch(() => {})
      .finally(() => { setLoading(false); setFetched(true); });
  }, [codesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // WebSocket 실시간 구독 (실패 시 10초 폴링 폴백)
  useEffect(() => {
    if (codes.length === 0) return;

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let ws: WebSocket | null = null;
    let wsOk = false;

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => {
        fetchWatchlist(codes).then(setItems).catch(() => {});
      }, 10_000);
    };

    try {
      ws = new WebSocket(`${WS_BASE}/ws/watchlist?codes=${codesKey}`);
      wsRef.current = ws;

      ws.onopen = () => { wsOk = true; setWsConnected(true); };

      ws.onclose = () => {
        setWsConnected(false);
        if (!wsOk) startPolling(); // WebSocket이 연결조차 안 됐으면 폴링
      };

      ws.onerror = () => {
        setWsConnected(false);
      };

      ws.onmessage = (e) => {
        try {
          const tick = JSON.parse(e.data) as {
            stock_code: string;
            price: number;
            change: number;
            change_rate: number;
            volume: number;
            trade_value: number;
          };
          setItems((prev) =>
            prev.map((item) =>
              item.stock_code === tick.stock_code
                ? { ...item, price: tick.price, change: tick.change, change_rate: tick.change_rate, volume: tick.volume, trade_value: tick.trade_value }
                : item,
            ),
          );
        } catch {
          // ignore malformed message
        }
      };
    } catch {
      startPolling();
    }

    return () => {
      ws?.close();
      wsRef.current = null;
      setWsConnected(false);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [codesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (codes.length === 0) return null;

  return (
    <section>
      {/* Header */}
      <header className="px-5 pt-4 pb-0 bg-white" style={{ borderBottom: "1px solid var(--c-border)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-ink">관심종목</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-mono">{codes.length}개 종목</span>
            {wsConnected ? (
              <span className="flex items-center gap-1 text-xs text-trading-up font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-trading-up animate-pulse inline-block" />
                실시간
              </span>
            ) : (
              <span className="text-xs text-muted">장중 기준</span>
            )}
          </div>
        </div>
        {/* 정렬 탭 (TDS underline) */}
        <div className="flex gap-0">
          {SORT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSortBy(tab.id)}
              className={`px-4 py-2 text-[13px] transition-colors cursor-pointer border-b-2 ${
                sortBy === tab.id
                  ? "border-ink text-ink font-bold"
                  : "border-transparent text-muted-strong hover:text-body font-medium"
              }`}
            >
              {tab.label}
              {extraLoading && (tab.id === "foreign" || tab.id === "institution") && tab.id === sortBy && (
                <span className="ml-1 w-2.5 h-2.5 border border-muted border-t-primary rounded-full animate-spin inline-block align-middle" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Column labels */}
      <div className="grid grid-cols-[2.5rem_1fr_6.5rem_6rem_5.5rem_2rem] gap-3 px-5 py-2 text-[10px] text-muted" style={{ background: "var(--c-bg-subtle)" }}>
        <span className="text-center">순위</span>
        <span>종목명</span>
        <span className="text-right">현재가</span>
        <span className="text-right">등락률</span>
        <span className="text-right">
          {sortBy === "volume" ? "거래량" : sortBy === "foreign" ? "외국인순매수" : sortBy === "institution" ? "기관순매수" : "거래대금"}
        </span>
        <span />
      </div>

      <ul>
        {loading && items.length === 0
          ? codes.map((c) => <SkeletonRow key={c} />)
          : sortedCodes.map((code, idx) => {
              const item = items.find((i) => i.stock_code === code);
              const isActive = activeCode === code;
              const up = item ? item.change_rate > 0 : null;
              const flat = item ? item.change_rate === 0 : null;

              const badgeBg = flat
                ? "text-muted"
                : up
                  ? "bg-trading-up/10 text-trading-up"
                  : "bg-trading-down/10 text-trading-down";
              const badgeStyle = flat ? { background: "var(--c-bg-muted)" } : {};

              return (
                <li
                  key={code}
                  className="group"
                  style={{
                    borderTop: idx > 0 ? "1px solid var(--c-border)" : undefined,
                    background: isActive ? "rgba(49,130,246,0.06)" : undefined,
                  }}
                >
                  <div
                    className="grid grid-cols-[2.5rem_1fr_6.5rem_6rem_5.5rem_2rem] gap-3 items-center px-5 py-3 cursor-pointer transition-colors"
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = "var(--c-hover)";
                      if (item) onHover?.({ code, name: item.stock_name ?? code, price: item.price, changeRate: item.change_rate });
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "";
                      onHoverEnd?.();
                    }}
                    onClick={() => onSelect(code, item?.stock_name)}
                  >
                    {/* 순위 */}
                    <span className="text-sm font-mono font-semibold text-muted-strong text-center select-none">
                      {idx + 1}
                    </span>

                    {/* 아바타 + 종목명 */}
                    <span className="flex items-center gap-3 min-w-0">
                      <StockLogo code={code} name={item?.stock_name ?? null} size={40} />
                      <span className="min-w-0">
                        <span
                          className={`block text-[15px] font-semibold truncate leading-tight ${
                            isActive ? "text-primary" : "text-on-dark"
                          }`}
                        >
                          {item?.stock_name ?? code}
                        </span>
                        <span className="block text-[11px] text-muted font-mono mt-0.5">
                          {code}
                        </span>
                      </span>
                    </span>

                    {/* 현재가 */}
                    <span className="text-right whitespace-nowrap">
                      {loading && !fetched ? (
                        <span className="inline-block w-16 h-3 rounded animate-pulse" style={{ background: "var(--c-border)" }} />
                      ) : item ? (
                        <span className="font-mono tabular text-[13px] font-semibold text-ink">
                          {item.price.toLocaleString("ko-KR")}<span className="text-[10px] text-muted font-normal ml-0.5">원</span>
                        </span>
                      ) : (
                        <span className="font-mono text-sm text-muted">—</span>
                      )}
                    </span>

                    {/* 등락률 뱃지 */}
                    <span className="flex justify-end">
                      {loading && !fetched ? (
                        <span className="inline-block w-14 h-6 rounded-full animate-pulse" style={{ background: "var(--c-border)" }} />
                      ) : item ? (
                        <span className={`font-mono tabular text-[12px] font-bold px-2 py-1 rounded-full ${badgeBg}`} style={badgeStyle}>
                          {flat ? "0.00%" : `${up ? "+" : ""}${item.change_rate.toFixed(2)}%`}
                        </span>
                      ) : (
                        <span className="font-mono text-sm text-muted px-2 py-1">—</span>
                      )}
                    </span>

                    {/* 거래량/거래대금/순매수 */}
                    <span className="text-right">
                      {loading && !fetched ? (
                        <span className="inline-block w-12 h-3 rounded animate-pulse" style={{ background: "var(--c-border)" }} />
                      ) : item ? (
                        <span className="font-mono tabular text-[12px] text-muted-strong">
                          {sortBy === "volume"
                            ? `${Math.round(item.volume / 1e4)}만주`
                            : sortBy === "foreign" || sortBy === "institution"
                              ? extraMap.has(code)
                                ? `${(extraMap.get(code)!).toLocaleString("ko-KR")}주`
                                : "—"
                              : formatTradeValue(item.trade_value)}
                        </span>
                      ) : (
                        <span className="font-mono text-sm text-muted">—</span>
                      )}
                    </span>

                    {/* 삭제 */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRemove(code); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-trading-down text-lg leading-none cursor-pointer text-center"
                      aria-label="관심 해제"
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
      </ul>
    </section>
  );
}
