"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { fetchWatchlist, fetchForeignRanking, type WatchlistItem } from "@/lib/api";
import { StockList, COLS, NameCell, PriceCell, ChangeRateBadge, RankCell, MutedNumber } from "@/components/StockList";
import { useAutoStockHover } from "@/lib/useAutoStockHover";

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

function kstMinutes(): number {
  const now = new Date();
  return ((now.getUTCHours() + 9) * 60 + now.getUTCMinutes()) % (24 * 60);
}

function isSortAvailable(sort: SortType): boolean {
  if (sort === "foreign")     return kstMinutes() >= 9 * 60 + 30;
  if (sort === "institution") return kstMinutes() >= 10 * 60;
  return true;
}

const SORT_NOT_YET: Partial<Record<SortType, string>> = {
  foreign:     "외국인 순매수는 오전 9:30부터 집계됩니다.",
  institution: "기관 순매수는 오전 10:00부터 집계됩니다.",
};

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

interface Row {
  stock_code: string;
  stock_name: string | null;
  price: number | null;
  change_rate: number | null;
  volume: number | null;
  trade_value: number | null;
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
  const [wsDisconnected, setWsDisconnected] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>("default");
  const [extraMap, setExtraMap] = useState<Map<string, number>>(new Map());
  const [extraLoading, setExtraLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [wsRetryKey, setWsRetryKey] = useState(0);

  const codesKey = codes.join(",");

  // 외국인/기관 정렬 선택 시 랭킹 데이터 조회
  useEffect(() => {
    if (sortBy !== "foreign" && sortBy !== "institution") { setExtraMap(new Map()); return; }
    if (!isSortAvailable(sortBy)) { setExtraMap(new Map()); return; }
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

      ws.onopen = () => { wsOk = true; setWsConnected(true); setWsDisconnected(false); };

      ws.onclose = () => {
        setWsConnected(false);
        if (wsOk) {
          setWsDisconnected(true); // 연결됐다가 끊긴 경우
        } else {
          startPolling(); // 연결 자체를 못 한 경우 폴링
        }
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
  }, [codesKey, wsRetryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows: Row[] = sortedCodes.map((code) => {
    const item = items.find((i) => i.stock_code === code);
    return {
      stock_code: code,
      stock_name: item?.stock_name ?? null,
      price: item?.price ?? null,
      change_rate: item?.change_rate ?? null,
      volume: item?.volume ?? null,
      trade_value: item?.trade_value ?? null,
    };
  });

  const autoHover = useAutoStockHover({
    items: rows,
    getKey: (row) => row.stock_code,
    toHoverPayload: (row) => {
      if (row.price == null || row.change_rate == null) return null;
      return {
        code: row.stock_code,
        name: row.stock_name ?? row.stock_code,
        price: row.price,
        changeRate: row.change_rate,
      };
    },
    onHover,
    onHoverEnd,
    resetKey: `${sortBy}:${codesKey}`,
    enabled: rows.length > 0 && fetched,
  });

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
            ) : wsDisconnected ? (
              <span className="flex items-center gap-1.5">
                <span className="text-xs text-trading-down font-semibold">실시간 연결 끊김</span>
                <button
                  type="button"
                  onClick={() => { setWsRetryKey((k) => k + 1); setWsDisconnected(false); }}
                  className="text-[11px] px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-colors text-primary"
                  style={{ border: "1px solid currentColor" }}
                >
                  재연결
                </button>
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

      {!isSortAvailable(sortBy) && SORT_NOT_YET[sortBy] && (
        <div className="mx-5 my-3 px-4 py-3 rounded-lg text-xs text-muted-strong" style={{ background: "var(--c-bg-muted)" }}>
          ⏰ {SORT_NOT_YET[sortBy]}
        </div>
      )}

      {(() => {
        const extraLabelText =
          sortBy === "volume" ? "거래량"
            : sortBy === "foreign" ? "외국인순매수"
              : sortBy === "institution" ? "기관순매수"
                : "거래대금";

        function extraRender(row: Row): ReactNode {
          if (loading && !fetched) {
            return <span className="inline-block w-12 h-3 rounded animate-pulse" style={{ background: "var(--c-border)" }} />;
          }
          if (sortBy === "volume" && row.volume != null) {
            return <MutedNumber>{`${row.volume.toLocaleString("ko-KR")}주`}</MutedNumber>;
          }
          if ((sortBy === "foreign" || sortBy === "institution") && extraMap.has(row.stock_code)) {
            return <MutedNumber>{`${extraMap.get(row.stock_code)!.toLocaleString("ko-KR")}주`}</MutedNumber>;
          }
          if ((sortBy === "amount" || sortBy === "default") && row.trade_value != null) {
            return <MutedNumber>{formatTradeValue(row.trade_value)}</MutedNumber>;
          }
          return <span className="font-mono text-sm text-muted">—</span>;
        }

        return (
          <StockList
            items={rows}
            getKey={(r) => r.stock_code}
            activeKey={activeCode ?? null}
            hoveredKey={autoHover.hoveredKey}
            onSelect={(r) => onSelect(r.stock_code, r.stock_name)}
            onRowHover={autoHover.handleRowHover}
            loading={loading && items.length === 0}
            loadingRows={codes.length}
            columns={[
              { ...COLS.rank, label: "순위", mobileHidden: true, render: (_r, idx) => <RankCell rank={idx + 1} /> },
              { ...COLS.name, render: (r) => (
                <NameCell code={r.stock_code} name={r.stock_name} size={40} active={activeCode === r.stock_code} />
              ) },
              { ...COLS.price, render: (r) =>
                loading && !fetched
                  ? <span className="inline-block w-16 h-3 rounded animate-pulse" style={{ background: "var(--c-border)" }} />
                  : <PriceCell price={r.price} />
              },
              { ...COLS.change, render: (r) =>
                loading && !fetched
                  ? <span className="inline-block w-14 h-6 rounded-full animate-pulse" style={{ background: "var(--c-border)" }} />
                  : <ChangeRateBadge rate={r.change_rate} />
              },
              { ...COLS.volume, key: "extra", label: extraLabelText, mobileHidden: true, render: extraRender },
              { ...COLS.remove, mobileHidden: true, render: (r) => (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(r.stock_code); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-trading-down text-lg leading-none cursor-pointer"
                  aria-label="관심 해제"
                >
                  ×
                </button>
              ) },
            ]}
          />
        );
      })()}
    </section>
  );
}
