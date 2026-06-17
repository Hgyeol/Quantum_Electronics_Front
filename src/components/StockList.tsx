"use client";

import { useEffect, useState, type ReactNode } from "react";
import StockLogo from "@/components/StockLogo";

// ── 타입 ────────────────────────────────────────────────────────────────────

export interface StockListColumn<T> {
  key: string;
  label?: ReactNode;
  width: string;          // CSS grid track size (e.g. "1fr", "6rem")
  align?: "left" | "right" | "center";
  mobileHidden?: boolean;
  mobileOnly?: boolean;
  render: (item: T, idx: number) => ReactNode;
}

// ── 공통 컬럼 카탈로그 ────────────────────────────────────────────────────────
//  width / label / align 만 사전 정의. render는 각 섹션이 자기 item 타입에 맞춰 제공.
//  사용 예: { ...COLS.volume, render: (i) => <MutedNumber>...</MutedNumber> }

export const COLS = {
  rank:    { key: "rank",    width: "2.5rem", align: "center" as const, label: "#" },
  name:    { key: "name",    width: "1fr",                              label: "종목명" },
  price:   { key: "price",   width: "6rem",   align: "right" as const,  label: "현재가" },
  change:  { key: "change",  width: "5.5rem", align: "right" as const,  label: "등락률" },
  volume:  { key: "volume",  width: "7rem",   align: "right" as const,  label: "거래량" },
  amount:  { key: "amount",  width: "6rem",   align: "right" as const,  label: "거래대금" },
  matched: { key: "matched", width: "10rem",  align: "right" as const,  label: "매칭 조건" },
  remove:  { key: "remove",  width: "2rem",   align: "center" as const, label: "" },
} as const;

interface Props<T> {
  items: T[];
  columns: StockListColumn<T>[];
  getKey: (item: T) => string;
  onSelect?: (item: T) => void;
  onRowHover?: (item: T) => void;
  onRowHoverEnd?: () => void;
  activeKey?: string | null;
  hoveredKey?: string | null;
  loading?: boolean;
  loadingRows?: number;
  emptyMessage?: ReactNode;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function StockList<T>({
  items,
  columns,
  getKey,
  onSelect,
  onRowHover,
  onRowHoverEnd,
  activeKey,
  hoveredKey,
  loading,
  loadingRows = 8,
  emptyMessage,
}: Props<T>) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const visibleColumns = columns.filter((column) => (
    isMobile ? !column.mobileHidden : !column.mobileOnly
  ));
  const gridCols = visibleColumns.map((c) => c.width).join(" ");
  const gridStyle = { gridTemplateColumns: gridCols };
  const hasLabels = visibleColumns.some((c) => c.label);
  const minTableWidth = isMobile ? "0px" : "720px";

  if (loading && items.length === 0) {
    return (
      <>
        {hasLabels && <ColumnLabels columns={visibleColumns} minWidth={minTableWidth} />}
        <div className="overflow-x-auto">
        <ul style={{ minWidth: minTableWidth }}>
          {Array.from({ length: loadingRows }).map((_, i) => (
            <li
              key={i}
              className="grid gap-3 items-center px-5 py-3.5 animate-pulse"
              style={{ ...gridStyle, borderTop: i > 0 ? "1px solid var(--c-border)" : undefined }}
            >
              {visibleColumns.map((c) => (
                <span key={c.key} className={alignClass(c.align)}>
                  <span
                    className="inline-block h-3 w-16 rounded"
                    style={{ background: "var(--c-border)" }}
                  />
                </span>
              ))}
            </li>
          ))}
        </ul>
        </div>
      </>
    );
  }

  if (items.length === 0) {
    if (!emptyMessage) return null;
    return (
      <>
        {hasLabels && <ColumnLabels columns={visibleColumns} minWidth={minTableWidth} />}
        <div className="px-5 py-10 text-center text-sm text-muted">{emptyMessage}</div>
      </>
    );
  }

