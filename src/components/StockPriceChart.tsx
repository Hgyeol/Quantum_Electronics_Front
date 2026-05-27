"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  IChartApi,
  ColorType,
  CrosshairMode,
  PriceScaleMode,
  type Logical,
  type LogicalRangeChangeEventHandler,
} from "lightweight-charts";
import type { OHLCVBar, SupportResistanceLevel } from "@/lib/api";

// Toss 라이트 테마 + 한국 관행 (상승=빨강, 하락=파랑)
const COLORS = {
  bg: "#FFFFFF",
  text: "#8B95A1",
  grid: "#F0F2F5",
  border: "#E5E8EB",
  crosshair: "#88929f",
  up: "#F04452",              // 상승 = 빨강
  down: "#1B64DA",            // 하락 = 파랑
  ma20: "#F5A623",            // 이동평균 20
  ma60: "#9B59B6",            // 이동평균 60
  support: "#1B64DA",         // 지지선 = 파랑
  resistance: "#F04452",      // 저항선 = 빨강
} as const;

interface Props {
  ohlcv: OHLCVBar[];
  supports: SupportResistanceLevel[];
  resistances: SupportResistanceLevel[];
  currentPrice: number;
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

export default function StockPriceChart({ ohlcv, supports, resistances, currentPrice }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

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

    const ma20 = chart.addSeries(LineSeries, {
      color: COLORS.ma20, lineWidth: 1, title: "MA20",
      priceLineVisible: false, lastValueVisible: false,
    });
    ma20.setData(calcMA(ohlcv, 20));

    if (ohlcv.length >= 60) {
      const ma60 = chart.addSeries(LineSeries, {
        color: COLORS.ma60, lineWidth: 1, title: "MA60",
        priceLineVisible: false, lastValueVisible: false,
      });
      ma60.setData(calcMA(ohlcv, 60));
    }

    supports.forEach((s) => {
      candleSeries.createPriceLine({
        price: s.price, color: COLORS.support,
        lineWidth: 1, lineStyle: 2, axisLabelVisible: true,
        title: `지지 ${(s.price / 1000).toFixed(0)}K`,
      });
    });

    resistances.forEach((r) => {
      candleSeries.createPriceLine({
        price: r.price, color: COLORS.resistance,
        lineWidth: 1, lineStyle: 2, axisLabelVisible: true,
        title: `저항 ${(r.price / 1000).toFixed(0)}K`,
      });
    });

    chart.timeScale().fitContent();

    // 데이터 범위 밖으로 스크롤 방지
    const barCount = ohlcv.length;
    let clamping = false;
    const onRangeChange: LogicalRangeChangeEventHandler = (range) => {
      if (!range || clamping) return;
      const width = range.to - range.from;
      let from = range.from as number;
      let to = range.to as number;
      if (from < 0) { from = 0; to = width; }
      if (to > barCount - 1) { to = barCount - 1; from = Math.max(0, to - width); }
      if (from !== (range.from as number) || to !== (range.to as number)) {
        clamping = true;
        chart.timeScale().setVisibleLogicalRange({ from: from as Logical, to: to as Logical });
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
    };
  }, [ohlcv, supports, resistances, currentPrice]);

  if (ohlcv.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 inline-block rounded" style={{ background: COLORS.ma20 }} /> MA20
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 inline-block rounded" style={{ background: COLORS.ma60 }} /> MA60
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 inline-block border-t border-dashed" style={{ borderColor: COLORS.support }} /> 지지선
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 inline-block border-t border-dashed" style={{ borderColor: COLORS.resistance }} /> 저항선
        </span>
      </div>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-hairline-on-dark" />
    </div>
  );
}
