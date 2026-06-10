"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { fetchSimilarPatterns, fetchChartAnalysis, type PatternMatchResult, type SimilarCase, type SimilarityMetric, type OHLCVBar } from "@/lib/api";
import StockLogo from "@/components/StockLogo";

const StockPriceChart = dynamic(() => import("./StockPriceChart"), { ssr: false });

const normDate = (d: string) => d.replace(/-/g, "");

interface Props {
  stockCode: string;
  ohlcv: OHLCVBar[];
  onSelect?: (code: string, name: string) => void;
}

const WINDOW_PRESETS = [
  { label: "최근 20일", days: 20 },
  { label: "최근 40일", days: 40 },
  { label: "최근 60일", days: 60 },
  { label: "최근 90일", days: 90 },
];

const HORIZONS = [
  { label: "5일", days: 5 },
  { label: "20일", days: 20 },
  { label: "60일", days: 60 },
];

const METRICS: { id: SimilarityMetric; label: string; help: string }[] = [
  { id: "dtw",      label: "DTW",     help: "시간축을 늘려가며 비교 — 타이밍이 며칠 밀려도 비슷한 흐름을 찾습니다." },
  { id: "pearson",  label: "피어슨",  help: "같은 시점끼리 비교 — 정직하게 같이 움직인 패턴을 찾습니다." },
  { id: "spearman", label: "스피어만", help: "오르내림 순위로 비교 — 급등 같은 튀는 값에 덜 민감합니다." },
];

function fmtDate(d: string): string {
  // YYYYMMDD or YYYY-MM-DD → YY.MM.DD
  const s = d.replace(/-/g, "");
  return `${s.slice(2, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`;
}

function returnColor(v: number | null): string {
  if (v == null) return "text-muted";
  return v > 0 ? "text-trading-up" : v < 0 ? "text-trading-down" : "text-muted-strong";
}

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

interface Snapshot {
  windowDays: number;
  horizon: number;
  metric: SimilarityMetric;
  topK: string;
  minSimilarity: string;
  result: PatternMatchResult | null;
  comparing: SimilarCase | null;
}

// 모듈 레벨 — 재마운트·StrictMode에 영향 안 받고 SPA 세션 동안 유지, 새로고침 시 초기화(옵션2).
const SIM_SNAPSHOTS = new Map<string, Snapshot>();
// 직전 내비게이션 의도: 클릭(앞으로) = fresh:true, 뒤로/앞으로가기 = fresh:false
let simNavIntent: { code: string; fresh: boolean } | null = null;

/** page에서 호출 — 종목 상세 진입 경로를 기록 (fresh=true: 클릭 진입, false: 뒤로/앞으로가기) */
export function noteSimNav(code: string | null, fresh: boolean) {
  if (code) simNavIntent = { code, fresh };
}