  return (
    <>
      {hasLabels && <ColumnLabels columns={visibleColumns} minWidth={minTableWidth} />}
      <div className="overflow-x-auto">
      <ul style={{ minWidth: minTableWidth }}>
        {items.map((item, idx) => {
          const key = getKey(item);
          const isActive = activeKey === key;
          const isHovered = hoveredKey === key;
          return (
            <li
              key={key}
              onClick={() => onSelect?.(item)}
              onMouseEnter={(e) => {
                if (!isActive && !isHovered) e.currentTarget.style.background = "var(--c-hover)";
                onRowHover?.(item);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "";
                onRowHoverEnd?.();
              }}
              className="group grid gap-3 items-center px-5 py-3 cursor-pointer transition-colors"
              style={{
                ...gridStyle,
                borderTop: idx > 0 ? "1px solid var(--c-border)" : undefined,
                background: isActive
                  ? "rgba(49,130,246,0.06)"
                  : isHovered ? "var(--c-hover)" : undefined,
              }}
            >
              {visibleColumns.map((c) => (
                <span key={c.key} className={`min-w-0 ${alignClass(c.align)}`}>
                  {c.render(item, idx)}
                </span>
              ))}
            </li>
          );
        })}
      </ul>
      </div>
    </>
  );
}

function ColumnLabels<T>({ columns, minWidth }: { columns: StockListColumn<T>[]; minWidth: string }) {
  const gridCols = columns.map((c) => c.width).join(" ");
  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-3 px-5 py-2 text-[10px] uppercase tracking-widest text-muted"
        style={{ gridTemplateColumns: gridCols, background: "var(--c-bg-subtle)", minWidth }}
      >
        {columns.map((c) => (
          <span key={c.key} className={alignClass(c.align)}>
            {c.label ?? ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function alignClass(a?: "left" | "right" | "center"): string {
  if (a === "right") return "text-right";
  if (a === "center") return "text-center";
  return "text-left";
}

// ── 공통 셀 컴포넌트 ─────────────────────────────────────────────────────────

export function NameCell({
  code,
  name,
  size = 34,
  active = false,
}: {
  code: string;
  name?: string | null;
  size?: number;
  active?: boolean;
}) {
  return (
    <span className="flex items-center gap-2.5 min-w-0">
      <StockLogo code={code} name={name ?? null} size={size} />
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[15px] font-semibold truncate leading-tight ${
            active ? "text-primary" : "text-ink"
          }`}
        >
          {name || code}
        </span>
        <span className="block text-[12px] text-muted font-mono mt-0.5">{code}</span>
      </span>
    </span>
  );
}

export function PriceCell({ price }: { price: number | null | undefined }) {
  if (price == null) return <span className="font-mono text-sm text-muted">—</span>;
  return (
    <span className="font-mono tabular text-[15px] font-semibold text-ink whitespace-nowrap">
      {price.toLocaleString("ko-KR")}
      <span className="text-[11px] text-muted font-normal ml-0.5">원</span>
    </span>
  );
}

export function ChangeRateBadge({ rate }: { rate: number | null | undefined }) {
  if (rate == null) return <span className="font-mono text-sm text-muted px-2 py-1">—</span>;
  const up = rate > 0;
  const flat = rate === 0;
  const tone = flat
    ? "text-muted"
    : up
      ? "bg-trading-up/10 text-trading-up"
      : "bg-trading-down/10 text-trading-down";
  const bg = flat ? { background: "var(--c-bg-muted)" } : {};
  return (
    <span
      className={`font-mono tabular text-[15px] font-bold px-2.5 py-1 rounded-full inline-block ${tone}`}
      style={bg}
    >
      {flat ? "0.00%" : `${up ? "+" : ""}${rate.toFixed(2)}%`}
    </span>
  );
}

export function RankCell({ rank }: { rank: number }) {
  return (
    <span
      className={`text-[15px] font-bold text-center select-none tabular font-mono ${
        rank <= 3 ? "text-primary" : "text-muted"
      }`}
    >
      {rank}
    </span>
  );
}

export function MutedNumber({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[15px] text-muted-strong tabular whitespace-nowrap">
      {children}
    </span>
  );
}
