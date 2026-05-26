"use client";

import { useEffect, useState } from "react";
import { fetchWatchlist, type WatchlistItem } from "@/lib/api";

interface Props {
  codes: string[];
  onSelect: (code: string) => void;
  onRemove: (code: string) => void;
}

export default function WatchlistBar({ codes, onSelect, onRemove }: Props) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (codes.length === 0) { setItems([]); return; }
    setLoading(true);
    fetchWatchlist(codes)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [codes.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (codes.length === 0) return null;

  return (
    <div className="border-b border-hairline-on-dark">
      <div className="max-w-6xl mx-auto px-6 flex items-center gap-1 h-11 overflow-x-auto scrollbar-none">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted shrink-0 pr-4 border-r border-hairline-on-dark mr-2">
          관심종목
        </span>
        {codes.map((code) => {
          const item = items.find((i) => i.stock_code === code);
          const up = item ? item.change_rate >= 0 : null;
          return (
            <div key={code} className="flex items-center shrink-0 group/tick">
              <button
                onClick={() => onSelect(code)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-surface-card-dark transition-colors cursor-pointer"
              >
                <span className="text-[13px] text-muted-strong font-medium">
                  {item?.stock_name ?? code}
                </span>
                {loading || !item ? (
                  <span className="w-12 h-2.5 rounded bg-surface-elevated-dark animate-pulse" />
                ) : (
                  <>
                    <span className="font-mono tabular text-[13px] text-on-dark">
                      {item.price.toLocaleString("ko-KR")}
                    </span>
                    <span
                      className={`font-mono tabular text-[11px] font-semibold ${
                        up ? "text-trading-up" : "text-trading-down"
                      }`}
                    >
                      {up ? "▲" : "▼"}
                      {Math.abs(item.change_rate).toFixed(2)}%
                    </span>
                  </>
                )}
              </button>
              <button
                onClick={() => onRemove(code)}
                className="opacity-0 group-hover/tick:opacity-100 transition-opacity text-muted hover:text-trading-down text-xs w-4 h-4 flex items-center justify-center -ml-1 cursor-pointer"
                aria-label="삭제"
              >
                ×
              </button>
              <span className="w-px h-4 bg-hairline-on-dark mx-1 last:hidden" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
