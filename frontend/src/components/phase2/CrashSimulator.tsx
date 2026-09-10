"use client";

/**
 * Historical Crash Stress Tester (real backend).
 * - Fetches /api/portfolios/{id}/phase2/stress-test
 * - Holding-level breakdown, confidence labels (ACTUAL_NAV / ESTIMATED / UNAVAILABLE)
 * - Never fabricates data
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  History,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  getPhase2StressTest,
  Phase2StressTestHoldingImpact,
  Phase2StressTestResult,
} from "@/lib/phase2-api";
import { usePortfolioStore } from "@/store/portfolioStore";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function confidenceColor(c: string) {
  if (c === "ACTUAL_NAV") return "text-emerald-600 dark:text-emerald-400";
  if (c === "ESTIMATED") return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function confidenceLabel(c: string) {
  if (c === "ACTUAL_NAV") return "Historical data";
  if (c === "ESTIMATED") return "Estimated (proxy)";
  return "Unavailable";
}

export function CrashSimulator() {
  const { holdings, whatIfHoldings, activePortfolioId, loadActivePortfolio } = usePortfolioStore();

  const [portfolioId, setPortfolioId] = useState<string | null>(activePortfolioId);

  useEffect(() => {
    if (activePortfolioId) {
      setPortfolioId(activePortfolioId);
      return;
    }
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("nivesh_active_portfolio_id");
      if (stored) {
        setPortfolioId(stored);
        return;
      }
    }
    void loadActivePortfolio().then((id) => {
      if (id) setPortfolioId(id);
    });
  }, [activePortfolioId, loadActivePortfolio]);

  const [scenarios, setScenarios] = useState<
    Array<{ id: string; name: string; description: string }>
  >([]);
  const [selectedScenario, setSelectedScenario] = useState<string>("COVID_2020");
  const [result, setResult] = useState<Phase2StressTestResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalValue = useMemo(
    () =>
      holdings.reduce(
        (sum, h) => sum + (Number((h as any).currentValue) || 0),
        0
      ),
    [holdings]
  );

  const load = useCallback(async () => {
    let targetId = portfolioId || activePortfolioId;
    if (!targetId) {
      targetId = await loadActivePortfolio();
      if (targetId) setPortfolioId(targetId);
    }
    if (!targetId) {
      setIsLoading(false);
      setErrorMessage(
        "No active portfolio. Upload a CAS statement to enable stress testing."
      );
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getPhase2StressTest(targetId, selectedScenario);
      setScenarios(res.available_scenarios);
      setResult(res.result);
    } catch (e: unknown) {
      setErrorMessage(
        e instanceof Error ? e.message : "Unable to load stress test data."
      );
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, activePortfolioId, selectedScenario, loadActivePortfolio]);

  useEffect(() => {
    void load();
  }, [load]);

  // Refetch when portfolio holdings are refreshed
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => void load();
    window.addEventListener("nivesh_portfolio_updated", handler);
    return () => window.removeEventListener("nivesh_portfolio_updated", handler);
  }, [load]);

  // No portfolio yet
  if (!isLoading && !errorMessage && totalValue === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center font-bold">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Historical Crash Stress-Tester</h3>
            <p className="text-xs text-muted-foreground">
              Connect a portfolio to see how it would have fared in past market
              crashes.
            </p>
          </div>
        </div>
        <div className="mt-6 p-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-foreground">No portfolio connected</p>
          <p className="text-xs mt-1">
            Upload a CAS statement to enable stress testing.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="h-6 w-56 animate-pulse rounded bg-muted mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-500">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-semibold text-foreground">
              Stress test unavailable
            </h3>
          </div>
          <button
            onClick={() => void load()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
      </div>
    );
  }

  if (!result) return null;

  // Sort holdings by absolute impact for the breakdown
  const sortedHoldings: Phase2StressTestHoldingImpact[] = [...result.holdings].sort(
    (a, b) => Math.abs(b.impact) - Math.abs(a.impact)
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center font-bold">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Historical Crash Stress-Tester</h3>
            <p className="text-xs text-muted-foreground">
              How would your current portfolio have fared in past market crashes?
            </p>
          </div>
        </div>
      </div>

      {/* Scenario selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-5">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedScenario(s.id)}
            className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
              selectedScenario === s.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/60"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Portfolio impact summary */}
      <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-accent/30">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">
            Current value
          </p>
          <p className="font-mono text-lg font-semibold mt-1">
            {formatINR(result.starting_value)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
          <p className="text-[10px] uppercase font-bold text-rose-500">
            Estimated loss
          </p>
          <p className="font-mono text-lg font-semibold text-rose-500 mt-1">
            -{formatINR(result.estimated_loss)}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {result.loss_percent.toFixed(2)}% of portfolio
          </p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-accent/30">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">
            Estimated remaining
          </p>
          <p className="font-mono text-lg font-semibold mt-1">
            {formatINR(result.ending_value)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-accent/30">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">
            Data coverage
          </p>
          <p className="font-mono text-lg font-semibold mt-1">
            {(result.data_coverage * 100).toFixed(0)}%
          </p>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {result.confidence_summary.actuals} actual ·{" "}
            {result.confidence_summary.estimates} est.
          </p>
        </div>
      </div>

      {/* Description + scenario window */}
      <div className="mt-5 p-4 rounded-xl border border-border bg-accent/20 text-xs space-y-2">
        <p className="font-semibold text-foreground">{result.scenario_name}</p>
        <p className="text-muted-foreground leading-relaxed">
          {result.description}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Scenario window: {result.scenario_window.start} →{" "}
          {result.scenario_window.end}
        </p>
      </div>

      {/* Holding breakdown */}
      <div className="mt-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Where would the loss come from?
        </h4>
        <div className="space-y-2">
          {sortedHoldings.map((h) => (
            <div
              key={h.holding_id}
              className="p-3 rounded-xl border border-border bg-card hover:border-border/80 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold truncate">{h.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground border border-border">
                      {h.asset_type}
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${confidenceColor(
                        h.confidence
                      )}`}
                    >
                      · {confidenceLabel(h.confidence)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Exposure: {formatINR(h.current_value)} · Scenario return:{" "}
                    {(h.scenario_return * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`font-mono font-semibold ${
                      h.impact < 0 ? "text-rose-500" : "text-emerald-500"
                    }`}
                  >
                    {h.impact < 0 ? "-" : "+"}
                    {formatINR(Math.abs(h.impact))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {h.impact < 0 ? (
                      <TrendingDown className="w-3 h-3 inline" />
                    ) : (
                      <TrendingUp className="w-3 h-3 inline" />
                    )}
                  </p>
                </div>
              </div>
              {h.methodology && h.confidence !== "ACTUAL_NAV" && (
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                  {h.methodology}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Missing data warning */}
      {result.missing_assets.length > 0 && (
        <div className="mt-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Insufficient data for:</p>
            <p className="mt-0.5">{result.missing_assets.join(", ")}</p>
            <p className="mt-1 text-[10px]">
              These holdings were excluded from the simulation.
            </p>
          </div>
        </div>
      )}

      {/* Methodology + disclaimer */}
      <details className="mt-4 group">
        <summary className="text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground">
          How is this calculated?
        </summary>
        <div className="mt-2 p-3 rounded-xl border border-border bg-accent/20 text-[11px] text-muted-foreground space-y-1.5">
          <p>
            <strong>Methodology:</strong> {result.methodology}
          </p>
          <p>
            <strong>Data source:</strong> {result.data_source}
          </p>
          <p className="italic">
            {result.disclaimer}
          </p>
        </div>
      </details>
    </div>
  );
}

export default CrashSimulator;
