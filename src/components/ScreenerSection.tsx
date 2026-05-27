"use client";

import { useState, useEffect } from "react";
import {
  fetchScreener,
  fetchScreenerStatus,
  type ScreenerCondition,
  type ScreenerResultItem,
} from "@/lib/api";
import StockLogo from "@/components/StockLogo";

const CONDITIONS: { id: ScreenerCondition; label: string; desc: string }[] = [
  { id: "volume_surge",  label: "거래량 급등",          desc: "오늘 거래량 > N배 × 20일 평균" },
  { id: "golden_cross",  label: "골든크로스 (5/20일)",   desc: "MA5가 MA20을 상향 돌파" },
  { id: "frgn_buy",      label: "외국인 연속 순매수",    desc: "최근 N일 연속 외국인 순매수" },
  { id: "orgn_buy",      label: "기관 연속 순매수",      desc: "최근 N일 연속 기관 순매수" },
];

type SortType = "volume" | "amount";

const SORT_TABS: { id: SortType; label: string }[] = [
  { id: "volume",  label: "거래량" },
  { id: "amount",  label: "거래대금" },
];

function formatTradeValue(n: number): string {
  if (n >= 1e12) return `${Math.floor(n / 1e11) / 10}조`;
  if (n >= 1e8)  return `${Math.floor(n / 1e8)}억`;
  if (n >= 1e4)  return `${Math.floor(n / 1e4)}만`;
  return "—";
}

