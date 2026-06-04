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

interface ConditionParam {
  key: string;
  label: string;
  default: number;
  min: number;
  max: number;
  step: number;
}

interface ConditionItem {
  id: ScreenerCondition;
  label: string;
  desc: string;
  live?: boolean;
  params?: ConditionParam[];
}

interface ConditionGroup {
  label: string;
  items: ConditionItem[];
}

const P_DAYS = (def: number, min = 2, max = 10): ConditionParam => ({
  key: "days", label: "일수", default: def, min, max, step: 1,
});
const P_PERIOD = (def: number, min = 2, max = 60): ConditionParam => ({
  key: "period", label: "기간", default: def, min, max, step: 1,
});

const CONDITION_GROUPS: ConditionGroup[] = [
  {
    label: "가격 패턴",
    items: [
      { id: "consecutive_bull",  label: "연속 양봉",          desc: "N일 연속 양봉 (close > open)",
        params: [P_DAYS(3)] },
      { id: "consecutive_up",    label: "연속 상승",          desc: "N일 연속 종가 상승",
        params: [P_DAYS(3)] },
      { id: "higher_high_low",   label: "고가/저가 동시 상승", desc: "N일 연속 고가·저가 모두 상승",
        params: [P_DAYS(3)] },
      { id: "break_prev_high",   label: "전일 고가 돌파",     desc: "오늘 종가가 전일 고가를 돌파" },
      { id: "new_high_5d",       label: "5일 신고가 갱신",    desc: "오늘 고가가 직전 N일 최고" },
      { id: "price_surge",       label: "급등주",            desc: "당일 등락률 > N% 이상",
        params: [{ key: "threshold", label: "등락률 (%)", default: 5.0, min: 0.1, max: 30, step: 0.5 }] },
      { id: "near_high",         label: "신고가 근접",        desc: "52주 신고가 10% 이내 근접", live: true },
      { id: "upper_limit",       label: "상한가 포착",        desc: "당일 상한가(+30%) 도달 종목", live: true },
    ],
  },
  {
    label: "이동평균·추세",
    items: [
      { id: "golden_cross",        label: "골든크로스 (5/20)",  desc: "MA5가 MA20을 상향 돌파" },
      { id: "ma_alignment",        label: "이동평균 정배열",     desc: "MA5 > MA20 > MA60" },
      { id: "mao_up",              label: "MAO 상승돌파",       desc: "MA5-MA20이 0선 상향 돌파" },
      { id: "mao_signal_up",       label: "MAO Signal 돌파",    desc: "MAO 시그널선 상향 돌파" },
      { id: "volume_golden_cross", label: "거래량 골든크로스",   desc: "거래량 MA5가 MA20 상향 돌파" },
    ],
  },
  {
    label: "모멘텀·오실레이터",
    items: [
      { id: "macd_signal_cross", label: "MACD Cross",      desc: "MACD 라인이 시그널 상향 돌파" },
      { id: "macd_osc_up",       label: "MACD Osc",        desc: "MACD 히스토그램 3일 연속 상승" },
      { id: "price_osc_up",      label: "Price Osc",       desc: "가격 오실레이터 시그널 상향 돌파" },
      { id: "momentum_up",       label: "Momentum",        desc: "N일 모멘텀 3일 연속 상승",
        params: [P_PERIOD(10)] },
      { id: "roc_up",            label: "ROC",             desc: "변화율 3일 연속 상승",
        params: [P_PERIOD(10)] },
      { id: "lrs_signal_up",     label: "LRS",             desc: "선형회귀 기울기 시그널 돌파" },
      { id: "tsf_signal_up",     label: "TSF",             desc: "시계열 예측치 시그널 돌파" },
      { id: "sonar_signal_up",   label: "Sonar",           desc: "Sonar 시그널 돌파" },
      { id: "volume_osc_up",     label: "Volume Osc",      desc: "거래량 오실레이터 0선 돌파" },
    ],
  },
  {
    label: "거래량·수급",
    items: [
      { id: "volume_surge",  label: "거래량 급등",        desc: "오늘 거래량 > N배 × 20일 평균",
        params: [{ key: "threshold", label: "배수", default: 2.0, min: 1.0, max: 20, step: 0.5 }] },
      { id: "volume_power",  label: "체결강도 상위",      desc: "실시간 체결강도 상위 50종목", live: true },
      { id: "obv_up",        label: "OBV 상승추세",       desc: "OBV N일 연속 상승",
        params: [P_DAYS(5)] },
      { id: "obv_uturn",     label: "OBV U턴",           desc: "OBV 하락 후 반등" },
      { id: "frgn_buy",      label: "외국인 연속 순매수", desc: "N일 연속 외국인 순매수",
        params: [P_DAYS(3)] },
      { id: "orgn_buy",      label: "기관 연속 순매수",   desc: "N일 연속 기관 순매수",
        params: [P_DAYS(3)] },
    ],
  },
];

