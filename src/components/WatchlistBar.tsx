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
    <div className="bg-surface-card-dark border-b border-hairline-on-dark">
      <div className="max-w-5xl mx-auto px-5 flex items-center gap-0 overflow-x-auto scrollbar-none h-12">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-widest shrink-0 pr-4 mr-1 border-r border-hairline-on-dark">
          관심종목
        </span>

        {codes.map((code, idx) => {
          const item = items.find((i) => i.stock_code === code);
          const up = item ? item.change_rate > 0 : null;
          const flat = item ? item.change_rate === 0 : null;

          return (
            <div key={code} className="flex items-center shrink-0 group/tick">
              {idx > 0 && <div className="w-px h-3.5 bg-hairline-on-dark mx-1" />}
              <div className="relative flex items-center">
                <button
                  onClick={() => onSelect(code)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-canvas-dark transition-colors cursor-pointer"
                >
                  <span className="text-[13px] font-semibold text-ink">
                    {item?.stock_name ?? code}
                  </span>

                  {loading || !item ? (
                    <span className="w-14 h-3 rounded bg-surface-elevated-dark animate-pulse" />
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono tabular text-[13px] text-ink">
                        {item.price.toLocaleString("ko-KR")}
                      </span>
                      <span
                        className={`font-mono tabular text-[11px] font-semibold ${
                          flat ? "text-muted" : up ? "text-trading-up" : "text-trading-down"
                        }`}
                      >
                        {flat ? "—" : up ? "▲" : "▼"}
                        {!flat && `${Math.abs(item.change_rate).toFixed(2)}%`}
                      </span>
                    </span>
                  )}
                </button>

                {/* 삭제 버튼 */}
                <button
                  onClick={() => onRemove(code)}
                  className="opacity-0 group-hover/tick:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center text-muted hover:text-trading-down text-xs -ml-1 cursor-pointer"
                  aria-label="삭제"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
