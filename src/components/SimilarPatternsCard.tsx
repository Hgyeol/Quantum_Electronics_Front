"use client";

import { useState } from "react";
import { fetchSimilarPatterns, type PatternMatchResult, type SimilarCase, type OHLCVBar } from "@/lib/api";
import StockLogo from "@/components/StockLogo";

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

export default function SimilarPatternsCard({ stockCode, ohlcv, onSelect }: Props) {
  const [windowDays, setWindowDays] = useState(40);
  const [horizon, setHorizon] = useState(20);
  const [result, setResult] = useState<PatternMatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState<SimilarCase | null>(null);

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
      const res = await fetchSimilarPatterns(stockCode, start, end, horizon, 10);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const stats = result?.stats;

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

        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="h-9 px-5 rounded-lg bg-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted-strong text-white text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2"
        >
          {loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />}
          {loading ? "검색 중" : "유사 차트 찾기"}
        </button>

        {error && <p className="text-[13px] text-trading-down">{error}</p>}
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
                  <CompareChart
                    queryCloses={result.query_closes}
                    caseWindow={c.window_closes}
                    caseForward={c.forward_closes}
                    caseName={c.stock_name || c.stock_code}
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

// ── 비교 차트 (시작점=100 지수화 오버레이) ─────────────────────────────────────

function CompareChart({
  queryCloses,
  caseWindow,
  caseForward,
  caseName,
}: {
  queryCloses: number[];
  caseWindow: number[];
  caseForward: number[];
  caseName: string;
}) {
  const W = 320, H = 150, padX = 8, padY = 12;

  // 시작점=100 지수화
  const idx = (arr: number[]) => {
    const base = arr[0] || 1;
    return arr.map((v) => (v / base) * 100);
  };
  const q = idx(queryCloses);
  const caseFull = idx([...caseWindow, ...caseForward]);
  const winLen = caseWindow.length;

  const maxX = Math.max(q.length, caseFull.length) - 1 || 1;
  const allVals = [...q, ...caseFull];
  const yMin = Math.min(...allVals);
  const yMax = Math.max(...allVals);
  const ySpan = (yMax - yMin) || 1;

  const sx = (i: number) => padX + (i / maxX) * (W - padX * 2);
  const sy = (v: number) => padY + (1 - (v - yMin) / ySpan) * (H - padY * 2);

  // x 인덱스는 offset부터 시작 (forward는 윈도우 끝 인덱스에 이어서 그림)
  const path = (vals: number[], offset = 0) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${sx(offset + i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");

  const dividerX = sx(winLen - 1);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
        {/* 기준선 100 */}
        <line x1={padX} y1={sy(100)} x2={W - padX} y2={sy(100)} stroke="var(--c-border)" strokeWidth="1" strokeDasharray="2 2" />
        {/* 윈도우/이후 구분선 */}
        {caseForward.length > 0 && (
          <line x1={dividerX} y1={padY} x2={dividerX} y2={H - padY} stroke="var(--c-border-strong)" strokeWidth="1" strokeDasharray="3 3" />
        )}
        {/* 사례: 윈도우(실선) */}
        <path d={path(caseFull.slice(0, winLen))} fill="none" stroke="#8b95a1" strokeWidth="1.5" />
        {/* 사례: 이후(점선) — 윈도우 끝 점에서 이어짐 */}
        {caseForward.length > 0 && (
          <path d={path(caseFull.slice(winLen - 1), winLen - 1)} fill="none" stroke="#8b95a1" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
        )}
        {/* 현재(질의): primary */}
        <path d={path(q)} fill="none" stroke="#3182f6" strokeWidth="2" />
      </svg>
      <div className="flex items-center gap-4 mt-1.5 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5" style={{ background: "#3182f6" }} /> 현재 종목
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5" style={{ background: "#8b95a1" }} /> {caseName}
        </span>
        {caseForward.length > 0 && (
          <span className="text-muted">· 점선 오른쪽 = 그때 이후</span>
        )}
      </div>
    </div>
  );
}
