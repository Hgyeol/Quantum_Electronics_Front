"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { searchStocks, type StockSearchResult } from "@/lib/api";
import StockLogo from "@/components/StockLogo";

interface Props {
  onSelect: (code: string, name: string) => void;
}

export default function StockSearchBox({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StockSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 입력 변경 시 디바운스 후 검색
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchStocks(trimmed);
        setSuggestions(results);
        setOpen(results.length > 0);
        setActiveIdx(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(result: StockSearchResult) {
    onSelect(result.stock_code, result.corp_name);
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    setActiveIdx(-1);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (activeIdx >= 0 && suggestions[activeIdx]) {
      pick(suggestions[activeIdx]);
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) return;
    if (/^\d{6}$/.test(trimmed)) {
      onSelect(trimmed, trimmed);
      setQuery("");
      setOpen(false);
      return;
    }
    if (suggestions.length > 0) {
      pick(suggestions[0]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder="종목코드 · 종목명"
          autoComplete="off"
          className="w-48 h-9 px-3 rounded-lg border border-hairline-on-dark bg-surface-elevated-dark text-sm text-on-dark placeholder:text-muted font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors"
        />
        <button
          type="submit"
          className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-active text-on-primary text-sm font-semibold transition-colors cursor-pointer"
        >
          조회
        </button>
      </form>

      {/* 드롭다운 */}
      {open && suggestions.length > 0 && (
        <ul className="absolute right-0 top-full mt-1.5 w-64 bg-surface-card-dark border border-hairline-on-dark rounded-xl shadow-card overflow-hidden z-50">
          {suggestions.map((s, idx) => (
            <li key={s.stock_code}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                onMouseEnter={() => setActiveIdx(idx)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                  activeIdx === idx ? "bg-primary/10" : "hover:bg-surface-elevated-dark"
                }`}
              >
                <StockLogo code={s.stock_code} name={s.corp_name} size={28} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-on-dark truncate leading-tight">
                    {s.corp_name}
                  </span>
                  <span className="block text-[11px] text-muted font-mono">{s.stock_code}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
