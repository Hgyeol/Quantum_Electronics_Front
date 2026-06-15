"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchIndicatorCatalog,
  fetchTechnicalIndicators,
  type IndicatorDefinition,
  type IndicatorValue,
} from "@/lib/api";

interface Props {
  stockCode: string;
}

function formatValue(value: IndicatorValue["value"]): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? value.toLocaleString("ko-KR")
      : value.toLocaleString("ko-KR", { maximumFractionDigits: 6 });
  }
  return String(value);
}

function Sparkline({ item }: { item: IndicatorValue }) {
  const values = item.series
    .map((point) => point.value)
    .filter((value): value is number => typeof value === "number");
  if (values.length === 0) {
    return <span className="text-xs text-muted">—</span>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return (
    <div className="h-8 flex items-end gap-0.5">
      {values.slice(-24).map((value, index) => (
        <span
          key={`${item.id}-${index}`}
          className="w-1 rounded-t-sm bg-accent-turquoise/70"
          style={{ height: `${4 + ((value - min) / span) * 26}px` }}
        />
      ))}
    </div>
  );
}

function parameterText(item: IndicatorDefinition | IndicatorValue): string {
  if ("parameters" in item && Array.isArray(item.parameters)) {
    const text = item.parameters
      .map((param) => `${param.name}=${param.default ?? "필수"}`)
      .join(", ");
    return text || "기본값 없음";
  }
  const entries = Object.entries(item.parameters ?? {});
  return entries.map(([key, value]) => `${key}=${value}`).join(", ") || "—";
}

export default function TechnicalIndicatorsPanel({ stockCode }: Props) {
  const [catalog, setCatalog] = useState<IndicatorDefinition[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [days, setDays] = useState(260);
  const [values, setValues] = useState<IndicatorValue[]>([]);
  const [status, setStatus] = useState("지표 목록을 불러오는 중");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchIndicatorCatalog()
      .then((items) => {
        if (cancelled) return;
        setCatalog(items);
        setSelected(new Set(items.map((item) => item.id)));
        setStatus(`${items.length}개 지표를 불러왔습니다.`);
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "지표 목록 로드 실패");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(catalog.map((item) => item.category))).sort(),
    [catalog],
  );

  const visibleCatalog = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return catalog.filter((item) => {
      const haystack = `${item.id} ${item.label} ${item.function_name}`.toLowerCase();
      return (
        (!category || item.category === category) &&
        (!normalized || haystack.includes(normalized))
      );
    });
  }, [catalog, category, query]);

  async function run() {
    if (selected.size === 0) {
      setStatus("조회할 지표를 선택해야 합니다.");
      return;
    }
    setLoading(true);
    setStatus("지표 계산 중");
    try {
      const payload = await fetchTechnicalIndicators({
        code: stockCode,
        ids: Array.from(selected),
        days,
      });
      setValues(payload.indicators);
      setStatus(
        payload.errors.length > 0
          ? payload.errors.map((error) => error.message).join(" / ")
          : `${payload.indicators.length}개 지표 계산 완료`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "지표 계산 실패");
      setValues([]);
    } finally {
      setLoading(false);
    }
  }

  function setVisibleChecked(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of visibleCatalog) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  }

  return (
    <section className="rounded-2xl bg-white border border-[var(--c-border)] overflow-hidden">
      <header className="px-6 py-4 border-b border-hairline-on-dark">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-bold text-ink">
              기술적 지표
            </h2>
            <p className="text-xs text-muted-strong mt-1">
              KIS strategy_builder 지표 전체 · {stockCode}
            </p>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={loading || catalog.length === 0}
            className="h-9 px-4 rounded-md bg-primary text-on-primary text-sm font-semibold disabled:bg-primary-disabled disabled:text-muted-strong"
          >
            {loading ? "계산 중..." : "선택 지표 조회"}
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[360px_1fr] min-h-[520px]">
        <aside className="border-b lg:border-b-0 lg:border-r border-hairline-on-dark">
          <div className="p-4 grid gap-3 border-b border-hairline-on-dark">
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <label className="grid gap-1 text-xs text-muted">
                검색
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-9 bg-canvas-dark border border-hairline-on-dark rounded-md px-3 text-on-dark"
                  placeholder="RSI, MACD, 이동평균"
                />
              </label>
              <label className="grid gap-1 text-xs text-muted">
                일수
                <input
                  type="number"
                  min={30}
                  max={1000}
                  value={days}
                  onChange={(event) => setDays(Number(event.target.value))}
                  className="h-9 bg-canvas-dark border border-hairline-on-dark rounded-md px-3 text-on-dark font-mono"
                />
              </label>
            </div>
            <label className="grid gap-1 text-xs text-muted">
              분류
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-9 bg-canvas-dark border border-hairline-on-dark rounded-md px-3 text-on-dark"
              >
                <option value="">전체</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibleChecked(true)}
                className="h-8 rounded-md border border-hairline-on-dark text-xs text-muted-strong hover:text-on-dark"
              >
                표시 항목 선택
              </button>
              <button
                type="button"
                onClick={() => setVisibleChecked(false)}
                className="h-8 rounded-md border border-hairline-on-dark text-xs text-muted-strong hover:text-on-dark"
              >
                표시 항목 해제
              </button>
            </div>
            <p className="text-xs text-muted-strong">
              전체 {catalog.length}개 · 표시 {visibleCatalog.length}개 · 선택 {selected.size}개
            </p>
          </div>

          <div className="max-h-[430px] overflow-auto p-2">
            {visibleCatalog.map((item) => (
              <label
                key={item.id}
                className="grid grid-cols-[18px_1fr] gap-3 p-2 rounded-md hover:bg-canvas-dark cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={(event) => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (event.target.checked) next.add(item.id);
                      else next.delete(item.id);
                      return next;
                    });
                  }}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="block text-sm text-on-dark leading-snug">
                    {item.label}
                  </span>
                  <span className="block text-[11px] text-muted-strong font-mono mt-1">
                    {item.id} · {item.category}
                  </span>
                  <span className="block text-[11px] text-muted mt-0.5 truncate">
                    {parameterText(item)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="px-5 py-3 border-b border-hairline-on-dark text-xs text-muted-strong">
            {status}
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-canvas-dark text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">지표</th>
                  <th className="text-left px-4 py-3 font-medium">분류</th>
                  <th className="text-right px-4 py-3 font-medium">최신값</th>
                  <th className="text-left px-4 py-3 font-medium">파라미터</th>
                  <th className="text-left px-4 py-3 font-medium">최근 흐름</th>
                  <th className="text-left px-4 py-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {values.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-strong">
                      선택 지표 조회를 실행하면 결과가 표시됩니다.
                    </td>
                  </tr>
                ) : (
                  values.map((item) => (
                    <tr key={item.id} className="border-t border-hairline-on-dark">
                      <td className="px-4 py-3 align-top">
                        <span className="block text-on-dark">{item.label}</span>
                        <span className="text-[11px] text-muted font-mono">
                          {item.id}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-muted-strong">
                        {item.category}
                      </td>
                      <td className="px-4 py-3 align-top text-right font-mono tabular text-on-dark">
                        {formatValue(item.value)}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-muted-strong font-mono">
                        {parameterText(item)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Sparkline item={item} />
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-muted-strong">
                        {item.error ? (
                          <span className="text-trading-down">{item.error}</span>
                        ) : item.uses_default_benchmark ? (
                          "기본 벤치마크 사용"
                        ) : (
                          "정상"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
