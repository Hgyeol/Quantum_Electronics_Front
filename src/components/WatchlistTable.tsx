"use client";

import { useEffect, useState } from "react";
import { fetchWatchlist, type WatchlistItem } from "@/lib/api";

interface Props {
  codes: string[];
  onSelect: (code: string) => void;
  onRemove: (code: string) => void;
  activeCode?: string | null;
}

const AVATAR_PALETTE = [
  "#3182F6", "#F04452", "#1B64DA", "#F5A623", "#9B59B6",
  "#0DB3A8", "#FF6B35", "#27AE60", "#C0392B", "#8E44AD",
];

function avatarColor(code: string) {
  let h = 0;
  for (const c of code) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function StockAvatar({ name, code }: { name: string | null; code: string }) {
  const bg = avatarColor(code);
  return (
    <span
      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 select-none"
      style={{ backgroundColor: bg }}
    >
      {(name ?? code).charAt(0)}
    </span>
  );
}

function formatEok(volume: number, price: number): string {
  const eok = (volume * price) / 1e8;
  if (eok >= 1000) return `${(eok / 1000).toFixed(1)}조`;
  if (eok >= 100) return `${Math.round(eok)}억`;
  if (eok >= 1) return `${eok.toFixed(1)}억`;
  const man = (volume * price) / 1e4;
  if (man >= 1) return `${Math.round(man)}만`;
  return "—";
}

function SkeletonRow() {
  return (
    <li className="flex items-center gap-4 px-6 py-4 border-t border-hairline-on-dark first:border-t-0 animate-pulse">
      <span className="w-5 h-3 rounded bg-surface-elevated-dark" />
      <span className="w-10 h-10 rounded-full bg-surface-elevated-dark shrink-0" />
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
}: Props) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (codes.length === 0) { setItems([]); setFetched(false); return; }
    setLoading(true);
    setFetched(false);
    fetchWatchlist(codes)
      .then(setItems)
      .catch(() => {})
      .finally(() => { setLoading(false); setFetched(true); });
  }, [codes.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (codes.length === 0) return null;

  return (
    <section className="bg-surface-card-dark rounded-xl shadow-card overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-hairline-on-dark flex items-center justify-between">
        <h2 className="text-sm font-semibold text-on-dark">관심종목</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted font-mono">
            {codes.length}개 종목
          </span>
          <span className="text-xs text-muted">장중 기준</span>
        </div>
      </header>

      {/* Column labels */}
      <div className="grid grid-cols-[2.5rem_1fr_6.5rem_6rem_5.5rem_2rem] gap-4 px-6 py-2.5 border-b border-hairline-on-dark bg-surface-elevated-dark/60">
        <span className="text-[10px] uppercase tracking-widest text-muted text-center">순위</span>
        <span className="text-[10px] uppercase tracking-widest text-muted">종목명</span>
        <span className="text-[10px] uppercase tracking-widest text-muted text-right">현재가</span>
        <span className="text-[10px] uppercase tracking-widest text-muted text-right">등락률</span>
        <span className="text-[10px] uppercase tracking-widest text-muted text-right">거래대금</span>
        <span />
      </div>

      <ul>
        {loading && items.length === 0
          ? codes.map((c) => <SkeletonRow key={c} />)
          : codes.map((code, idx) => {
              const item = items.find((i) => i.stock_code === code);
              const isActive = activeCode === code;
              const up = item ? item.change_rate > 0 : null;
              const flat = item ? item.change_rate === 0 : null;

              /* 등락률 뱃지 */
              const badgeBg = flat
                ? "bg-surface-elevated-dark text-muted"
                : up
                  ? "bg-trading-up/10 text-trading-up"
                  : "bg-trading-down/10 text-trading-down";
              const glyph = flat ? "" : up ? "▲" : "▼";

              return (
                <li
                  key={code}
                  className={`border-t border-hairline-on-dark first:border-t-0 group ${
                    isActive ? "bg-primary/[0.04]" : ""
                  }`}
                >
                  <div
                    className="grid grid-cols-[2.5rem_1fr_6.5rem_6rem_5.5rem_2rem] gap-4 items-center px-6 py-4 hover:bg-canvas-dark transition-colors cursor-pointer"
                    onClick={() => onSelect(code)}
                  >
                    {/* 순위 */}
                    <span className="text-sm font-mono font-semibold text-muted-strong text-center select-none">
                      {idx + 1}
                    </span>

                    {/* 아바타 + 종목명 */}
                    <span className="flex items-center gap-3 min-w-0">
                      <StockAvatar name={item?.stock_name ?? null} code={code} />
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
                    <span className="text-right">
                      {loading && !fetched ? (
                        <span className="inline-block w-16 h-3.5 rounded bg-surface-elevated-dark animate-pulse" />
                      ) : item ? (
                        <span className="font-mono tabular text-[15px] font-semibold text-on-dark">
                          {item.price.toLocaleString("ko-KR")}
                          <span className="text-[11px] text-muted font-normal ml-0.5">원</span>
                        </span>
                      ) : (
                        <span className="font-mono text-sm text-muted">—</span>
                      )}
                    </span>

                    {/* 등락률 뱃지 */}
                    <span className="flex justify-end">
                      {loading && !fetched ? (
                        <span className="inline-block w-14 h-7 rounded-lg bg-surface-elevated-dark animate-pulse" />
                      ) : item ? (
                        <span
                          className={`inline-flex items-center gap-0.5 font-mono tabular text-sm font-semibold px-2.5 py-1 rounded-lg ${badgeBg}`}
                        >
                          {glyph && <span className="text-[10px]">{glyph}</span>}
                          {flat ? "0.00%" : `${Math.abs(item.change_rate).toFixed(2)}%`}
                        </span>
                      ) : (
                        <span className="font-mono text-sm text-muted px-2.5 py-1">—</span>
                      )}
                    </span>

                    {/* 거래대금 */}
                    <span className="text-right">
                      {loading && !fetched ? (
                        <span className="inline-block w-12 h-3 rounded bg-surface-elevated-dark animate-pulse" />
                      ) : item ? (
                        <span className="font-mono tabular text-sm text-muted-strong">
                          {formatEok(item.volume, item.price)}
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