// 빠른 조회용 평탄화 맵
const PARAM_DEFS: Record<string, ConditionParam[]> = Object.fromEntries(
  CONDITION_GROUPS.flatMap((g) => g.items.filter((c) => c.params).map((c) => [c.id, c.params!])),
);

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

const STORAGE_KEY = "screener:v2";

type ParamValues = Record<string, number>;
type CondParams = Partial<Record<ScreenerCondition, ParamValues>>;

interface PersistedState {
  selected: ScreenerCondition[];
  conditionParams: CondParams;
  sortBy: SortType;
  results: ScreenerResultItem[] | null;
}

function defaultParams(): CondParams {
  const out: CondParams = {};
  for (const [cid, defs] of Object.entries(PARAM_DEFS)) {
    out[cid as ScreenerCondition] = Object.fromEntries(defs.map((p) => [p.key, p.default]));
  }
  return out;
}

function loadPersisted(): Partial<PersistedState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // v1 → v2 마이그레이션 시도
      const old = sessionStorage.getItem("screener:v1");
      if (old) {
        const p = JSON.parse(old);
        const cp: CondParams = defaultParams();
        if (typeof p.volumeThreshold === "number") cp.volume_surge = { threshold: p.volumeThreshold };
        if (typeof p.consecutiveDays === "number") {
          cp.frgn_buy = { days: p.consecutiveDays };
          cp.orgn_buy = { days: p.consecutiveDays };
        }
        if (typeof p.priceSurgeThreshold === "number") cp.price_surge = { threshold: p.priceSurgeThreshold };
        return { selected: p.selected, conditionParams: cp, sortBy: p.sortBy, results: p.results };
      }
      return {};
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default function ScreenerSection({ onSelect, onHover, onHoverEnd }: Props) {
  const persisted = loadPersisted();
  const [selected, setSelected] = useState<Set<ScreenerCondition>>(
    new Set(persisted.selected ?? ["volume_surge"]),
  );
  const [conditionParams, setConditionParams] = useState<CondParams>(
    persisted.conditionParams ?? defaultParams(),
  );
  const [openPopover, setOpenPopover] = useState<ScreenerCondition | null>(null);
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
      conditionParams, sortBy, results,
    };
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, [selected, conditionParams, sortBy, results]);

  // 팝오버 외부 클릭 시 닫기
  useEffect(() => {
    if (!openPopover) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-screener-chip]") && !target.closest("[data-screener-popover]")) {
        setOpenPopover(null);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [openPopover]);

  function toggleCondition(id: ScreenerCondition) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateParam(cid: ScreenerCondition, key: string, value: number) {
    setConditionParams((prev) => ({
      ...prev,
      [cid]: { ...(prev[cid] ?? {}), [key]: value },
    }));
  }

  function resetParams(cid: ScreenerCondition) {
    const defs = PARAM_DEFS[cid];
    if (!defs) return;
    setConditionParams((prev) => ({
      ...prev,
      [cid]: Object.fromEntries(defs.map((p) => [p.key, p.default])),
    }));
  }

  function isParamDefault(cid: ScreenerCondition): boolean {
    const defs = PARAM_DEFS[cid];
    if (!defs) return true;
    const cur = conditionParams[cid] ?? {};
    return defs.every((p) => (cur[p.key] ?? p.default) === p.default);
  }

  async function handleSearch() {
    if (selected.size === 0) { setError("조건을 하나 이상 선택하세요."); return; }
    setLoading(true);
    setError(null);
    setResults(null);
    setSortBy("volume");
    try {
      // 선택된 조건의 파라미터만 추려 전송
      const paramsToSend: CondParams = {};
      for (const cid of selected) {
        if (PARAM_DEFS[cid] && conditionParams[cid]) {
          paramsToSend[cid] = conditionParams[cid];
        }
      }
      const params: ScreenerParams = {
        conditions: Array.from(selected) as ScreenerCondition[],
        params: paramsToSend,
      };
      const data = await fetchScreener(params);
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-surface-card-dark rounded-xl shadow-card">
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

        {/* 조건 칩 (카테고리 그룹 + 플렉스 랩) */}
        <div className="space-y-2.5 mb-4">
          {CONDITION_GROUPS.map((group) => {
            const selectedCount = group.items.filter((c) => selected.has(c.id)).length;
            return (
              <div key={group.label}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-muted font-semibold">
                    {group.label}
                  </span>
                  {selectedCount > 0 && (
                    <span className="text-[10px] font-mono tabular text-primary font-bold">
                      {selectedCount}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((c) => {
                    const checked = selected.has(c.id);
                    const hasParams = !!c.params && c.params.length > 0;
                    const customized = hasParams && !isParamDefault(c.id);
                    return (
                      <span key={c.id} className="relative inline-flex">
                        <div
                          data-screener-chip
                          className={`inline-flex items-center rounded-full border transition-colors ${
                            checked
                              ? "border-primary bg-primary/10"
                              : "border-hairline-on-dark hover:border-primary/40"
                          }`}
                        >
                          <button
                            type="button"
                            title={c.desc}
                            onClick={() => toggleCondition(c.id)}
                            className={`inline-flex items-center gap-1 pl-2.5 ${hasParams ? "pr-1.5" : "pr-2.5"} py-1 text-[12px] font-semibold cursor-pointer ${
                              checked ? "text-primary" : "text-muted-strong hover:text-body"
                            }`}
                          >
                            {c.label}
                            {c.live && (
                              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-trading-up/15 text-trading-up leading-none">
                                LIVE
                              </span>
                            )}
                          </button>
                          {hasParams && (
                            <button
                              type="button"
                              onClick={() => setOpenPopover(openPopover === c.id ? null : c.id)}
                              title="파라미터 설정"
                              className={`flex items-center justify-center w-6 h-6 mr-0.5 rounded-full transition-colors cursor-pointer ${
                                customized
                                  ? "text-primary"
                                  : checked ? "text-primary/60 hover:text-primary" : "text-muted hover:text-body"
                              }`}
                              aria-label="파라미터 설정"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                              </svg>
                            </button>
                          )}
                        </div>
                        {openPopover === c.id && hasParams && (
                          <ParamPopover
                            item={c}
                            values={conditionParams[c.id] ?? {}}
                            onChange={(key, val) => updateParam(c.id, key, val)}
                            onReset={() => resetParams(c.id)}
                            onClose={() => setOpenPopover(null)}
                          />
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 검색 버튼 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading || selected.size === 0}
            className="h-9 px-5 rounded-lg bg-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted-strong text-on-primary text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2"
          >
            {loading && (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            )}
            {loading ? "검색 중" : "검색"}
          </button>
          {results !== null && !loading && (
            <span className="text-xs text-muted">
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

// ── 파라미터 팝오버 ─────────────────────────────────────────────────────────

interface PopoverProps {
  item: ConditionItem;
  values: ParamValues;
  onChange: (key: string, val: number) => void;
  onReset: () => void;
  onClose: () => void;
}

function ParamPopover({ item, values, onChange, onReset, onClose }: PopoverProps) {
  if (!item.params) return null;
  return (
    <div
      data-screener-popover
      className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-[200px] rounded-xl bg-white p-3 shadow-lg"
      style={{ border: "1px solid var(--c-border-md)", boxShadow: "0 8px 32px var(--c-shadow)" }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[12px] font-bold text-ink">{item.label}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted hover:text-body text-base leading-none cursor-pointer"
          aria-label="닫기"
        >
          ×
        </button>
      </div>
      <div className="space-y-2">
        {item.params.map((p) => {
          const current = values[p.key] ?? p.default;
          return (
            <label key={p.key} className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted-strong">{p.label}</span>
              <input
                type="number"
                min={p.min} max={p.max} step={p.step}
                value={current}
                onChange={(e) => {
                  const v = p.step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
                  onChange(p.key, Number.isNaN(v) ? p.default : v);
                }}
                className="w-20 h-7 px-2 rounded-md text-[12px] font-mono tabular text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                style={{ border: "1px solid var(--c-border-strong)", background: "var(--c-bg-subtle)" }}
              />
            </label>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2.5" style={{ borderTop: "1px solid var(--c-border)" }}>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] text-muted-strong hover:text-body cursor-pointer"
        >
          기본값으로
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] font-bold text-primary cursor-pointer"
        >
          적용
        </button>
      </div>
    </div>
  );
}
