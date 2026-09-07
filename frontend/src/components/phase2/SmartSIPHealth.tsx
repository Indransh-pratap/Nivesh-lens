"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  DollarSign,
  HelpCircle,
  Info,
  PauseCircle,
  Percent,
  PlayCircle,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  StopCircle,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  getPhase2SIPHealth,
  postPhase2SIPSwitchSimulation,
  Phase2SIPAlternativeCandidate,
  Phase2SIPHealthItem,
  Phase2SIPHealthResponse,
  Phase2SIPSwitchSimulationResponse,
} from "@/lib/phase2-api";
import { cn } from "@/lib/utils";

function formatINR(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

export function SmartSIPHealth() {
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [data, setData] = useState<Phase2SIPHealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulation drawer state
  const [activeSimulationFund, setActiveSimulationFund] = useState<Phase2SIPHealthItem | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Phase2SIPAlternativeCandidate | null>(null);
  const [simulationResult, setSimulationResult] = useState<Phase2SIPSwitchSimulationResponse | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPortfolioId(localStorage.getItem("nivesh_active_portfolio_id"));
    }
  }, []);

  const fetchSIPHealth = async () => {
    if (!portfolioId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPhase2SIPHealth(portfolioId);
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load SIP health check data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSIPHealth();
  }, [portfolioId]);

  const handleOpenSimulation = (item: Phase2SIPHealthItem) => {
    setActiveSimulationFund(item);
    setSimulationResult(null);
    setSimulationError(null);
    if (item.candidate_alternatives && item.candidate_alternatives.length > 0) {
      setSelectedCandidate(item.candidate_alternatives[0]);
    } else {
      setSelectedCandidate(null);
    }
  };

  const handleSimulateSwitch = async () => {
    if (!portfolioId || !activeSimulationFund || !selectedCandidate) return;
    setSimulating(true);
    setSimulationError(null);
    try {
      const res = await postPhase2SIPSwitchSimulation(
        portfolioId,
        activeSimulationFund.holding_id,
        selectedCandidate.scheme_code
      );
      setSimulationResult(res);
    } catch (err: any) {
      setSimulationError(err?.message || "Unable to simulate switch at this time");
    } finally {
      setSimulating(false);
    }
  };

  if (!portfolioId) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/40">
        <Info className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Please select an active portfolio to run the Smart SIP Health check.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Smart SIP Health Check & Simulation
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Evaluates cadence, expense drag, and category performance across active SIP mandates.
            </p>
          </div>
        </div>

        <button
          onClick={fetchSIPHealth}
          disabled={loading}
          className="p-2 self-start sm:self-auto text-muted-foreground hover:text-foreground rounded-xl border border-border hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Overall Grade Card */}
          <div className="p-4 rounded-2xl bg-card border border-border">
            <span className="text-xs font-semibold text-muted-foreground">Overall Portfolio SIP Grade</span>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "text-3xl font-black",
                    data.overall_grade === "A"
                      ? "text-emerald-500"
                      : data.overall_grade === "B"
                      ? "text-blue-500"
                      : data.overall_grade === "C"
                      ? "text-amber-500"
                      : "text-destructive"
                  )}
                >
                  Grade {data.overall_grade}
                </span>
                <span className="text-xs font-bold text-muted-foreground">
                  ({data.overall_score}/100)
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-border">
                {data.overall_rating.replace(/_/g, " ")}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground block mt-1">
              Multi-factor composite score
            </span>
          </div>

          {/* Active SIPs */}
          <div className="p-4 rounded-2xl bg-card border border-border">
            <span className="text-xs font-semibold text-muted-foreground">Active SIP Positions</span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-black text-foreground">
                {data.active_sips_count}
              </span>
              <PlayCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-[10px] text-muted-foreground block mt-1">
              Regular monthly debits active
            </span>
          </div>

          {/* Paused / Inactive */}
          <div className="p-4 rounded-2xl bg-card border border-border">
            <span className="text-xs font-semibold text-muted-foreground">Paused / Inactive SIPs</span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-black text-foreground">
                {data.paused_sips_count + data.stopped_sips_count}
              </span>
              <PauseCircle className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-[10px] text-muted-foreground block mt-1">
              No recent transaction debits
            </span>
          </div>

          {/* Monthly Commitment */}
          <div className="p-4 rounded-2xl bg-card border border-border">
            <span className="text-xs font-semibold text-muted-foreground">Monthly Commitment</span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-black text-primary">
                {formatINR(data.total_monthly_commitment)}
              </span>
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground block mt-1">
              Total recurring investment / month
            </span>
          </div>
        </div>
      )}

      {/* SIP List */}
      {data && (
        <div className="space-y-4">
          {data.sips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/30">
              <Info className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <h4 className="text-sm font-bold text-foreground">No Mutual Fund SIP Positions Found</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                No active or historical mutual fund holdings were detected in this portfolio.
              </p>
            </div>
          ) : (
            data.sips.map((item) => {
              const hasAlts = item.candidate_alternatives && item.candidate_alternatives.length > 0;
              const isHighTer = item.expense_ratio > 0.012;

              return (
                <div
                  key={item.holding_id}
                  className="p-5 rounded-2xl border border-border bg-card hover:border-border/80 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {item.fund_name}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                            item.grade === "A"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : item.grade === "B"
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              : item.grade === "C"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          )}
                        >
                          Grade {item.grade} • Score {item.score}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                            item.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          )}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Category: {item.category || "Equity"} • Recurring Amount: ~{formatINR(item.monthly_amount)}/mo
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {hasAlts && (
                        <button
                          onClick={() => handleOpenSimulation(item)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Compare Alternatives
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metric Pills Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-secondary/50 border border-border/40">
                      <span className="text-muted-foreground text-[10px] uppercase font-semibold block mb-0.5">
                        Expense Ratio (TER)
                      </span>
                      <span
                        className={cn(
                          "font-bold text-sm",
                          isHighTer ? "text-destructive" : item.expense_ratio <= 0.006 ? "text-emerald-500" : "text-foreground"
                        )}
                      >
                        {(item.expense_ratio * 100).toFixed(2)}%
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-secondary/50 border border-border/40">
                      <span className="text-muted-foreground text-[10px] uppercase font-semibold block mb-0.5">
                        1-Year Return
                      </span>
                      <span className="font-bold text-sm text-foreground">
                        {item.returns_1y !== null && item.returns_1y !== undefined
                          ? `${(item.returns_1y * 100).toFixed(1)}%`
                          : "Insufficient Data"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-secondary/50 border border-border/40">
                      <span className="text-muted-foreground text-[10px] uppercase font-semibold block mb-0.5">
                        3-Year Return (CAGR)
                      </span>
                      <span className="font-bold text-sm text-foreground">
                        {item.returns_3y !== null && item.returns_3y !== undefined
                          ? `${(item.returns_3y * 100).toFixed(1)}%`
                          : "Insufficient Data"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-secondary/50 border border-border/40">
                      <span className="text-muted-foreground text-[10px] uppercase font-semibold block mb-0.5">
                        Overlap Risk
                      </span>
                      <span className="font-bold text-sm text-foreground">
                        {item.overlap_score > 30 ? "High Overlap" : "Low Overlap"}
                      </span>
                    </div>
                  </div>

                  {/* Factor Badges */}
                  {item.factors && item.factors.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {item.factors.map((f, idx) => (
                        <span
                          key={idx}
                          className={cn(
                            "text-[10px] font-medium px-2.5 py-1 rounded-lg border flex items-center gap-1.5",
                            f.impact >= 0
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          )}
                        >
                          {f.impact >= 0 ? "+" : ""}
                          {f.impact} • {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Legal Disclaimer */}
          <p className="text-[11px] text-muted-foreground text-center pt-2">
            {data.disclaimer}
          </p>
        </div>
      )}

      {/* Alternative Switch Simulation Drawer */}
      {activeSimulationFund && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  Simulate Alternative Scheme Switch
                </h3>
              </div>
              <button
                onClick={() => setActiveSimulationFund(null)}
                className="p-1 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulation Warning / Regulatory Guardrail Banner */}
            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-xs text-foreground flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p>
                <strong>Simulated Comparison Only:</strong> This tool projects fee and performance differences based on AMFI category data. It does not place transactions or alter your active mandate with the fund house or distributor.
              </p>
            </div>

            {/* Current Fund Overview */}
            <div className="p-4 rounded-2xl bg-secondary/40 border border-border/50 text-xs space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Current Mandate</span>
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-foreground">{activeSimulationFund.fund_name}</span>
                <span className="font-bold text-foreground">{(activeSimulationFund.expense_ratio * 100).toFixed(2)}% TER</span>
              </div>
            </div>

            {/* Candidate Selector */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-foreground block">
                Select Candidate Alternative (Same Category: {activeSimulationFund.category || "Equity"})
              </span>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeSimulationFund.candidate_alternatives.map((c) => (
                  <div
                    key={c.scheme_code}
                    onClick={() => {
                      setSelectedCandidate(c);
                      setSimulationResult(null);
                    }}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs",
                      selectedCandidate?.scheme_code === c.scheme_code
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-card border-border hover:bg-accent/40"
                    )}
                  >
                    <div>
                      <span className="font-bold text-foreground block">{c.scheme_name}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        AMC: {c.amc_name || "Direct Mutual Fund"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-500 block">
                        {(c.expense_ratio * 100).toFixed(2)}% TER
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Est. savings: ~{formatINR(c.estimated_annual_savings)}/yr
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {simulationError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {simulationError}
              </div>
            )}

            {/* Simulation Result */}
            {simulationResult && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Simulated Impact Analysis
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-card border border-border/50">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">TER Reduction</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-300">
                      -{simulationResult.ter_savings_percent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-border/50">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Annual Fee Savings</span>
                    <span className="font-bold text-foreground">
                      {formatINR(simulationResult.estimated_annual_savings)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-border/50">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">5-Yr Projected Savings</span>
                    <span className="font-bold text-primary">
                      {formatINR(simulationResult.projected_5y_savings)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-border/50">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Health Score Delta</span>
                    <span className="font-bold text-foreground">
                      {simulationResult.score_before} → {simulationResult.score_after} (Grade {simulationResult.grade_after})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveSimulationFund(null)}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!selectedCandidate || simulating}
                onClick={handleSimulateSwitch}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
              >
                {simulating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Calculate Switch Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}