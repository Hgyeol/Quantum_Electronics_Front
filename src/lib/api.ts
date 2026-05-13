// Typed client for the Quantum Electronics FastAPI backend.
// Mirrors the OutlookReport pydantic model in analysis/models.py.

export type Direction = "positive" | "negative" | "neutral";

export interface QuantSignal {
  label: string;
  direction: Direction;
  score: number;
  value: number | null;
  api_used: string;
}

export interface AISignal {
  label: string;
  direction: Direction;
  score: number;
  summary: string;
  evidence_ids: string[];
  confidence: number;
}

export interface FinancialSignal {
  label: string;
  metric: string;
  value: number | null;
  direction: Direction;
  score: number;
  period?: string | null;
  reason?: string | null;
  evidence_ids?: string[];
}

export interface ScoreBreakdown {
  quant_score: number;
  ai_score: number;
  financial_score: number;
  total_score: number;
  direction: Direction;
}

export interface Evidence {
  evidence_id: string;
  kind: "news" | "disclosure" | "financial" | "market" | "quant";
  source: string;
  title: string;
  published_at?: string | null;
  url?: string | null;
  content?: string | null;
  metadata?: Record<string, unknown>;
}

export interface MLFeatureContribution {
  feature: string;
  value: number;
  contribution: number;
  direction: "increase" | "decrease";
}

export interface MLPrediction {
  target: string;
  probability: number;
  model: string;
  features_version: string;
  rule_score: number;
  rule_direction: Direction;
  explanation: string;
  top_contributions: MLFeatureContribution[];
}

export interface PositionContext {
  avg_price: number;
  quantity: number;
  held_since?: string | null;
  current_price: number;
  holding_days?: number | null;
  unrealized_pnl_amount: number;
  unrealized_pnl_pct: number;
  breakeven_required_pct: number;
  distance_to_52w_low_pct: number | null;
  distance_to_52w_high_pct: number | null;
  disclaimer: string;
}

export interface AnalysisError {
  source: string;
  code: string;
  message: string;
  recoverable: boolean;
}

export interface OutlookReport {
  stock_code: string;
  stock_name: string | null;
  generated_at: string;
  summary: string | null;
  score: ScoreBreakdown;
  quant_signals: QuantSignal[];
  ai_signals: AISignal[];
  financial_signals: FinancialSignal[];
  ml_prediction?: MLPrediction | null;
  position_context?: PositionContext | null;
  evidence: Evidence[];
  errors: AnalysisError[];
}

export interface OutlookQueryInput {
  code: string;
  avg_price?: number;
  quantity?: number;
  held_since?: string; // ISO date YYYY-MM-DD
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function fetchOutlook({
  code,
  avg_price,
  quantity,
  held_since,
}: OutlookQueryInput): Promise<OutlookReport> {
  const params = new URLSearchParams();
  if (avg_price !== undefined && avg_price > 0) {
    params.set("avg_price", String(avg_price));
  }
  if (quantity !== undefined && quantity > 0) {
    params.set("quantity", String(quantity));
  }
  if (held_since) {
    params.set("held_since", held_since);
  }

  const qs = params.toString();
  const url = `${API_BASE}/outlook/stock/${encodeURIComponent(code)}${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.detail) detail = String(payload.detail);
    } catch {
      // ignore JSON parse error
    }
    throw new Error(detail);
  }
  return (await response.json()) as OutlookReport;
}
