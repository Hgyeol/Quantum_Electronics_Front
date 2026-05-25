"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  ColorType,
  CrosshairMode,
  PriceScaleMode,
} from "lightweight-charts";
import type { OHLCVBar, SupportResistanceLevel } from "@/lib/api";

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
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: "#1e2329" },
        textColor: "#848e9c",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#2b3139" },
        horzLines: { color: "#2b3139" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#fcd535", labelBackgroundColor: "#1e2329" },
        horzLine: { color: "#fcd535", labelBackgroundColor: "#1e2329" },
      },
      rightPriceScale: {
        borderColor: "#2b3139",
        mode: PriceScaleMode.Normal,
      },
      timeScale: {
        borderColor: "#2b3139",
        timeVisible: true,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#0ecb81",
      downColor: "#f6465d",
      borderUpColor: "#0ecb81",
      borderDownColor: "#f6465d",
      wickUpColor: "#0ecb81",
      wickDownColor: "#f6465d",
    });

    const candleData = ohlcv.map((b) => ({
      time: b.date as `${number}-${number}-${number}`,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));
    candleSeries.setData(candleData);

    // MA20
    const ma20Series = chart.addSeries(LineSeries, {
      color: "#f0b90b",
      lineWidth: 1,
      title: "MA20",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ma20Series.setData(calcMA(ohlcv, 20));

    // MA60
    if (ohlcv.length >= 60) {
      const ma60Series = chart.addSeries(LineSeries, {
        color: "#b37feb",
        lineWidth: 1,
        title: "MA60",
        priceLineVisible: false,
        lastValueVisible: false,
      });
      ma60Series.setData(calcMA(ohlcv, 60));
    }

    // Support price lines
    supports.forEach((s) => {
      candleSeries.createPriceLine({
        price: s.price,
        color: "#0ecb81",
        lineWidth: 1,
        lineStyle: 2, // dashed
        axisLabelVisible: true,
        title: `지지 ${(s.price / 1000).toFixed(0)}K`,
      });
    });

    // Resistance price lines
    resistances.forEach((r) => {
      candleSeries.createPriceLine({
        price: r.price,
        color: "#f6465d",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `저항 ${(r.price / 1000).toFixed(0)}K`,
      });
    });

    // Fit content
    chart.timeScale().fitContent();

    // Resize observer
    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [ohlcv, supports, resistances, currentPrice]);

  if (ohlcv.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-muted-strong">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#f0b90b] inline-block" /> MA20
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#b37feb] inline-block" /> MA60
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 border-t border-dashed border-[#0ecb81] inline-block" /> 지지선
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 border-t border-dashed border-[#f6465d] inline-block" /> 저항선
        </span>
      </div>
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />
    </div>
  );
}
