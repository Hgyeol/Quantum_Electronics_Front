// Number formatting helpers — all numbers must render in BinancePlex / mono.

const KRW = new Intl.NumberFormat("ko-KR");
const PCT = new Intl.NumberFormat("ko-KR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const COMPACT = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 2,
});

export function formatKRW(amount: number): string {
  return `${KRW.format(Math.round(amount))}원`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return KRW.format(value);
}

export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return COMPACT.format(value);
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${PCT.format(value)}%`;
}

export function formatProbability(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${PCT.format(value * 100)}%`;
}

export function directionClass(
  direction: "positive" | "negative" | "neutral",
): string {
  if (direction === "positive") return "text-trading-up";
  if (direction === "negative") return "text-trading-down";
  return "text-muted-strong";
}

export function scoreClass(score: number): string {
  if (score > 0) return "text-trading-up";
  if (score < 0) return "text-trading-down";
  return "text-muted-strong";
}
