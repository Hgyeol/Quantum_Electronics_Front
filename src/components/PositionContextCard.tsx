import type { PositionContext } from "@/lib/api";
import { formatKRW, formatPct } from "@/lib/format";

interface Props {
  ctx: PositionContext;
}

function Row({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-hairline-on-dark py-3 last:border-b-0">
      <span className="text-sm text-muted">{label}</span>
      <span className={`font-mono tabular text-base ${className}`}>{value}</span>
    </div>
  );
}

export default function PositionContextCard({ ctx }: Props) {
  const pnlColor =
    ctx.unrealized_pnl_amount > 0
      ? "text-trading-up"
      : ctx.unrealized_pnl_amount < 0
        ? "text-trading-down"
        : "text-on-dark";

  return (
    <section className="rounded-2xl bg-white border border-[var(--c-border)] p-6">
      <header className="flex items-baseline justify-between mb-4">
        <h2 className="text-[15px] font-bold text-ink">보유 현황</h2>
        <span className="text-xs text-muted-strong">
          {ctx.quantity.toLocaleString()}주 @ {formatKRW(ctx.avg_price)}
        </span>
      </header>

      <Row
        label="현재가"
        value={formatKRW(ctx.current_price)}
        className="text-on-dark"
      />
      <Row
        label="평가손익"
        value={`${ctx.unrealized_pnl_amount >= 0 ? "+" : ""}${formatKRW(ctx.unrealized_pnl_amount)}`}
        className={pnlColor}
      />
      <Row
        label="수익률"
        value={formatPct(ctx.unrealized_pnl_pct)}
        className={pnlColor}
      />
      <Row
        label="본전 회복까지"
        value={
          ctx.breakeven_required_pct === 0
            ? "이미 본전 이상"
            : formatPct(ctx.breakeven_required_pct)
        }
        className={ctx.breakeven_required_pct === 0 ? "text-trading-up" : "text-on-dark"}
      />
      {ctx.distance_to_52w_low_pct !== null && (
        <Row
          label="52주 저점까지"
          value={formatPct(-ctx.distance_to_52w_low_pct)}
          className="text-muted-strong"
        />
      )}
      {ctx.distance_to_52w_high_pct !== null && (
        <Row
          label="52주 고점까지"
          value={formatPct(ctx.distance_to_52w_high_pct)}
          className="text-muted-strong"
        />
      )}
      {ctx.holding_days !== null && ctx.holding_days !== undefined && (
        <Row
          label="보유 일수"
          value={`${ctx.holding_days.toLocaleString()}일`}
          className="text-muted-strong"
        />
      )}

      <p className="text-xs text-muted mt-4 leading-relaxed">{ctx.disclaimer}</p>
    </section>
  );
}
