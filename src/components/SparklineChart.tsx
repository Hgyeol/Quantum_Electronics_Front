"use client";

import { useEffect, useState } from "react";

const API_BASE = "/api";
const _cache = new Map<string, number[]>();

interface Props {
  code: string;
  positive: boolean | null;
  width?: number;
  height?: number;
}

export default function SparklineChart({ code, positive, width = 64, height = 32 }: Props) {
  const [prices, setPrices] = useState<number[]>(_cache.get(code) ?? []);
  const [loading, setLoading] = useState(!_cache.has(code));

  useEffect(() => {
    if (_cache.has(code)) {
      setPrices(_cache.get(code)!);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API_BASE}/chart/${encodeURIComponent(code)}?days=60`, {
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    if (height >= 80) {
      return (
        <div
          style={{ width, height, background: "rgba(2,32,71,0.04)", borderRadius: 6 }}
          className="animate-pulse"
        />
      );
    }
    return <div style={{ width, height }} />;
  }

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