export default function SimilarPatternsCard({ stockCode, ohlcv, onSelect }: Props) {
  const [windowDays, setWindowDays] = useState(40);
  const [horizon, setHorizon] = useState(20);
  const [metric, setMetric] = useState<SimilarityMetric>("dtw");
  const [topK, setTopK] = useState("10");            // 빈 문자열 = 제한 없음
  const [minSimilarity, setMinSimilarity] = useState("0");  // 빈 문자열 = 컷오프 없음
  const [result, setResult] = useState<PatternMatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState<SimilarCase | null>(null);

  // 종목 진입 시: 뒤로/앞으로가기로 들어왔고 스냅샷이 있으면 복원, 아니면 초기화.
  // simNavIntent는 모듈 레벨이라 로딩으로 카드가 재마운트돼도 동일하게 판정됨(멱등).
  useEffect(() => {
    const intent = simNavIntent && simNavIntent.code === stockCode ? simNavIntent : null;
    const fresh = intent ? intent.fresh : true;  // 의도 불명(직접 진입 등)이면 새 진입
    const snap = SIM_SNAPSHOTS.get(stockCode);

    if (!fresh && snap) {
      setWindowDays(snap.windowDays); setHorizon(snap.horizon); setMetric(snap.metric);
      setTopK(snap.topK); setMinSimilarity(snap.minSimilarity);
      setResult(snap.result); setComparing(snap.comparing); setError(null);
      return;
    }
    // 새 진입 — 초기화 + 이전 스냅샷 폐기
    setWindowDays(40); setHorizon(20); setMetric("dtw");
    setTopK("10"); setMinSimilarity("0");
    setResult(null); setComparing(null); setError(null);
    SIM_SNAPSHOTS.delete(stockCode);
  }, [stockCode]);

  // 검색 결과가 있으면 현재 상태를 종목별 스냅샷으로 보존 (뒤로가기 복원용)
  useEffect(() => {
    if (!result) return;
    // 빠른 연속 내비게이션 시 result(이전 종목)가 stockCode(현재 종목)보다 늦게 갱신되어
    // 엉뚱한 종목 키에 저장되는 것을 방지 — 결과의 종목과 현재 종목이 같을 때만 저장.
    if (result.query_stock_code !== stockCode) return;
    SIM_SNAPSHOTS.set(stockCode, { windowDays, horizon, metric, topK, minSimilarity, result, comparing });
  }, [stockCode, windowDays, horizon, metric, topK, minSimilarity, result, comparing]);

  async function handleSearch() {
    if (ohlcv.length < windowDays + 1) {
      setError("차트 데이터가 부족합니다.");
      return;
    }
    const slice = ohlcv.slice(-windowDays);
    const start = slice[0].date;
    const end = slice[slice.length - 1].date;

    setLoading(true);
    setError(null);
    setResult(null);
    setComparing(null);
    try {
      const res = await fetchSimilarPatterns(stockCode, start, end, {
        horizon,
        topK: topK.trim() === "" ? 1000 : Math.max(1, parseInt(topK, 10) || 1000),
        metric,
        minSimilarity: minSimilarity.trim() === "" ? 0 : Math.min(100, Math.max(0, parseFloat(minSimilarity) || 0)),
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const stats = result?.stats;

  // 현재 종목의 질의 구간 캔들 (비교 좌측용)
  const queryWindowBars = result
    ? ohlcv.filter((b) => normDate(b.date) >= normDate(result.query_start) && normDate(b.date) <= normDate(result.query_end))
    : [];

  return (
    <div className="bg-white" style={{ border: "1px solid var(--c-border)", borderRadius: 12 }}>
      {/* 헤더 */}
      <div className="px-5 py-3.5" style={{ borderBottom: "1px solid var(--c-border)" }}>
        <h3 className="text-[14px] font-bold text-ink">유사 패턴 검색</h3>
        <p className="text-[12px] text-muted-strong mt-0.5">
          고른 구간과 모양이 비슷했던 과거 사례를 전 종목에서 찾아, 이후 수익률을 보여줍니다.
        </p>
      </div>

      {/* 컨트롤 */}
      <div className="px-5 py-4 space-y-3">
        <div>
          <span className="block text-[12px] font-semibold text-body-secondary mb-1.5">비교 구간</span>
          <div className="flex flex-wrap gap-1.5">
            {WINDOW_PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => setWindowDays(p.days)}
                className={`px-2.5 py-1 rounded-full text-[12px] font-semibold border transition-colors cursor-pointer ${
                  windowDays === p.days
                    ? "border-primary text-primary bg-primary/10"
                    : "border-hairline-on-dark text-muted-strong hover:border-primary/40"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-[12px] font-semibold text-body-secondary mb-1.5">이후 수익률 기간</span>
          <div className="flex gap-1.5">
            {HORIZONS.map((h) => (
              <button
                key={h.days}
                type="button"
                onClick={() => setHorizon(h.days)}
                className={`px-2.5 py-1 rounded-full text-[12px] font-semibold border transition-colors cursor-pointer ${
                  horizon === h.days
                    ? "border-primary text-primary bg-primary/10"
                    : "border-hairline-on-dark text-muted-strong hover:border-primary/40"
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-[12px] font-semibold text-body-secondary mb-1.5">유사도 측정 방식</span>
          <div className="flex flex-wrap gap-1.5">
            {METRICS.map((m) => (
              <button
                key={m.id}
                type="button"
                title={m.help}
                onClick={() => setMetric(m.id)}
                className={`px-2.5 py-1 rounded-full text-[12px] font-semibold border transition-colors cursor-pointer ${
                  metric === m.id
                    ? "border-primary text-primary bg-primary/10"
                    : "border-hairline-on-dark text-muted-strong hover:border-primary/40"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted mt-1">{METRICS.find((m) => m.id === metric)?.help}</p>
        </div>

        <div className="flex gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-body-secondary">결과 개수</span>
            <input
              type="text" inputMode="numeric" placeholder="전체"
              value={topK}
              onChange={(e) => setTopK(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-24 h-8 px-2.5 rounded-lg text-[13px] font-mono tabular focus:outline-none focus:ring-2 focus:ring-primary/30"
              style={{ border: "1px solid var(--c-border-strong)", background: "var(--c-bg-subtle)" }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-body-secondary">최소 유사도 (%)</span>
            <input
              type="text" inputMode="decimal" placeholder="제한 없음"
              value={minSimilarity}
              onChange={(e) => setMinSimilarity(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-24 h-8 px-2.5 rounded-lg text-[13px] font-mono tabular focus:outline-none focus:ring-2 focus:ring-primary/30"
              style={{ border: "1px solid var(--c-border-strong)", background: "var(--c-bg-subtle)" }}
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3">
          {error && <p className="text-[13px] text-trading-down mr-auto">{error}</p>}
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="h-9 px-5 rounded-lg bg-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted-strong text-white text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2"
          >
            {loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />}
            {loading ? "검색 중" : "유사 차트 찾기"}
          </button>
        </div>
      </div>

      {/* 통계 요약 */}
      {stats && stats.count > 0 && (
        <div
          className="px-5 py-4 grid grid-cols-3 gap-3"
          style={{ borderTop: "1px solid var(--c-border)", background: "var(--c-bg-subtle)" }}
        >
          <div>
            <div className="text-[11px] text-muted mb-1">유사 사례 평균</div>
            <div className={`font-mono tabular text-[18px] font-bold ${returnColor(stats.mean)}`}>
              {fmtPct(stats.mean)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted mb-1">중앙값</div>
            <div className={`font-mono tabular text-[18px] font-bold ${returnColor(stats.median)}`}>
              {fmtPct(stats.median)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted mb-1">상승 비율</div>
            <div className="font-mono tabular text-[18px] font-bold text-ink">
              {stats.positive_ratio != null ? `${stats.positive_ratio}%` : "—"}
            </div>
          </div>
        </div>
      )}

      {/* 사례 목록 */}
      {result && result.cases.length > 0 && (
        <div style={{ borderTop: "1px solid var(--c-border)" }}>
          {result.cases.map((c, i) => {
            const isOpen = comparing?.stock_code === c.stock_code && comparing?.start_date === c.start_date;
            return (
            <div key={`${c.stock_code}-${c.start_date}`} style={{ borderTop: i > 0 ? "1px solid var(--c-border)" : undefined }}>
              <div
                onClick={() => setComparing(isOpen ? null : c)}
                className="flex items-center gap-3 px-5 py-2.5 cursor-pointer transition-colors"
                style={{ background: isOpen ? "var(--c-bg-subtle)" : undefined }}
                onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = "var(--c-hover)"; }}
                onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = ""; }}
              >
                <StockLogo code={c.stock_code} name={c.stock_name} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink truncate">{c.stock_name || c.stock_code}</div>
                  <div className="text-[11px] text-muted font-mono">
                    {fmtDate(c.start_date)} ~ {fmtDate(c.end_date)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-muted">유사도 {c.similarity}%</div>
                  <div className={`font-mono tabular text-[13px] font-bold ${returnColor(c.forward_return)}`}>
                    이후 {fmtPct(c.forward_return)}
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="px-5 pb-4 pt-1" style={{ background: "var(--c-bg-subtle)" }}>
                  <RealCompare
                    queryName={`현재 종목`}
                    queryBars={queryWindowBars}
                    caseStock={c}
                    windowBarCount={c.window_closes.length + c.forward_closes.length}
                  />
                  {onSelect && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSelect(c.stock_code, c.stock_name); }}
                      className="mt-2 text-[12px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      {c.stock_name || c.stock_code} 상세 보기 →
                    </button>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {result && result.cases.length === 0 && !loading && (
        <div className="px-5 py-8 text-center text-sm text-muted" style={{ borderTop: "1px solid var(--c-border)" }}>
          유사한 과거 사례를 찾지 못했습니다.
        </div>
      )}
    </div>
  );
}

// ── 실제 차트 비교 (현재 종목 구간 ↔ 사례 구간 캔들 나란히) ─────────────────────

function MiniCandleChart({ bars, markerDate }: { bars: OHLCVBar[]; markerDate?: string }) {
  if (bars.length === 0) {
    return <div className="h-[180px] flex items-center justify-center text-[12px] text-muted">데이터 없음</div>;
  }
  const last = bars[bars.length - 1].close;
  return (
    <StockPriceChart
      ohlcv={bars}
      supports={[]}
      resistances={[]}
      currentPrice={last}
      minimal
      markerDate={markerDate}
    />
  );
}

function RealCompare({
  queryName,
  queryBars,
  caseStock,
  windowBarCount,
}: {
  queryName: string;
  queryBars: OHLCVBar[];
  caseStock: SimilarCase;
  windowBarCount: number;
}) {
  const [caseBars, setCaseBars] = useState<OHLCVBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchChartAnalysis(caseStock.stock_code)
      .then((data) => {
        if (cancelled) return;
        const startN = normDate(caseStock.start_date);
        const from = data.ohlcv.filter((b) => normDate(b.date) >= startN);
        setCaseBars(from.slice(0, windowBarCount));
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [caseStock.stock_code, caseStock.start_date, windowBarCount]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
        <div className="px-3 py-2 text-[12px] font-semibold text-primary" style={{ borderBottom: "1px solid var(--c-border)" }}>
          {queryName} · 고른 구간
        </div>
        <MiniCandleChart bars={queryBars} />
      </div>
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
        <div className="px-3 py-2 text-[12px] font-semibold text-body-secondary flex items-center justify-between" style={{ borderBottom: "1px solid var(--c-border)" }}>
          <span>{caseStock.stock_name || caseStock.stock_code} · 유사 구간 + 이후</span>
          {caseStock.forward_return != null && (
            <span className={`font-mono tabular ${returnColor(caseStock.forward_return)}`}>{fmtPct(caseStock.forward_return)}</span>
          )}
        </div>
        {loading ? (
          <div className="h-[180px] flex items-center justify-center gap-2 text-[12px] text-muted">
            <span className="w-3 h-3 border-2 border-muted border-t-primary rounded-full animate-spin inline-block" />
            차트 불러오는 중…
          </div>
        ) : error ? (
          <div className="h-[180px] flex items-center justify-center text-[12px] text-trading-down">차트를 불러오지 못했습니다.</div>
        ) : (
          <MiniCandleChart
            bars={caseBars}
            markerDate={caseBars.find((b) => normDate(b.date) === normDate(caseStock.end_date))?.date}
          />
        )}
        {!loading && !error && (
          <p className="px-3 py-1.5 text-[11px] text-muted" style={{ borderTop: "1px solid var(--c-border)" }}>
            세로선 왼쪽이 현재 종목과 유사한 구간, 오른쪽이 실제로 흘러간 흐름입니다.
          </p>
        )}
      </div>
    </div>
  );
}
