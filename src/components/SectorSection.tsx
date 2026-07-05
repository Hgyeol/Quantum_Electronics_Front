"use client";

import { useEffect, useRef, useState } from "react";
import {
  Cpu, Pill, FlaskConical, Monitor, Landmark, Coins,
  HardHat, Ship, Car, Utensils, Microscope, ShoppingCart,
  Cog, Wrench, Shield, TrendingUp, Building2, Radio,
  Clapperboard, Briefcase, Shirt, Mountain, Home,
  TreePine, Zap, Wheat, Factory, BookOpen,
} from "lucide-react";
import { StockList, COLS, NameCell, PriceCell, ChangeRateBadge } from "@/components/StockList";
import { useAutoStockHover } from "@/lib/useAutoStockHover";

const API_BASE = "/api";

interface Sector { sector: string; stock_count: number }
interface Pick { stock_code: string; name: string; market: string; close: number; change_rate: number; score: number }
interface HoverPayload { code: string; name: string; price: number; changeRate: number }
interface Props {
  onSelect: (code: string, name: string) => void;
  onHover?: (stock: HoverPayload) => void;
  onHoverEnd?: () => void;
}

type LucideIcon = React.ComponentType<{ size?: number; strokeWidth?: number; color?: string; className?: string }>;

interface SectorMeta { Icon: LucideIcon; color: string }

const SECTOR_META: Record<string, SectorMeta> = {
  "전기·전자":          { Icon: Cpu,          color: "#3B82F6" },
  "제약":               { Icon: Pill,          color: "#8B5CF6" },
  "화학":               { Icon: FlaskConical,  color: "#10B981" },
  "IT 서비스":          { Icon: Monitor,       color: "#6366F1" },
  "금융":               { Icon: Landmark,      color: "#F59E0B" },
  "기타금융":           { Icon: Coins,         color: "#F97316" },
  "건설":               { Icon: HardHat,       color: "#78716C" },
  "운송·창고":          { Icon: Ship,          color: "#0EA5E9" },
  "운송장비·부품":      { Icon: Car,           color: "#64748B" },
  "음식료·담배":        { Icon: Utensils,      color: "#EF4444" },
  "의료·정밀기기":      { Icon: Microscope,    color: "#EC4899" },
  "유통":               { Icon: ShoppingCart,  color: "#14B8A6" },
  "기계·장비":          { Icon: Cog,           color: "#6B7280" },
  "금속":               { Icon: Wrench,        color: "#9CA3AF" },
  "보험":               { Icon: Shield,        color: "#2563EB" },
  "증권":               { Icon: TrendingUp,    color: "#16A34A" },
  "은행":               { Icon: Landmark,      color: "#1D4ED8" },
  "통신":               { Icon: Radio,         color: "#7C3AED" },
  "오락·문화":          { Icon: Clapperboard,  color: "#DB2777" },
  "일반서비스":         { Icon: Briefcase,     color: "#475569" },
  "섬유·의류":          { Icon: Shirt,         color: "#F43F5E" },
  "비금속":             { Icon: Mountain,      color: "#A16207" },
  "부동산":             { Icon: Home,          color: "#059669" },
  "종이·목재":          { Icon: TreePine,      color: "#15803D" },
  "전기·가스":          { Icon: Zap,           color: "#CA8A04" },
  "전기·가스·수도":     { Icon: Zap,           color: "#CA8A04" },
  "농업, 임업 및 어업": { Icon: Wheat,         color: "#65A30D" },
  "기타제조":           { Icon: Factory,       color: "#71717A" },
  "출판·매체복제":      { Icon: BookOpen,      color: "#7C3AED" },
  "기타":               { Icon: Building2,     color: "#6B7280" },
};

interface SectorGroup { label: string; keys: string[] }

const SECTOR_GROUPS: SectorGroup[] = [
  { label: "IT·전자", keys: ["전기·전자", "IT 서비스", "통신", "오락·문화", "출판·매체복제"] },
  { label: "제조업",  keys: ["화학", "기계·장비", "금속", "비금속", "종이·목재", "기타제조", "운송장비·부품", "섬유·의류"] },
  { label: "바이오",  keys: ["제약", "의료·정밀기기"] },
  { label: "금융",    keys: ["금융", "기타금융", "보험", "증권", "은행"] },
  { label: "소비재",  keys: ["음식료·담배", "유통", "일반서비스"] },
  { label: "인프라",  keys: ["건설", "부동산", "운송·창고", "전기·가스", "전기·가스·수도", "농업, 임업 및 어업"] },
];

const RANK_META = [
  { label: "1위", bg: "#F59E0B", text: "#fff" },
  { label: "2위", bg: "#94A3B8", text: "#fff" },
  { label: "3위", bg: "#C07940", text: "#fff" },
];

