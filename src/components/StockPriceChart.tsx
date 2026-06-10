"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  IChartApi,
  ColorType,
  CrosshairMode,
  PriceScaleMode,
  type ISeriesApi,
  type IPriceLine,
  type Logical,
  type CandlestickData,
  type HistogramData,
} from "lightweight-charts";
import type { OHLCVBar, SupportResistanceLevel } from "@/lib/api";

const CHART_LIGHT = { bg: "#FFFFFF", text: "#8B95A1", grid: "#F0F2F5", border: "#E5E8EB", crosshair: "#88929f" };
const CHART_DARK  = { bg: "#161b22", text: "#6e7681", grid: "#21262d", border: "#30363d", crosshair: "#6e7681" };
const COLORS = {
  up: "#F04452",
  down: "#3182f6",
  ma5:  "#26C6DA",
  ma20: "#F5A623",
  ma60: "#9B59B6",
  ma120: "#2ECC71",
  support: "#3182f6",
  resistance: "#F04452",
} as const;

interface Props {
  ohlcv: OHLCVBar[];
  todayBar?: OHLCVBar | null;
  supports: SupportResistanceLevel[];
  resistances: SupportResistanceLevel[];
  currentPrice: number;
  onBarHover?: (bar: OHLCVBar | null) => void;
  onBarClick?: (bar: OHLCVBar | null) => void;
  defaultPeriod?: Period;
  minimal?: boolean;
  /** 이 날짜(YYYY-MM-DD) 위치에 "현재 시점" 세로선 표시 */
  markerDate?: string;
}

function calcMA(ohlcv: OHLCVBar[], period: number) {
  return ohlcv
    .map((bar, i) => {
      if (i < period - 1) return null;
      const slice = ohlcv.slice(i - period + 1, i + 1);
      const avg = slice.reduce((s, b) => s + b.close, 0) / period;
      return { time: bar.date as `${number}-${number}-${number}`, value: avg };
    })
    .filter(Boolean) as { time: `${number}-${number}-${number}`; value: number }[];
}

type VisibilityKey = "ma5" | "ma20" | "ma60" | "ma120" | "support" | "resistance";
type Period = "1W" | "1M" | "3M" | "6M" | "1Y";

const PERIODS: { id: Period; label: string; bars: number }[] = [
  { id: "1W",  label: "1주",   bars: 5 },
  { id: "1M",  label: "1개월", bars: 22 },
  { id: "3M",  label: "3개월", bars: 65 },
  { id: "6M",  label: "6개월", bars: 130 },
  { id: "1Y",  label: "1년",   bars: 260 },
];

const LEGEND: { key: VisibilityKey; label: string; color: string }[] = [
  { key: "ma5",         label: "MA5",   color: COLORS.ma5 },
  { key: "ma20",        label: "MA20",  color: COLORS.ma20 },
  { key: "ma60",        label: "MA60",  color: COLORS.ma60 },
  { key: "ma120",       label: "MA120", color: COLORS.ma120 },
  { key: "support",     label: "지지선", color: COLORS.support },
  { key: "resistance",  label: "저항선", color: COLORS.resistance },
];

