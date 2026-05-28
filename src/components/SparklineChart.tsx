"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const _cache = new Map<string, number[]>();

interface Props {
  code: string;
  positive: boolean | null;
  width?: number;
  height?: number;
}

export default function SparklineChart({ code, positive, width = 64, height = 32 }: Props) {
  const [prices, setPrices] = useState<number[]>(_cache.get(code) ?? []);

  useEffect(() => {
    if (_cache.has(code)) { setPrices(_cache.get(code)!); return; }
    fetch(`${API_BASE}/chart/${encodeURIComponent(code)}?days=30`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d: { ohlcv?: { close: number }[] }) => {
        const closes = (d.ohlcv ?? []).slice(-20).map((b) => b.close);
        if (closes.length >= 2) {
          _cache.set(code, closes);
          setPrices(closes);
        }
      })
      .catch(() => {});
  }, [code]);

  if (prices.length < 2) {
    return <div style={{ width, height }} />;
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pad = 2;
  const points = prices
    .map((p, i) => {
      const x = pad + (i / (prices.length - 1)) * (width - pad * 2);
      const y = pad + (height - pad * 2) - ((p - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const color = positive === null ? "#8B95A1" : positive ? "#F04452" : "#3182F6";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <polyline
        points={points}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