export default function SectorSection({ onSelect, onHover, onHoverEnd }: Props) {
  const [allSectors, setAllSectors] = useState<Sector[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [loadingPicks, setLoadingPicks] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const autoHover = useAutoStockHover({
    items: picks,
    getKey: (p) => p.stock_code,
    toHoverPayload: (p) => ({ code: p.stock_code, name: p.name, price: p.close, changeRate: p.change_rate }),
    onHover,
    onHoverEnd,
    resetKey: picks.map((p) => p.stock_code).join(","),
    enabled: picks.length > 0 && !loadingPicks,
  });

  useEffect(() => {
    fetch(`${API_BASE}/sectors`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data) && data.length > 0) setAllSectors(data); })
      .catch(() => {})
      .finally(() => setLoadingSectors(false));
  }, []);

  const allKeys = SECTOR_GROUPS.flatMap((g) => g.keys);
  const sectorSet = allSectors.length > 0
    ? new Set(allSectors.map((s) => s.sector))
    : new Set(allKeys);

  function handleSelect(sector: string) {
    if (selected === sector) { setSelected(null); setPicks([]); return; }
    setSelected(sector);
    setLoadingPicks(true);
    fetch(`${API_BASE}/sectors/${encodeURIComponent(sector)}/picks`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setPicks(data);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
      })
      .catch(() => setPicks([]))
      .finally(() => setLoadingPicks(false));
  }

  const countMap = Object.fromEntries(allSectors.map((s) => [s.sector, s.stock_count]));

  return (
    <section className="bg-surface-card-dark border border-[var(--c-border)]">
      {/* 헤더 */}
      <header className="px-6 pt-4 pb-4 border-b border-hairline-on-dark">
        <div className="mb-4">
          <p className="text-[11px] text-muted">업종을 선택하면 모멘텀 상위 3종목을 보여드려요.</p>
        </div>

        {/* 업종 칩 그룹 */}
        {loadingSectors ? (
          <div className="space-y-3">
            {[3, 5, 2, 4].map((n, gi) => (
              <div key={gi}>
                <div className="h-3 w-12 rounded mb-1.5 animate-pulse" style={{ background: "var(--c-border)" }} />
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: n }).map((_, i) => (
                    <div key={i} className="h-7 w-20 rounded-full animate-pulse" style={{ background: "var(--c-border)" }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {SECTOR_GROUPS.map((group) => {
              const items = group.keys.filter((k) => sectorSet.has(k));
              if (items.length === 0) return null;
              const selectedInGroup = items.filter((k) => k === selected).length;
              return (
                <div key={group.label}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] uppercase tracking-widest text-muted font-semibold">
                      {group.label}
                    </span>
                    {selectedInGroup > 0 && (
                      <span className="text-[10px] font-mono tabular text-primary font-bold">●</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((key) => {
                      const m = SECTOR_META[key] ?? SECTOR_META["기타"];
                      const { Icon } = m;
                      const isActive = selected === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleSelect(key)}
                          className={`inline-flex items-center gap-1.5 h-7 pl-2 pr-3 rounded-full border text-[12px] font-semibold transition-colors cursor-pointer ${
                            isActive
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-hairline-on-dark text-muted-strong hover:border-primary/40 hover:text-body"
                          }`}
                        >
                          <Icon size={12} strokeWidth={2} color={isActive ? "var(--c-primary)" : m.color} />
                          {key}
                          {countMap[key] != null && (
                            <span className={`text-[10px] font-mono ${isActive ? "text-primary/70" : "text-muted"}`}>
                              {countMap[key]}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </header>

      {/* 결과 */}
      <div ref={resultRef}>
        {selected && (
          <>
            <div
              className="px-6 py-2.5 flex items-center gap-2"
              style={{ borderBottom: "1px solid var(--c-border)" }}
            >
              {(() => {
                const m = SECTOR_META[selected] ?? SECTOR_META["기타"];
                const { Icon } = m;
                return (
                  <>
                    <Icon size={13} strokeWidth={2} color={m.color} />
                    <span className="text-[13px] font-bold text-ink">{selected}</span>
                    <span className="text-[11px] text-muted">모멘텀 top 3</span>
                  </>
                );
              })()}
            </div>

            {loadingPicks ? (
              <ul>
                {[0, 1, 2].map((i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 px-5 py-3.5 animate-pulse"
                    style={{ borderTop: i > 0 ? "1px solid var(--c-border)" : undefined }}
                  >
                    <div className="w-8 h-8 rounded-full shrink-0" style={{ background: "var(--c-border)" }} />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 rounded" style={{ background: "var(--c-border)" }} />
                      <div className="h-2.5 w-16 rounded" style={{ background: "var(--c-border)" }} />
                    </div>
                    <div className="h-3 w-16 rounded" style={{ background: "var(--c-border)" }} />
                  </li>
                ))}
              </ul>
            ) : picks.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted">
                데이터가 충분한 종목이 없습니다.
              </div>
            ) : (
              <StockList
                items={picks}
                getKey={(p) => p.stock_code}
                onSelect={(p) => onSelect(p.stock_code, p.name)}
                hoveredKey={autoHover.hoveredKey}
                onRowHover={autoHover.handleRowHover}
                columns={[
                  {
                    key: "rank", width: "2rem", align: "center",
                    render: (_, idx) => {
                      const rm = RANK_META[idx] ?? RANK_META[2];
                      return (
                        <span
                          className="inline-flex items-center justify-center w-6 h-5 rounded-full text-[10px] font-extrabold"
                          style={{ background: rm.bg, color: rm.text }}
                        >
                          {idx + 1}
                        </span>
                      );
                    },
                  },
                  { ...COLS.name,   render: (p) => <NameCell code={p.stock_code} name={p.name} /> },
                  { ...COLS.price,  render: (p) => <PriceCell price={p.close} /> },
                  { ...COLS.change, render: (p) => <ChangeRateBadge rate={p.change_rate} /> },
                ]}
              />
            )}
          </>
        )}

        {!selected && !loadingSectors && (
          <div className="px-6 py-8 text-center text-[12px] text-muted">
            위에서 업종을 선택하면 추천 종목이 나타납니다.
          </div>
        )}
      </div>
    </section>
  );
}
