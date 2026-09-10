/**
 * Phase 2 API client (additive — does not modify the existing api.ts).
 * Uses the new /api/portfolios/{id}/phase2/* routes.
 */

export type Phase2StressTestHoldingImpact = {
  holding_id: string;
  name: string;
  asset_type: string;
  current_value: number;
  scenario_return: number;
  scenario_value: number;
  impact: number;
  confidence: "ACTUAL_NAV" | "ESTIMATED" | "UNAVAILABLE";
  methodology: string;
};

export type Phase2StressTestResult = {
  scenario: string;
  scenario_name: string;
  description: string;
  scenario_window: { start: string; end: string };
  methodology: string;
  data_source: string;
  starting_value: number;
  estimated_loss: number;
  loss_percent: number;
  ending_value: number;
  data_coverage: number;
  missing_assets: string[];
  confidence_summary: { actuals: number; estimates: number; unavailable: number };
  benchmark_return: number | null;
  holdings: Phase2StressTestHoldingImpact[];
  disclaimer: string;
};

export type Phase2StressTestResponse = {
  available_scenarios: Array<{
    id: string;
    name: string;
    description: string;
    window: { start: string; end: string };
  }>;
  result: Phase2StressTestResult;
};

export type Phase2FundSwapComparison = {
  score: number;
  hhi: number;
  average_ter_cost: number;
  top_company_exposure: number;
  potential_duplicate_cost: number;
};

export type Phase2FundSwapResponse = {
  target_holding: string;
  replacement_scheme: string;
  replacement_category?: string | null;
  replacement_ter?: number;
  before: Phase2FundSwapComparison;
  after: Phase2FundSwapComparison;
  delta: Phase2FundSwapComparison;
  error?: string;
  disclaimer: string;
};

export type Phase2ReplacementFund = {
  scheme_code: string;
  scheme_name: string;
  isin: string | null;
  category: string | null;
  amc_name: string | null;
  expense_ratio: number;
};

export type Phase2ReplacementCandidatesResponse = {
  target_holding: {
    id: string;
    name: string;
    isin: string | null;
    asset_type: string;
    current_value: number;
  };
  candidates: Phase2ReplacementFund[];
  error?: string;
};

export type Phase2CorrelationMatrixResponse = {
  available_lookbacks: string[];
  result: {
    lookback: string;
    as_of: string;
    methodology: string;
    funds: string[];
    matrix: number[][];
    pairs: Array<{
      fund_a: string;
      fund_b: string;
      correlation: number;
      classification: string;
    }>;
    thresholds: { high: number; medium: number };
    insufficient_funds: Array<{
      fund_id: string;
      fund_name: string;
      observations: number;
      reason: string | null;
    }>;
    disclaimer: string;
  };
};