export default function StockPriceChart({ ohlcv, todayBar, supports, resistances, currentPrice, onBarHover, onBarClick, defaultPeriod = "3M", minimal = false, markerDate }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const currentPriceLineRef = useRef<IPriceLine | null>(null);
  const seriesRefs = useRef<{
    ma5?: ISeriesApi<"Line">;
    ma20?: ISeriesApi<"Line">;
    ma60?: ISeriesApi<"Line">;
    ma120?: ISeriesApi<"Line">;
    supportLines?: IPriceLine[];
    resistanceLines?: IPriceLine[];
  }>({});

  const [visible, setVisible] = useState<Record<VisibilityKey, boolean>>({
    ma5: !minimal, ma20: !minimal, ma60: !minimal, ma120: !minimal,
    support: !minimal, resistance: !minimal,
  });
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [markerX, setMarkerX] = useState<number | null>(null);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // 차트 생성
  useEffect(() => {
    if (!containerRef.current || ohlcv.length === 0) return;

    const theme = isDark ? CHART_DARK : CHART_LIGHT;
    const container = containerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: minimal ? 240 : 360,
      layout: {
        background: { type: ColorType.Solid, color: theme.bg },
        textColor: theme.text,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: theme.grid },
        horzLines: { color: theme.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: theme.crosshair, labelBackgroundColor: theme.crosshair },
        horzLine: { color: theme.crosshair, labelBackgroundColor: theme.crosshair },
      },
      rightPriceScale: {
        borderColor: theme.border,
        mode: PriceScaleMode.Normal,
        visible: !minimal,
      },
      timeScale: {
        borderColor: theme.border,
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
    });
    chartRef.current = chart;
    candleSeriesRef.current = null;
    volumeSeriesRef.current = null;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      borderUpColor: COLORS.up,
      borderDownColor: COLORS.down,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
    });
    candleSeries.setData(
      ohlcv.map((b) => ({
        time: b.date as `${number}-${number}-${number}`,
        open: b.open, high: b.high, low: b.low, close: b.close,
      }))
    );
    candleSeriesRef.current = candleSeries;

    if (!minimal) {
      const maOptions = { priceLineVisible: false, lastValueVisible: false, autoscaleInfoProvider: () => null };

      const ma5Series = chart.addSeries(LineSeries, { color: COLORS.ma5, lineWidth: 1, title: "", ...maOptions });
      ma5Series.setData(calcMA(ohlcv, 5));
      seriesRefs.current.ma5 = ma5Series;

      const ma20Series = chart.addSeries(LineSeries, { color: COLORS.ma20, lineWidth: 1, title: "", ...maOptions });
      ma20Series.setData(calcMA(ohlcv, 20));
      seriesRefs.current.ma20 = ma20Series;

      if (ohlcv.length >= 60) {
        const ma60Series = chart.addSeries(LineSeries, { color: COLORS.ma60, lineWidth: 1, title: "", ...maOptions });
        ma60Series.setData(calcMA(ohlcv, 60));
        seriesRefs.current.ma60 = ma60Series;
      }

      if (ohlcv.length >= 120) {
        const ma120Series = chart.addSeries(LineSeries, { color: COLORS.ma120, lineWidth: 1, title: "", ...maOptions });
        ma120Series.setData(calcMA(ohlcv, 120));
        seriesRefs.current.ma120 = ma120Series;
      }
    }

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(
      ohlcv.map((b) => ({
        time: b.date as `${number}-${number}-${number}`,
        value: b.volume,
        color: b.close >= b.open ? `${COLORS.up}66` : `${COLORS.down}66`,
      }))
    );
    volumeSeriesRef.current = volumeSeries;

    const ohlcvByDate = new Map(ohlcv.map((b) => [b.date, b]));

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) { onBarHover?.(null); return; }
      onBarHover?.(ohlcvByDate.get(String(param.time)) ?? null);
    });

    chart.subscribeClick((param) => {
      if (!param.time) { onBarClick?.(null); return; }
      onBarClick?.(ohlcvByDate.get(String(param.time)) ?? null);
    });

    currentPriceLineRef.current = candleSeries.createPriceLine({
      price: currentPrice,
      color: "#F5A623",
      lineWidth: 1,
      lineStyle: 0,
      axisLabelVisible: true,
      title: "",
    });

    const supportLines: IPriceLine[] = supports.map((s) =>
      candleSeries.createPriceLine({
        price: s.price, color: COLORS.support,
        lineWidth: 1, lineStyle: 2, axisLabelVisible: false,
        title: "",
      })
    );
    seriesRefs.current.supportLines = supportLines;

    const resistanceLines: IPriceLine[] = resistances.map((r) =>
      candleSeries.createPriceLine({
        price: r.price, color: COLORS.resistance,
        lineWidth: 1, lineStyle: 2, axisLabelVisible: false,
        title: "",
      })
    );
    seriesRefs.current.resistanceLines = resistanceLines;

    const barCount = ohlcv.length;
    const defaultBars = 65;
    const from = Math.max(0, barCount - defaultBars);
    chart.timeScale().setVisibleLogicalRange({ from: from as Logical, to: (barCount - 1) as Logical });

    // markerDate 세로선 x좌표 갱신 (범위·리사이즈 변경 시 재계산)
    const updateMarkerX = () => {
      if (!markerDate) { setMarkerX(null); return; }
      const x = chart.timeScale().timeToCoordinate(markerDate as `${number}-${number}-${number}`);
      setMarkerX(x == null ? null : Number(x));
    };
    updateMarkerX();
    chart.timeScale().subscribeVisibleTimeRangeChange(updateMarkerX);

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth });
      updateMarkerX();
    });
    ro.observe(container);

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(updateMarkerX);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      currentPriceLineRef.current = null;
      seriesRefs.current = {};
    };
  }, [ohlcv, supports, resistances, isDark, markerDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // 기간 탭 변경 시 차트 범위 조정
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || ohlcv.length === 0) return;
    const bars = PERIODS.find((p) => p.id === period)?.bars ?? 65;
    const barCount = ohlcv.length;
    const from = Math.max(0, barCount - bars);
    chart.timeScale().setVisibleLogicalRange({ from: from as Logical, to: (barCount - 1) as Logical });
  }, [period, ohlcv.length]);

  // 가시성 토글
  useEffect(() => {
    const refs = seriesRefs.current;
    refs.ma5?.applyOptions({ visible: visible.ma5 });
    refs.ma20?.applyOptions({ visible: visible.ma20 });
    refs.ma60?.applyOptions({ visible: visible.ma60 });
    refs.ma120?.applyOptions({ visible: visible.ma120 });
    refs.supportLines?.forEach((line) =>
      line.applyOptions({
        color: visible.support ? COLORS.support : "transparent",
        axisLabelVisible: false,
      })
    );
    refs.resistanceLines?.forEach((line) =>
      line.applyOptions({
        color: visible.resistance ? COLORS.resistance : "transparent",
        axisLabelVisible: false,
      })
    );
  }, [visible]);

  // 현재가 선 실시간 업데이트
  useEffect(() => {
    currentPriceLineRef.current?.applyOptions({ price: currentPrice });
  }, [currentPrice]);

  // 오늘 캔들 실시간 업데이트 (차트 재생성 없이 series.update()만 호출)
  useEffect(() => {
    if (!todayBar || !candleSeriesRef.current || !volumeSeriesRef.current) return;
    const t = todayBar.date as `${number}-${number}-${number}`;
    (candleSeriesRef.current as ISeriesApi<"Candlestick">).update({
      time: t, open: todayBar.open, high: todayBar.high, low: todayBar.low, close: todayBar.close,
    } as CandlestickData);
    (volumeSeriesRef.current as ISeriesApi<"Histogram">).update({
      time: t, value: todayBar.volume,
      color: todayBar.close >= todayBar.open ? `${COLORS.up}66` : `${COLORS.down}66`,
    } as HistogramData);
  }, [todayBar]);

  if (ohlcv.length === 0) return null;

  function toggle(key: VisibilityKey) {
    setVisible((v) => ({ ...v, [key]: !v[key] }));
  }

  return (
    <div className="space-y-0">
      {/* 기간 탭 (TDS Segmented Control) */}
      {!minimal && (
        <div className="flex items-center px-5 pt-4 pb-3">
          <div
            className="flex gap-0 p-[3px] rounded-[10px]"
            style={{ background: "var(--c-bg-muted)" }}
          >
            {PERIODS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeriod(id)}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all cursor-pointer ${
                  period === id
                    ? "bg-white text-body"
                    : "text-muted hover:text-body"
                }`}
                style={period === id ? { boxShadow: "0 1px 4px var(--c-shadow)" } : {}}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 차트 */}
      <div className={`relative ${minimal ? "ml-5 mr-[72px]" : "w-full"}`}>
        <div ref={containerRef} className="w-full" />
        {markerX != null && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-10"
            style={{ left: `${markerX}px`, width: 0, borderLeft: "1.5px dashed #3182f6" }}
          >
            <span className="absolute top-1 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-primary bg-white/80 px-1 rounded">
              유사 구간
            </span>
          </div>
        )}
      </div>

      {/* MA / 지지저항 토글 */}
      {!minimal && (
        <div
          className="flex items-center gap-3 px-5 py-3 flex-wrap text-xs"
          style={{ borderTop: "1px solid var(--c-border)" }}
        >
          {LEGEND.map(({ key, label, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span
                className="w-2 h-2 rounded-full border-2 transition-colors"
                style={{
                  backgroundColor: visible[key] ? color : "transparent",
                  borderColor: color,
                }}
              />
              <span style={{ color: visible[key] ? color : "#8B95A1" }}>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
