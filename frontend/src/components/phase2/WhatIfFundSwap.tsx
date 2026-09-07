"use client";

/**
 * What-If Fund Swap (real backend).
 * - Reuses Phase 1's build_diagnostics on a snapshot, never mutates real portfolio.
 * - Calls /api/portfolios/{id}/phase2/fund-swap
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  getPhase2FundSwapCandidates,
  postPhase2FundSwap,
  Phase2FundSwapResponse,
  Phase2ReplacementFund,
} from "@/lib/phase2-api";
import { usePortfolioStore } from "@/store/portfolioStore";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function WhatIfFundSwap() {
  const { holdings } = usePortfolioStore();

  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPortfolioId(localStorage.getItem("nivesh_active_portfolio_id"));
    }
  }, []);

  // MF holdings only
  const mfHoldings = useMemo(
    () =>
      holdings.filter((h: any) => {
        const t = String(
          (h as any).assetType ?? (h as any).asset_type ?? h.type ?? ""
        ).toUpperCase();
        return t.includes("MUTUAL") || t === "MUTUAL_FUND" || h.type === "Mutual Fund";
      }),
    [holdings]
  );

  const [targetHoldingId, setTargetHoldingId] = useState<string>("");
  const [candidates, setCandidates] = useState<Phase2ReplacementFund[]>([]);
  const [selectedSchemeCode, setSelectedSchemeCode] = useState<string>("");
  const [result, setResult] = useState<Phase2FundSwapResponse | null>(null);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pick first MF by default
  useEffect(() => {
    if (!targetHoldingId && mfHoldings.length > 0) {
      setTargetHoldingId(String(mfHoldings[0].id));
    }
  }, [mfHoldings, targetHoldingId]);

  // Load candidates when target changes
  const loadCandidates = useCallback(async () => {
    if (!portfolioId || !targetHoldingId) return;
    setIsLoadingCandidates(true);
    setErrorMessage(null);
    try {
      const res = await getPhase2FundSwapCandidates(portfolioId, targetHoldingId);
      if (res.error) {
        setErrorMessage(res.error);
        setCandidates([]);
        return;
      }
      setCandidates(res.candidates);
      if (res.candidates.length > 0) {
        setSelectedSchemeCode(res.candidates[0].scheme_code);
      }
      setResult(null);
    } catch (e: unknown) {
      setErrorMessage(
        e instanceof Error ? e.message : "Unable to load candidate funds."
      );
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [portfolioId, targetHoldingId]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  // Run simulation
  const runSimulation = useCallback(async () => {
    if (!portfolioId || !targetHoldingId || !selectedSchemeCode) return;
    setIsSimulating(true);
    setErrorMessage(null);
    try {
      const res = await postPhase2FundSwap(
        portfolioId,
        targetHoldingId,
        selectedSchemeCode
      );
      setResult(res);
    } catch (e: unknown) {
      setErrorMessage(
        e instanceof Error ? e.message : "Unable to run simulation."
      );
    } finally {
      setIsSimulating(false);
    }
  }, [portfolioId, targetHoldingId, selectedSchemeCode]);

  // No MFs in portfolio
  if (holdings.length > 0 && mfHoldings.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">What-If Fund Swap</h3>
            <p className="text-xs text-muted-foreground">
              Simulate replacing a mutual fund to see the impact on your
              portfolio metrics.
            </p>
          </div>
        </div>
        <div className="mt-6 p-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          <p className="font-semibold text-foreground">No mutual funds detected</p>
          <p className="text-xs mt-1">
            Fund swap simulation requires at least one mutual fund in your
            portfolio.
          </p>
        </div>
      </div>
    );
  }

  if (holdings.length === 0) {
    return null; // Let the parent page handle the empty portfolio state
  }

  const targetHolding = mfHoldings.find((h) => String(h.id) === targetHoldingId);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">What-If Fund Swap</h3>
            <p className="text-xs text-muted-foreground">
              Simulate replacing a mutual fund to see the impact on your
              portfolio metrics. Your real portfolio is not modified.
            </p>
          </div>
        </div>
      </div>

      {/* Target selector */}
      <div className="mt-5 grid lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            1. Select fund to replace
          </label>
          <select
            value={targetHoldingId}
            onChange={(e) => setTargetHoldingId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:border-primary/60 outline-none cursor-pointer"
          >
            {mfHoldings.map((h: any) => (
              <option key={h.id} value={h.id}>
                {h.name} ({formatINR(Number(h.currentValue) || 0)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            2. Select replacement fund
          </label>
          <select
            value={selectedSchemeCode}
            onChange={(e) => setSelectedSchemeCode(e.target.value)}
            disabled={isLoadingCandidates || candidates.length === 0}
            className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:border-primary/60 outline-none cursor-pointer disabled:opacity-60"
          >
            {isLoadingCandidates && (
              <option value="">Loading candidates…</option>
            )}
            {!isLoadingCandidates && candidates.length === 0 && (
              <option value="">No candidates available</option>
            )}
            {candidates.map((c) => (
              <option key={c.scheme_code} value={c.scheme_code}>
                {c.scheme_name} — TER {(c.expense_ratio * 100).toFixed(2)}%
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={() => void runSimulation()}
        disabled={
          isSimulating || !targetHoldingId || !selectedSchemeCode
        }
        className="mt-4 w-full sm:w-auto h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2"
      >
        {isSimulating ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" /> Simulating…
          </>
        ) : (
          <>
            Simulate replacement <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {errorMessage && (
        <div className="mt-3 p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 text-xs text-rose-500 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {result && !result.error && (
        <div className="mt-5 space-y-3">
          <div className="p-3 rounded-xl border border-border bg-accent/30 text-xs">
            <p>
              <strong>Replacing:</strong> {result.target_holding} →{" "}
              {result.replacement_scheme}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border border-border bg-accent/30">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">
                Current portfolio
              </p>
              <ul className="mt-2 text-xs space-y-1 font-mono">
                <li>Health: {result.before.score} / 900</li>
                <li>HHI: {result.before.hhi.toFixed(4)}</li>
                <li>Top company: {result.before.top_company_exposure.toFixed(2)}%</li>
                <li>
                  Annual TER: {formatINR(result.before.average_ter_cost)}
                </li>
                <li>
                  Potential duplicate cost:{" "}
                  {formatINR(result.before.potential_duplicate_cost)}
                </li>
              </ul>
            </div>
            <div className="p-4 rounded-xl border border-border bg-accent/30">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">
                Simulated portfolio
              </p>
              <ul className="mt-2 text-xs space-y-1 font-mono">
                <li>Health: {result.after.score} / 900</li>
                <li>HHI: {result.after.hhi.toFixed(4)}</li>
                <li>Top company: {result.after.top_company_exposure.toFixed(2)}%</li>
                <li>
                  Annual TER: {formatINR(result.after.average_ter_cost)}
                </li>
                <li>
                  Potential duplicate cost:{" "}
                  {formatINR(result.after.potential_duplicate_cost)}
                </li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
            <p className="text-[10px] uppercase font-bold text-primary mb-2">
              Change
            </p>
            <ul className="text-xs space-y-1 font-mono">
              <li>
                Health score:{" "}
                <DeltaCell value={result.delta.score} unit="points" />
              </li>
              <li>
                HHI: <DeltaCell value={result.delta.hhi} unit="" decimals={4} />
              </li>
              <li>
                Top company exposure:{" "}
                <DeltaCell
                  value={result.delta.top_company_exposure}
                  unit="%"
                  decimals={2}
                />
              </li>
              <li>
                Annual TER cost:{" "}
                <DeltaCell
                  value={result.delta.average_ter_cost}
                  unit="₹"
                  asCurrency
                />
              </li>
              <li>
                Potential duplicate cost:{" "}
                <DeltaCell
                  value={result.delta.potential_duplicate_cost}
                  unit="₹"
                  asCurrency
                />
              </li>
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground italic">
              {result.disclaimer}
            </p>
          </div>
        </div>
      )}

      {result && result.error && (
        <div className="mt-3 p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 text-xs text-rose-500">
          {result.error}
        </div>
      )}
    </div>
  );
}

function DeltaCell({
  value,
  unit,
  decimals = 0,
  asCurrency = false,
}: {
  value: number;
  unit: string;
  decimals?: number;
  asCurrency?: boolean;
}) {
  const isUp = value > 0;
  const isDown = value < 0;
  const isZero = value === 0;
  const color = isZero
    ? "text-muted-foreground"
    : isUp
      ? "text-emerald-500"
      : "text-rose-500";
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : null;
  const formatted = asCurrency
    ? formatINR(Math.abs(value))
    : `${Math.abs(value).toFixed(decimals)}${unit}`;
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold ${color}`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {isUp ? "+" : isDown ? "-" : ""}
      {formatted}
    </span>
  );
}

export default WhatIfFundSwap;
