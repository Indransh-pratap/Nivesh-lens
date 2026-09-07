"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  HelpCircle,
  Info,
  Layers,
  PieChart,
  RefreshCw,
  Scale,
  ShieldAlert,
} from "lucide-react";
import {
  getPhase2Benchmark,
  Phase2BenchmarkResponse,
} from "@/lib/phase2-api";
import { cn } from "@/lib/utils";

export function PeerBenchmarking() {
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [benchmarkId, setBenchmarkId] = useState<string>("RETAIL_BASELINE");
  const [data, setData] = useState<Phase2BenchmarkResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPortfolioId(localStorage.getItem("nivesh_active_portfolio_id"));
    }
  }, []);

  const fetchBenchmark = async () => {
    if (!portfolioId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPhase2Benchmark(portfolioId, benchmarkId);
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load peer benchmark data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBenchmark();
  }, [portfolioId, benchmarkId]);

  if (!portfolioId) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/40">
        <Info className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Please select an active portfolio to view peer benchmarking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Benchmark Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                {data?.benchmark_name || "Reference Baseline"}
              </h3>
              <button
                onClick={() => setShowMethodology(!showMethodology)}
                className="text-muted-foreground hover:text-primary transition-colors text-xs flex items-center gap-1 underline underline-offset-2"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                How is this calculated?
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comparing your portfolio concentration and asset mix with standardized reference datasets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data?.available_benchmarks && data.available_benchmarks.length > 0 && (
            <select
              value={benchmarkId}
              onChange={(e) => setBenchmarkId(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            >
              {data.available_benchmarks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={fetchBenchmark}
            disabled={loading}
            className="p-2 text-muted-foreground hover:text-foreground rounded-xl border border-border hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Methodology Drawer/Modal */}
      {showMethodology && data && (
        <div className="p-5 rounded-2xl bg-accent/40 border border-border text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground uppercase tracking-wider text-[11px]">
              Benchmark Methodology & Provenance
            </span>
            <button
              onClick={() => setShowMethodology(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-card rounded-xl border border-border/50">
              <span className="text-muted-foreground text-[10px] uppercase font-bold block mb-1">
                Data Source & Sample
              </span>
              <p className="text-foreground">{data.sample_size}</p>
            </div>
            <div className="p-3 bg-card rounded-xl border border-border/50">
              <span className="text-muted-foreground text-[10px] uppercase font-bold block mb-1">
                Methodology
              </span>
              <p className="text-foreground">{data.methodology}</p>
            </div>
            <div className="p-3 bg-card rounded-xl border border-border/50">
              <span className="text-muted-foreground text-[10px] uppercase font-bold block mb-1">
                As Of Date
              </span>
              <p className="text-foreground">{data.as_of_date}</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground italic">
            Note: All comparative classifications represent mathematical distance from standard multi-asset indices. No fabricated peer percentiles or rankings are utilized.
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {error}
        </div>
      )}

      {/* Key Metric Comparison Cards */}
      {data && (
        <>
          {/* Diversification Assessment Banner */}
          <div
            className={cn(
              "p-4 rounded-2xl border flex items-start gap-3",
              data.relative_position === "MORE_CONCENTRATED"
                ? "bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200"
            )}
          >
            {data.relative_position === "MORE_CONCENTRATED" ? (
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold text-xs uppercase tracking-wider block">
                Relative Classification: {data.relative_position.replace(/_/g, " ")}
              </span>
              <p className="text-xs mt-1 leading-relaxed">{data.diversification_assessment}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* HHI Metric Card */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">HHI Concentration</span>
                <Layers className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-foreground">
                    {data.portfolio_hhi.toFixed(3)}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Your Portfolio</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-muted-foreground">
                    {data.reference_hhi.toFixed(3)}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Benchmark</span>
                </div>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    data.portfolio_hhi > 0.20
                      ? "bg-amber-500"
                      : data.portfolio_hhi > 0.12
                      ? "bg-blue-500"
                      : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(100, (data.portfolio_hhi / 0.35) * 100)}%` }}
                />
              </div>
            </div>

            {/* Top Company Exposure Card */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Largest Single Entity</span>
                <PieChart className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-foreground">
                    {(data.largest_company_exposure * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Your Portfolio</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-muted-foreground">
                    {(data.reference_largest_company * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Benchmark Limit</span>
                </div>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{
                    width: `${Math.min(100, (data.largest_company_exposure / 0.25) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Equity Concentration Card */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Equity Concentration</span>
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-foreground">
                    {(data.equity_concentration * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Your Equity Weight</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-muted-foreground">
                    {(data.reference_equity_concentration * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Baseline Equity</span>
                </div>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${Math.min(100, data.equity_concentration * 100)}%` }}
                />
              </div>
            </div>

            {/* Holdings Count Card */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Total Line Items</span>
                <Scale className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-foreground">
                    {data.holdings_count}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Your Positions</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-muted-foreground">
                    {data.reference_holdings_count}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Baseline Typical</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {data.holdings_count < 5
                  ? "Highly concentrated across few lines."
                  : data.holdings_count > 30
                  ? "Broadly spread across many holdings."
                  : "Balanced number of holdings."}
              </p>
            </div>
          </div>

          {/* Asset Allocation Breakdown Table */}
          {data.asset_allocation && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Asset Class Mix vs. Reference Baseline
                </h4>
              </div>
              <div className="p-5 space-y-4">
                {/* Equity */}
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-foreground">Equity (Stocks & Mutual Funds)</span>
                    <span className="text-muted-foreground">
                      Portfolio: {(data.asset_allocation.portfolio_equity * 100).toFixed(1)}% | Baseline: {(data.asset_allocation.benchmark_equity * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex">
                    <div
                      className="bg-primary h-full"
                      style={{ width: `${Math.min(100, data.asset_allocation.portfolio_equity * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Debt */}
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-foreground">Debt & Fixed Income</span>
                    <span className="text-muted-foreground">
                      Portfolio: {(data.asset_allocation.portfolio_debt * 100).toFixed(1)}% | Baseline: {(data.asset_allocation.benchmark_debt * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${Math.min(100, data.asset_allocation.portfolio_debt * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Cash */}
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-foreground">Cash & Liquid Reserves</span>
                    <span className="text-muted-foreground">
                      Portfolio: {(data.asset_allocation.portfolio_cash * 100).toFixed(1)}% | Baseline: {(data.asset_allocation.benchmark_cash * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex">
                    <div
                      className="bg-amber-500 h-full"
                      style={{ width: `${Math.min(100, data.asset_allocation.portfolio_cash * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Legal Disclaimer */}
          <p className="text-[11px] text-muted-foreground text-center">
            {data.disclaimer}
          </p>
        </>
      )}
    </div>
  );
}