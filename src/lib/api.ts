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

export interface MarketQuote {
  price: number;
  change: number;
  change_rate: number;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
  w52_high?: number | null;
  w52_low?: number | null;
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
  market_quote?: MarketQuote | null;
  evidence: Evidence[];
  errors: AnalysisError[];
}

export interface OutlookQueryInput {
  code: string;
  avg_price?: number;
  quantity?: number;
  held_since?: string; // ISO date YYYY-MM-DD
}

export interface IndicatorParameter {
  name: string;
  default: string | number | boolean | null;
  required: boolean;
}

export interface IndicatorDefinition {
  id: string;
  label: string;
  function_name: string;
  category: string;
  parameters: IndicatorParameter[];
  uses_benchmark: boolean;
}

export interface IndicatorPoint {
  date: string;
  value: number | string | null;
}

export interface IndicatorValue {
  id: string;
  label: string;
  category: string;
  value: number | string | null;
  series: IndicatorPoint[];
  parameters: Record<string, string | number | boolean | null>;
  uses_default_benchmark: boolean;
  error?: string | null;
}

export interface IndicatorCatalogResponse {
  indicators: IndicatorDefinition[];
}

export interface IndicatorCalculationResponse {
  stock_code: string;
  days: number;
  indicators: IndicatorValue[];
  errors: AnalysisError[];
}

// ── Chart Analysis ──────────────────────────────────────────────────────────

export interface OHLCVBar {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SupportResistanceLevel {
  price: number;
  level_type: "support" | "resistance";
  strength: "weak" | "medium" | "strong";
  touch_count: number;
  last_tested_date: string | null;
  source?: string;
}

export interface TechnicalIndicators {
  rsi: number | null;
  rsi_zone: "oversold" | "neutral" | "overbought";
  macd: number | null;
  macd_signal: number | null;
  macd_histogram: number | null;
  macd_crossover: "bullish" | "bearish" | "none";
  bb_upper: number | null;
  bb_middle: number | null;
  bb_lower: number | null;
  bb_position: "above_upper" | "near_upper" | "middle" | "near_lower" | "below_lower";
  stoch_k: number | null;
  stoch_d: number | null;
  stoch_zone: "oversold" | "neutral" | "overbought";
}

export interface EntryExitSignal {
  action: "buy" | "hold" | "sell";
  confidence: "low" | "medium" | "high";
  entry_zone_low: number | null;
  entry_zone_high: number | null;
  primary_target: number | null;
  secondary_target: number | null;
  stop_loss: number | null;
  risk_reward_ratio: number | null;
  reasoning: string[];
}

export interface ChartAnalysis {
  stock_code: string;
  stock_name: string | null;
  generated_at: string;
  current_price: number;
  analysis_period_days: number;
  ohlcv: OHLCVBar[];
  support_levels: SupportResistanceLevel[];
  resistance_levels: SupportResistanceLevel[];
  indicators: TechnicalIndicators;
  signal: EntryExitSignal;
  disclaimer: string;
}

// ── Watchlist ────────────────────────────────────────────────────────────────

export interface WatchlistItem {
  stock_code: string;
  stock_name: string | null;
  price: number;
  change: number;
  change_rate: number;
  volume: number;
  trade_value: number; // 누적 거래대금 (원, ACML_TR_PBMN)
}

// ── API Base ─────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const FETCH_OPTS: RequestInit = { cache: "no-store", credentials: "include" };

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.detail) detail = String(payload.detail);
    } catch { /* ignore */ }
    throw new Error(detail);
  }
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include", cache: "no-store" });
}

export async function checkAuth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, { credentials: "include", cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

// ── Watchlist (server-side) ───────────────────────────────────────────────────

export async function fetchMyWatchlist(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/me/watchlist`, FETCH_OPTS);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as string[];
}

export async function saveMyWatchlist(codes: string[]): Promise<void> {
  await fetch(`${API_BASE}/me/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codes }),
    credentials: "include",
    cache: "no-store",
  });
}

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

  const response = await fetch(url, FETCH_OPTS);
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

export async function fetchMarketQuote(code: string): Promise<MarketQuote> {
  const response = await fetch(`${API_BASE}/quote/${encodeURIComponent(code)}`, FETCH_OPTS);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as MarketQuote;
}

