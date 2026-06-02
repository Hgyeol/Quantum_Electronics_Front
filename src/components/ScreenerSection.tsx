"use client";

import { useState, useEffect } from "react";
import {
  fetchScreener,
  fetchScreenerStatus,
  type ScreenerCondition,
  type ScreenerResultItem,
  type ScreenerParams,
} from "@/lib/api";
import { StockList, COLS, NameCell, PriceCell, MutedNumber } from "@/components/StockList";

const CONDITIONS: { id: ScreenerCondition; label: string; desc: string; live?: boolean }[] = [
  { id: "volume_surge",  label: "거래량 급등",          desc: "오늘 거래량 > N배 × 20일 평균" },
  { id: "golden_cross",  label: "골든크로스 (5/20일)",   desc: "MA5가 MA20을 상향 돌파" },
  { id: "frgn_buy",      label: "외국인 연속 순매수",    desc: "최근 N일 연속 외국인 순매수" },
  { id: "orgn_buy",      label: "기관 연속 순매수",      desc: "최근 N일 연속 기관 순매수" },
  { id: "price_surge",   label: "급등주",               desc: "당일 등락률 > N% 이상" },
  { id: "volume_power",  label: "체결강도 상위",         desc: "실시간 체결강도 상위 50종목", live: true },
  { id: "near_high",     label: "신고가 근접",           desc: "52주 신고가 10% 이내 근접", live: true },
  { id: "upper_limit",   label: "상한가 포착",           desc: "당일 상한가(+30%) 도달 종목", live: true },
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
}

const STORAGE_KEY = "screener:v1";

interface PersistedState {
  selected: ScreenerCondition[];
  volumeThreshold: number;
  consecutiveDays: number;
  priceSurgeThreshold: number;
  sortBy: SortType;
  results: ScreenerResultItem[] | null;
}

function loadPersisted(): Partial<PersistedState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function ScreenerSection({ onSelect, onHover, onHoverEnd }: Props) {
  const persisted = loadPersisted();
  const [selected, setSelected] = useState<Set<ScreenerCondition>>(
    new Set(persisted.selected ?? ["volume_surge"]),
  );
  const [volumeThreshold, setVolumeThreshold] = useState(persisted.volumeThreshold ?? 2.0);
  const [consecutiveDays, setConsecutiveDays] = useState(persisted.consecutiveDays ?? 3);
  const [priceSurgeThreshold, setPriceSurgeThreshold] = useState(persisted.priceSurgeThreshold ?? 5.0);
  const [results, setResults] = useState<ScreenerResultItem[] | null>(persisted.results ?? null);
  const [sortBy, setSortBy] = useState<SortType>(persisted.sortBy ?? "volume");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCollected, setLastCollected] = useState<string | null>(null);

  useEffect(() => {
    fetchScreenerStatus()
      .then((s) => setLastCollected(s.last_collected))
      .catch(() => {});
  }, []);

  // 폼/결과 변경 시 sessionStorage에 보존
  useEffect(() => {
    if (typeof window === "undefined") return;
    const data: PersistedState = {
      selected: Array.from(selected),
      volumeThreshold, consecutiveDays, priceSurgeThreshold, sortBy, results,
    };
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, [selected, volumeThreshold, consecutiveDays, priceSurgeThreshold, sortBy, results]);

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
      const params: ScreenerParams = {
        conditions: Array.from(selected) as ScreenerCondition[],
        volumeThreshold,
        consecutiveDays,
        priceSurgeThreshold,
      };
      const data = await fetchScreener(params);
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const showVolumeInput = selected.has("volume_surge");
  const showDaysInput = selected.has("frgn_buy") || selected.has("orgn_buy");
  const showSurgeInput = selected.has("price_surge");

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
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold ${checked ? "text-primary" : "text-muted-strong"}`}>
                      {c.label}
                    </span>
                    {c.live && (
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-trading-up/15 text-trading-up leading-none">
                        실시간
                      </span>
                    )}
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
                onChange={(e) => { const v = parseFloat(e.target.value); setVolumeThreshold(Number.isNaN(v) ? 0 : v); }}
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
                onChange={(e) => { const v = parseInt(e.target.value, 10); setConsecutiveDays(Number.isNaN(v) ? 0 : v); }}
                className="w-24 h-8 px-2.5 rounded-lg border border-hairline-on-dark bg-surface-elevated-dark text-sm text-on-dark font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50"
              />
            </label>
          )}
          {showSurgeInput && (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-muted">급등 기준 (%)</span>
              <input
                type="number" min={0.1} max={30} step={0.5}
                value={priceSurgeThreshold}
                onChange={(e) => { const v = parseFloat(e.target.value); setPriceSurgeThreshold(Number.isNaN(v) ? 0 : v); }}
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
          {/* 정렬 탭 (TDS underline) */}
          <div className="flex gap-0 px-5" style={{ borderBottom: "1px solid var(--c-border)" }}>
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
              </button>
            ))}
          </div>
          <StockList
            items={sorted}
            getKey={(i) => i.stock_code}
            onSelect={(i) => onSelect(i.stock_code, i.stock_name)}
            onRowHover={(i) =>
              onHover?.({
                code: i.stock_code,
                name: i.stock_name,
                price: i.close,
                changeRate: 0,
              })
            }
            onRowHoverEnd={onHoverEnd}
            columns={[
              { ...COLS.name,    render: (i) => <NameCell code={i.stock_code} name={i.stock_name} /> },
              { ...COLS.price,   render: (i) => <PriceCell price={i.close} /> },
              { ...COLS.volume,  render: (i) => <MutedNumber>{formatVolume(i.volume)}</MutedNumber> },
              { ...COLS.amount,  render: (i) => <MutedNumber>{formatTradeValue(i.close * i.volume)}</MutedNumber> },
              { ...COLS.matched, render: (i) => (
                <span className="flex flex-nowrap justify-end gap-1 overflow-hidden">
                  {i.matched_conditions.map((label) => (
                    <span
                      key={label}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium whitespace-nowrap truncate min-w-0"
                    >
                      {label}
                    </span>
                  ))}
                </span>
              ) },
            ]}
          />
        </>
        );
      })()}

      {results !== null && results.length === 0 && !loading && (
        <div className="px-5 py-10 text-center text-sm text-muted">
          조건에 맞는 종목이 없습니다.
        </div>
      )}
    </section>
  );
}