type ApiError = { error?: { code?: string; message?: string }; detail?: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isGet = !init?.method || init.method.toUpperCase() === "GET";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let response: Response;
  try {
    response = await fetch(`/api/portfolio${path}`, {
      ...init,
      signal: controller.signal,
      cache: isGet ? "no-store" : init?.cache,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The request timed out. Please retry.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = `/login?reason=session_expired&next=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new Error("Your session has expired. Please sign in again.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(body.error?.message ?? body.detail ?? "Unable to complete the request");
  }
  return response.json() as Promise<T>;
}

export async function getPhase2StressTest(portfolioId: string, scenario: string) {
  return request<Phase2StressTestResponse>(
    `/portfolios/${portfolioId}/phase2/stress-test?scenario=${encodeURIComponent(scenario)}`
  );
}

export async function postPhase2StressTest(portfolioId: string, scenarioId: string) {
  return request<Phase2StressTestResult>(
    `/portfolios/${portfolioId}/phase2/stress-test`,
    {
      method: "POST",
      body: JSON.stringify({ scenario_id: scenarioId }),
    }
  );
}

export async function getPhase2FundSwapCandidates(portfolioId: string, targetHoldingId: string) {
  return request<Phase2ReplacementCandidatesResponse>(
    `/portfolios/${portfolioId}/phase2/fund-swap/candidates?target_holding_id=${encodeURIComponent(targetHoldingId)}`
  );
}

export async function postPhase2FundSwap(
  portfolioId: string,
  targetHoldingId: string,
  replacementSchemeCode: string
) {
  return request<Phase2FundSwapResponse>(
    `/portfolios/${portfolioId}/phase2/fund-swap`,
    {
      method: "POST",
      body: JSON.stringify({
        target_holding_id: targetHoldingId,
        replacement_scheme_code: replacementSchemeCode,
      }),
    }
  );
}

export async function getPhase2Correlation(portfolioId: string, lookback: "3M" | "6M" | "1Y" | "3Y") {
  return request<Phase2CorrelationMatrixResponse>(
    `/portfolios/${portfolioId}/phase2/correlation?lookback=${lookback}`
  );
}

// ============================================================
// Feature 4: Peer Baseline Benchmarking
// ============================================================

export type Phase2BenchmarkMetadata = {
  id: string;
  name: string;
  description: string;
  sample_size: string;
  methodology: string;
  as_of_date: string;
};

export type Phase2AssetAllocationComparison = {
  portfolio_equity: number;
  benchmark_equity: number;
  portfolio_debt: number;
  benchmark_debt: number;
  portfolio_cash: number;
  benchmark_cash: number;
};

export type Phase2BenchmarkResponse = {
  portfolio_hhi: number;
  reference_hhi: number;
  relative_position: string;
  largest_company_exposure: number;
  reference_largest_company: number;
  equity_concentration: number;
  reference_equity_concentration: number;
  holdings_count: number;
  reference_holdings_count: number;
  coverage_source: string;
  benchmark_id: string;
  benchmark_name: string;
  methodology: string;
  sample_size: string;
  as_of_date: string;
  asset_allocation?: Phase2AssetAllocationComparison;
  diversification_assessment: string;
  available_benchmarks: Phase2BenchmarkMetadata[];
  disclaimer: string;
};

export async function getPhase2Benchmark(portfolioId: string, benchmarkId = "RETAIL_BASELINE") {
  return request<Phase2BenchmarkResponse>(
    `/portfolios/${portfolioId}/phase2/benchmark?benchmark_id=${encodeURIComponent(benchmarkId)}`
  );
}

// ============================================================
// Feature 5: Parent Conglomerate & Group Exposure Alert
// ============================================================

export type Phase2GroupCompanyItem = {
  company_name: string;
  isin?: string | null;
  ticker?: string | null;
  direct_value: number;
  direct_percent: number;
  indirect_value: number;
  indirect_percent: number;
  total_value: number;
  total_percent: number;
};

export type Phase2GroupExposureItem = {
  group_name: string;
  exposure_value: number;
  exposure_percentage: number;
  alert_level: "LOW" | "MODERATE" | "HIGH";
  description?: string | null;
  companies_count: number;
  companies: Phase2GroupCompanyItem[];
};

export type Phase2GroupExposureResponse = {
  groups: Phase2GroupExposureItem[];
  unmapped_percentage: number;
  total_value: number;
  thresholds: { moderate: number; high: number };
  high_exposure_groups_count: number;
  moderate_exposure_groups_count: number;
  disclaimer: string;
};

export async function getPhase2GroupExposure(
  portfolioId: string,
  thresholdModerate = 15.0,
  thresholdHigh = 25.0
) {
  return request<Phase2GroupExposureResponse>(
    `/portfolios/${portfolioId}/phase2/group-exposure?threshold_moderate=${thresholdModerate}&threshold_high=${thresholdHigh}`
  );
}

// ============================================================
// Feature 6: Smart SIP Health Check & Auto-Switch
// ============================================================

export type Phase2SIPFactor = {
  name: string;
  impact: number;
  category: string;
};

export type Phase2SIPAlternativeCandidate = {
  scheme_code: string;
  scheme_name: string;
  isin?: string | null;
  category: string;
  amc_name?: string | null;
  expense_ratio: number;
  expense_ratio_diff: number;
  estimated_annual_savings: number;
  consistency_score: number;
};

export type Phase2SIPHealthItem = {
  holding_id: string;
  fund_name: string;
  monthly_amount: number;
  score: number;
  rating: string;
  grade: "A" | "B" | "C" | "D";
  status: "ACTIVE" | "PAUSED" | "STOPPED" | "UNKNOWN";
  tenure_months: number;
  category?: string | null;
  expense_ratio: number;
  returns_1y?: number | null;
  returns_3y?: number | null;
  returns_5y?: number | null;
  returns_coverage: "FULL" | "PARTIAL" | "INSUFFICIENT_DATA";
  overlap_score: number;
  factors: Phase2SIPFactor[];
  candidate_alternatives: Phase2SIPAlternativeCandidate[];
};

export type Phase2SIPHealthResponse = {
  overall_score: number;
  overall_rating: string;
  overall_grade: string;
  sips: Phase2SIPHealthItem[];
  summary_factors: Phase2SIPFactor[];
  active_sips_count: number;
  paused_sips_count: number;
  stopped_sips_count: number;
  total_monthly_commitment: number;
  disclaimer: string;
};

export type Phase2SIPSwitchSimulationResponse = {
  target_fund_name: string;
  replacement_fund_name: string;
  current_expense_ratio: number;
  replacement_expense_ratio: number;
  ter_savings_percent: number;
  estimated_annual_savings: number;
  projected_5y_savings: number;
  overlap_reduction_percent: number;
  score_before: number;
  score_after: number;
  grade_before: string;
  grade_after: string;
  disclaimer: string;
};

export async function getPhase2SIPHealth(portfolioId: string) {
  return request<Phase2SIPHealthResponse>(
    `/portfolios/${portfolioId}/phase2/sip-health`
  );
}

export async function postPhase2SIPSwitchSimulation(
  portfolioId: string,
  targetHoldingId: string,
  replacementSchemeCode: string
) {
  return request<Phase2SIPSwitchSimulationResponse>(
    `/portfolios/${portfolioId}/phase2/sip-health/simulate-switch`,
    {
      method: "POST",
      body: JSON.stringify({
        target_holding_id: targetHoldingId,
        replacement_scheme_code: replacementSchemeCode,
      }),
    }
  );
}