function formatVolume(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억주`;
  if (n >= 1e4) return `${Math.floor(n / 1e4)}만주`;
  return `${n.toLocaleString("ko-KR")}주`;
}

interface Props {
  onSelect: (code: string, name: string) => void;
}

export default function ScreenerSection({ onSelect }: Props) {
  const [selected, setSelected] = useState<Set<ScreenerCondition>>(new Set(["volume_surge"]));
  const [volumeThreshold, setVolumeThreshold] = useState(2.0);
  const [consecutiveDays, setConsecutiveDays] = useState(3);
  const [results, setResults] = useState<ScreenerResultItem[] | null>(null);
  const [sortBy, setSortBy] = useState<SortType>("volume");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCollected, setLastCollected] = useState<string | null>(null);

  useEffect(() => {
    fetchScreenerStatus()
      .then((s) => setLastCollected(s.last_collected))
      .catch(() => {});
  }, []);

  function toggleCondition(id: ScreenerCondition) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSearch() {
    if (selected.size === 0) { setError("조건을 하나 이상 선택하세요."); return; }
    setLoading(true);
    setError(null);
    setResults(null);
    setSortBy("volume");
    try {
      const data = await fetchScreener(Array.from(selected) as ScreenerCondition[], volumeThreshold, consecutiveDays);
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const showVolumeInput = selected.has("volume_surge");
  const showDaysInput = selected.has("frgn_buy") || selected.has("orgn_buy");

  return (
    <section className="bg-surface-card-dark rounded-xl shadow-card overflow-hidden">
      {/* 헤더 */}
      <header className="px-6 pt-4 pb-4 border-b border-hairline-on-dark">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-on-dark">조건 검색식</h2>
          {lastCollected && (
            <span className="text-[11px] text-muted">
              DB 업데이트:{" "}
              <span className="font-mono">
                {new Date(lastCollected).toLocaleString("ko-KR", {
                  month: "2-digit", day: "2-digit",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </span>
          )}
        </div>

        {/* 조건 체크박스 */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {CONDITIONS.map((c) => {
            const checked = selected.has(c.id);
            return (
              <label
                key={c.id}
                className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors select-none ${
                  checked
                    ? "border-primary/40 bg-primary/5"
                    : "border-hairline-on-dark hover:border-hairline-on-dark/80 hover:bg-surface-elevated-dark/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCondition(c.id)}
                  className="mt-0.5 accent-primary shrink-0"
                />
                <span>
                  <span className={`block text-xs font-semibold ${checked ? "text-primary" : "text-muted-strong"}`}>
                    {c.label}
                  </span>
                  <span className="block text-[11px] text-muted mt-0.5">{c.desc}</span>
                </span>
              </label>
            );
          })}
        </div>

        {/* 파라미터 & 검색 버튼 */}
        <div className="flex flex-wrap items-end gap-3">
          {showVolumeInput && (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-muted">급등 배수</span>
              <input
                type="number" min={1} max={20} step={0.5}
                value={volumeThreshold}
                onChange={(e) => setVolumeThreshold(parseFloat(e.target.value))}
                className="w-24 h-8 px-2.5 rounded-lg border border-hairline-on-dark bg-surface-elevated-dark text-sm text-on-dark font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50"
              />
            </label>
          )}
          {showDaysInput && (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-muted">연속 순매수 일수</span>
              <input
                type="number" min={1} max={10} step={1}
                value={consecutiveDays}
                onChange={(e) => setConsecutiveDays(parseInt(e.target.value, 10))}
                className="w-24 h-8 px-2.5 rounded-lg border border-hairline-on-dark bg-surface-elevated-dark text-sm text-on-dark font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50"
              />
            </label>
          )}
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading || selected.size === 0}
            className="h-8 px-5 rounded-lg bg-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted-strong text-on-primary text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2"
          >
            {loading && (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            )}
            {loading ? "검색 중" : "검색"}
          </button>
          {results !== null && !loading && (
            <span className="text-xs text-muted self-end pb-1">
              {results.length > 0 ? `${results.length}종목 매칭` : "매칭 종목 없음"}
            </span>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-trading-down">{error}</p>}
      </header>

      {/* 결과 */}
      {results !== null && results.length > 0 && (() => {
        const sorted = [...results].sort((a, b) => {
          if (sortBy === "volume") return b.volume - a.volume;
          if (sortBy === "amount") return b.close * b.volume - a.close * a.volume;
          return 0;
        });
        return (
        <>
          {/* 정렬 탭 */}
          <div className="flex gap-0 px-6 border-b border-hairline-on-dark bg-surface-elevated-dark/40">
            {SORT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSortBy(tab.id)}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  sortBy === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-muted-strong"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* 컬럼 레이블 */}
          <div className="grid grid-cols-[1fr_6rem_5rem_5rem_10rem] gap-3 px-6 py-2.5 bg-surface-elevated-dark/60 border-b border-hairline-on-dark">
            <span className="text-[10px] uppercase tracking-widest text-muted">종목명</span>
            <span className="text-[10px] uppercase tracking-widest text-muted text-right">현재가</span>
            <span className="text-[10px] uppercase tracking-widest text-muted text-right">거래량</span>
            <span className="text-[10px] uppercase tracking-widest text-muted text-right">거래대금</span>
            <span className="text-[10px] uppercase tracking-widest text-muted text-right">매칭 조건</span>
          </div>
          <ul>
            {sorted.map((item) => (
              <li
                key={item.stock_code}
                onClick={() => onSelect(item.stock_code, item.stock_name)}
                className="grid grid-cols-[1fr_6rem_5rem_5rem_10rem] gap-3 items-center px-6 py-3 border-t border-hairline-on-dark first:border-t-0 hover:bg-canvas-dark cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <StockLogo code={item.stock_code} name={item.stock_name} size={32} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-on-dark truncate leading-tight">
                      {item.stock_name || item.stock_code}
                    </span>
                    <span className="block text-[11px] text-muted font-mono">{item.stock_code}</span>
                  </span>
                </span>
                <span className="text-right font-mono text-sm font-semibold text-on-dark tabular">
                  {item.close.toLocaleString("ko-KR")}
                  <span className="text-[10px] text-muted font-normal ml-0.5">원</span>
                </span>
                <span className="text-right font-mono text-xs text-muted-strong tabular">
                  {formatVolume(item.volume)}
                </span>
                <span className="text-right font-mono text-xs text-muted-strong tabular">
                  {formatTradeValue(item.close * item.volume)}
                </span>
                <span className="flex flex-nowrap justify-end gap-1 overflow-hidden">
                  {item.matched_conditions.map((label) => (
                    <span
                      key={label}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium whitespace-nowrap truncate min-w-0"
                    >
                      {label}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </>
        );
      })()}

      {results !== null && results.length === 0 && !loading && (
        <div className="px-6 py-10 text-center text-sm text-muted">
          조건에 맞는 종목이 없습니다.
        </div>
      )}
    </section>
  );
}