export async function fetchChartAnalysis(code: string, days = 365): Promise<ChartAnalysis> {
  const url = `${API_BASE}/chart/${encodeURIComponent(code)}?days=${days}`;
  const response = await fetch(url, FETCH_OPTS);
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.detail) detail = String(payload.detail);
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return (await response.json()) as ChartAnalysis;
}

// ── Ranking ──────────────────────────────────────────────────────────────────

export interface RankItem {
  rank: number;
  stock_code: string;
  stock_name: string;
  price: number;
  change: number;
  change_rate: number;
  volume: number;
  trade_value: number;
  extra_value: number;
}

export type RankSort = "volume" | "amount";
export type RankInvestor = "foreign" | "institution";

export async function fetchFluctuationRanking(limit = 30): Promise<RankItem[]> {
  const response = await fetch(`${API_BASE}/ranking/fluctuation?limit=${limit}`, FETCH_OPTS);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as RankItem[];
}

export async function fetchVolumeRanking(sort: RankSort, limit = 20): Promise<RankItem[]> {
  const response = await fetch(`${API_BASE}/ranking/volume?sort=${sort}&limit=${limit}`, FETCH_OPTS);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as RankItem[];
}

export async function fetchForeignRanking(investor: RankInvestor, limit = 20): Promise<RankItem[]> {
  const response = await fetch(`${API_BASE}/ranking/foreign?investor=${investor}&limit=${limit}`, FETCH_OPTS);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as RankItem[];
}

export interface StockSearchResult {
  stock_code: string;
  corp_name: string;
}

export async function searchStocks(q: string): Promise<StockSearchResult[]> {
  const url = `${API_BASE}/search?q=${encodeURIComponent(q)}`;
  const response = await fetch(url, FETCH_OPTS);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as StockSearchResult[];
}

export async function fetchWatchlist(codes: string[]): Promise<WatchlistItem[]> {
  if (codes.length === 0) return [];
  const url = `${API_BASE}/watchlist?codes=${codes.join(",")}`;
  const response = await fetch(url, FETCH_OPTS);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as WatchlistItem[];
}

export async function fetchIndicatorCatalog(): Promise<IndicatorDefinition[]> {
  const response = await fetch(`${API_BASE}/technical/indicators`, FETCH_OPTS);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const payload = (await response.json()) as IndicatorCatalogResponse;
  return payload.indicators;
}

export async function fetchTechnicalIndicators({
  code,
  ids,
  days = 260,
}: {
  code: string;
  ids?: string[];
  days?: number;
}): Promise<IndicatorCalculationResponse> {
  const params = new URLSearchParams();
  params.set("days", String(days));
  if (ids && ids.length > 0) {
    params.set("ids", ids.join(","));
  }

  const response = await fetch(
    `${API_BASE}/technical/indicators/${encodeURIComponent(code)}?${params.toString()}`,
    FETCH_OPTS,
  );
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as IndicatorCalculationResponse;
}

// ── Screener ─────────────────────────────────────────────────────────────────

export type ScreenerCondition = "volume_surge" | "golden_cross" | "frgn_buy" | "orgn_buy" | "price_surge";

export interface ScreenerResultItem {
  stock_code: string;
  stock_name: string;
  close: number;
  volume: number;
  matched_conditions: string[];
}

export interface ScreenerStatus {
  last_collected: string | null;
}

export interface ScreenerParams {
  conditions: ScreenerCondition[];
  volumeThreshold?: number;
  consecutiveDays?: number;
  priceSurgeThreshold?: number;
}

export async function fetchScreener({
  conditions,
  volumeThreshold = 2.0,
  consecutiveDays = 3,
  priceSurgeThreshold = 5.0,
}: ScreenerParams): Promise<ScreenerResultItem[]> {
  const params = new URLSearchParams({
    conditions: conditions.join(","),
    volume_threshold: String(volumeThreshold),
    consecutive_days: String(consecutiveDays),
    price_surge_threshold: String(priceSurgeThreshold),
  });
  const response = await fetch(`${API_BASE}/screener?${params.toString()}`, FETCH_OPTS);
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.detail) detail = String(payload.detail);
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return (await response.json()) as ScreenerResultItem[];
}

export async function fetchScreenerStatus(): Promise<ScreenerStatus> {
  const response = await fetch(`${API_BASE}/screener/status`, FETCH_OPTS);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as ScreenerStatus;
}
