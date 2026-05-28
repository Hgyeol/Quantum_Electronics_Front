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
  type LogicalRangeChangeEventHandler,
} from "lightweight-charts";
import type { OHLCVBar, SupportResistanceLevel } from "@/lib/api";

const COLORS = {
  bg: "#FFFFFF",
  text: "#8B95A1",
  grid: "#F0F2F5",
  border: "#E5E8EB",
  crosshair: "#88929f",
  up: "#F04452",
  down: "#1B64DA",
  ma5:  "#26C6DA",
  ma20: "#F5A623",
  ma60: "#9B59B6",
  ma120: "#2ECC71",
  support: "#1B64DA",
  resistance: "#F04452",
} as const;

interface Props {
  ohlcv: OHLCVBar[];
  supports: SupportResistanceLevel[];
  resistances: SupportResistanceLevel[];
  currentPrice: number;
  onBarHover?: (bar: OHLCVBar | null) => void;
  onBarClick?: (bar: OHLCVBar | null) => void;
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

export default function StockPriceChart({ ohlcv, supports, resistances, currentPrice, onBarHover, onBarClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<{
    ma5?: ISeriesApi<"Line">;
    ma20?: ISeriesApi<"Line">;
    ma60?: ISeriesApi<"Line">;
    ma120?: ISeriesApi<"Line">;
    supportLines?: IPriceLine[];
    resistanceLines?: IPriceLine[];
  }>({});

  const [visible, setVisible] = useState<Record<VisibilityKey, boolean>>({
    ma5: true, ma20: true, ma60: true, ma120: true,
    support: true, resistance: true,
  });
  const [period, setPeriod] = useState<Period>("3M");

  // 차트 생성
  useEffect(() => {
    if (!containerRef.current || ohlcv.length === 0) return;

    const container = containerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 360,
      layout: {
        background: { type: ColorType.Solid, color: COLORS.bg },
        textColor: COLORS.text,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: COLORS.crosshair, labelBackgroundColor: COLORS.crosshair },
        horzLine: { color: COLORS.crosshair, labelBackgroundColor: COLORS.crosshair },
      },
      rightPriceScale: {
        borderColor: COLORS.border,
        mode: PriceScaleMode.Normal,
      },
      timeScale: {
        borderColor: COLORS.border,
        timeVisible: true,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;

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

    const maOptions = { priceLineVisible: false, lastValueVisible: false, autoscaleInfoProvider: () => null };

    const ma5Series = chart.addSeries(LineSeries, { color: COLORS.ma5, lineWidth: 1, title: "MA5", ...maOptions });
    ma5Series.setData(calcMA(ohlcv, 5));
    seriesRefs.current.ma5 = ma5Series;

    const ma20Series = chart.addSeries(LineSeries, { color: COLORS.ma20, lineWidth: 1, title: "MA20", ...maOptions });
    ma20Series.setData(calcMA(ohlcv, 20));
    seriesRefs.current.ma20 = ma20Series;

    if (ohlcv.length >= 60) {
      const ma60Series = chart.addSeries(LineSeries, { color: COLORS.ma60, lineWidth: 1, title: "MA60", ...maOptions });
      ma60Series.setData(calcMA(ohlcv, 60));
      seriesRefs.current.ma60 = ma60Series;
    }

    if (ohlcv.length >= 120) {
      const ma120Series = chart.addSeries(LineSeries, { color: COLORS.ma120, lineWidth: 1, title: "MA120", ...maOptions });
      ma120Series.setData(calcMA(ohlcv, 120));
      seriesRefs.current.ma120 = ma120Series;
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

    const ohlcvByDate = new Map(ohlcv.map((b) => [b.date, b]));

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) { onBarHover?.(null); return; }
      onBarHover?.(ohlcvByDate.get(String(param.time)) ?? null);
    });

    chart.subscribeClick((param) => {
      if (!param.time) { onBarClick?.(null); return; }
      onBarClick?.(ohlcvByDate.get(String(param.time)) ?? null);
    });

    const supportLines: IPriceLine[] = supports.map((s) =>
      candleSeries.createPriceLine({
        price: s.price, color: COLORS.support,
        lineWidth: 1, lineStyle: 2, axisLabelVisible: true,
        title: `지지 ${(s.price / 1000).toFixed(0)}K`,
      })
    );
    seriesRefs.current.supportLines = supportLines;

    const resistanceLines: IPriceLine[] = resistances.map((r) =>
      candleSeries.createPriceLine({
        price: r.price, color: COLORS.resistance,
        lineWidth: 1, lineStyle: 2, axisLabelVisible: true,
        title: `저항 ${(r.price / 1000).toFixed(0)}K`,
      })
    );
    seriesRefs.current.resistanceLines = resistanceLines;

    const barCount = ohlcv.length;
    const defaultBars = 65;
    const from = Math.max(0, barCount - defaultBars);
    chart.timeScale().setVisibleLogicalRange({ from: from as Logical, to: (barCount - 1) as Logical });

    let clamping = false;
    const onRangeChange: LogicalRangeChangeEventHandler = (range) => {
      if (!range || clamping) return;
      const width = range.to - range.from;
      let f = range.from as number;
      let t = range.to as number;
      if (f < 0) { f = 0; t = width; }
      if (t > barCount - 1) { t = barCount - 1; f = Math.max(0, t - width); }
      if (f !== (range.from as number) || t !== (range.to as number)) {
        clamping = true;
        chart.timeScale().setVisibleLogicalRange({ from: f as Logical, to: t as Logical });
        clamping = false;
      }
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange);

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth });
    });
    ro.observe(container);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRangeChange);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRefs.current = {};
    };
  }, [ohlcv, supports, resistances, currentPrice]);

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
        axisLabelVisible: visible.support,
      })
    );
    refs.resistanceLines?.forEach((line) =>
      line.applyOptions({
        color: visible.resistance ? COLORS.resistance : "transparent",
        axisLabelVisible: visible.resistance,
      })
    );
  }, [visible]);

  if (ohlcv.length === 0) return null;

  function toggle(key: VisibilityKey) {
    setVisible((v) => ({ ...v, [key]: !v[key] }));
  }

  return (
    <div className="space-y-0">
      {/* 기간 탭 (TDS Segmented Control) */}
      <div className="flex items-center px-5 pt-4 pb-3">
        <div
          className="flex gap-0 p-[3px] rounded-[10px]"
          style={{ background: "rgba(2,32,71,0.05)" }}
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
              style={period === id ? { boxShadow: "0 1px 4px rgba(0,29,58,0.12)" } : {}}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 */}
      <div ref={containerRef} className="w-full" />

      {/* MA / 지지저항 토글 */}
      <div
        className="flex items-center gap-3 px-5 py-3 flex-wrap text-xs"
        style={{ borderTop: "1px solid rgba(2,32,71,0.06)" }}
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
    </div>
  );
}
