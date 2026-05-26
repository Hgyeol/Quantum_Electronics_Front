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
  return (
    <span
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 select-none"
      style={{ backgroundColor: avatarColor(code) }}
    >
      {(name ?? code).charAt(0)}
    </span>
  );
}

function formatEok(volume: number, price: number): string {
  const eok = (volume * price) / 1e8;
  if (eok >= 100) return `${Math.round(eok)}억`;
  if (eok >= 1) return `${eok.toFixed(1)}억`;
  const man = (volume * price) / 1e4;
  if (man >= 1) return `${Math.round(man)}만`;
  return "—";
}

const SKELETON = (
  <span className="inline-block rounded bg-surface-elevated-dark animate-pulse h-3.5" />
);

export default function WatchlistTable({
  codes,
  onSelect,
  onRemove,
  activeCode,
}: Props) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (codes.length === 0) {
      setItems([]);
      return;
    }
    setLoading(true);
    fetchWatchlist(codes)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [codes.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (codes.length === 0) return null;

  return (
    <section className="bg-surface-card-dark rounded-xl shadow-card overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-hairline-on-dark flex items-center justify-between">
        <h2 className="text-sm font-semibold text-on-dark">
          관심종목{" "}
          <span className="font-mono text-muted font-normal">{codes.length}</span>
        </h2>
        <span className="text-xs text-muted">
          {loading ? "업데이트 중…" : "장중 기준"}
        </span>
      </header>

      {/* Column labels */}
      <div className="grid grid-cols-[2rem_1fr_6rem_5.5rem_5rem_2rem] gap-3 px-5 py-2.5 border-b border-hairline-on-dark">
        <span />
        <span className="text-[10px] uppercase tracking-widest text-muted">종목명</span>
        <span className="text-[10px] uppercase tracking-widest text-muted text-right">현재가</span>
        <span className="text-[10px] uppercase tracking-widest text-muted text-right">등락률</span>
        <span className="text-[10px] uppercase tracking-widest text-muted text-right">거래대금</span>
        <span />
      </div>

      <ul>
        {codes.map((code, idx) => {
          const item = items.find((i) => i.stock_code === code);
          const isActive = activeCode === code;
          const up = item ? item.change_rate > 0 : null;
          const flat = item ? item.change_rate === 0 : null;
          const rateColor =
            flat ? "text-muted" : up ? "text-trading-up" : "text-trading-down";
          const glyph = flat ? "—" : up ? "▲" : "▼";

          return (
            <li
              key={code}
              className={`border-t border-hairline-on-dark first:border-t-0 group ${
                isActive ? "bg-primary/[0.04]" : ""
              }`}
            >
              <div
                className="grid grid-cols-[2rem_1fr_6rem_5.5rem_5rem_2rem] gap-3 items-center px-5 py-3.5 hover:bg-canvas-dark transition-colors cursor-pointer"
                onClick={() => onSelect(code)}
              >
                {/* Rank */}
                <span className="text-xs font-mono text-muted text-center select-none">
                  {idx + 1}
                </span>

                {/* Avatar + name */}
                <span className="flex items-center gap-3 min-w-0">
                  <StockAvatar name={item?.stock_name ?? null} code={code} />
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-semibold truncate ${
                        isActive ? "text-primary" : "text-on-dark"
                      }`}
                    >
                      {item?.stock_name ?? code}
                    </span>
                    <span className="block text-[11px] text-muted font-mono">
                      {code}
                    </span>
                  </span>
                </span>

                {/* Price */}
                <span className="text-right">
                  {loading || !item ? (
                    <span className="block w-16 ml-auto">{SKELETON}</span>
                  ) : (
                    <span className="font-mono tabular text-sm font-semibold text-on-dark">
                      {item.price.toLocaleString("ko-KR")}
                    </span>
                  )}
                </span>

                {/* Change rate */}
                <span className="text-right">
                  {loading || !item ? (
                    <span className="block w-12 ml-auto">{SKELETON}</span>
                  ) : (
                    <span className={`font-mono tabular text-sm font-semibold ${rateColor}`}>
                      {glyph}
                      {!flat && `${Math.abs(item.change_rate).toFixed(2)}%`}
                    </span>
                  )}
                </span>

                {/* 거래대금 */}
                <span className="text-right">
                  {loading || !item ? (
                    <span className="block w-12 ml-auto">{SKELETON}</span>
                  ) : (
                    <span className="font-mono tabular text-xs text-muted-strong">
                      {formatEok(item.volume, item.price)}
                    </span>
                  )}
                </span>

                {/* Remove */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(code);
                  }}
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
