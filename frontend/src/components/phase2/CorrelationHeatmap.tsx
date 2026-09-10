"use client";

/**
 * NAV Correlation Matrix (real backend).
 * - Fetches /api/portfolios/{id}/phase2/correlation
 * - Configurable lookback (3M / 6M / 1Y / 3Y)
 * - Honest "Insufficient data" state instead of fabricated values
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { getPhase2Correlation } from "@/lib/phase2-api";
import { usePortfolioStore } from "@/store/portfolioStore";

type Lookback = "3M" | "6M" | "1Y" | "3Y";

function cellColor(c: number) {
  if (c >= 0.85) return "bg-rose-500/20 text-rose-700 dark:text-rose-300";
  if (c >= 0.65) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  if (c >= 0.4) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return "bg-muted text-muted-foreground";
}

function shortName(name: string) {
  return name.length > 16 ? name.slice(0, 15) + "…" : name;
}

export function CorrelationHeatmap() {
  const { holdings, activePortfolioId, loadActivePortfolio } = usePortfolioStore();

  const [portfolioId, setPortfolioId] = useState<string | null>(activePortfolioId);
  const [lookback, setLookback] = useState<Lookback>("1Y");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof getPhase2Correlation>
  >["result"] | null>(null);
  const [availableLookbacks, setAvailableLookbacks] = useState<string[]>([
    "3M",
    "6M",
    "1Y",
    "3Y",
  ]);

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

  const mfHoldingsCount = useMemo(
    () =>
      holdings.filter((h: any) => {
        const t = String(
          (h as any).assetType ?? (h as any).asset_type ?? h.type ?? ""
        ).toUpperCase();
        return t.includes("MUTUAL") || t === "MUTUAL_FUND" || h.type === "Mutual Fund";
      }).length,
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
      setErrorMessage("No active portfolio. Please connect a portfolio with mutual funds.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getPhase2Correlation(targetId, lookback);
      setAvailableLookbacks(res.available_lookbacks);
      setResult(res.result);
    } catch (e: unknown) {
      setErrorMessage(
        e instanceof Error ? e.message : "Unable to load correlation matrix."
      );
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, activePortfolioId, lookback, loadActivePortfolio]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => void load();
    window.addEventListener("nivesh_portfolio_updated", handler);
    return () => window.removeEventListener("nivesh_portfolio_updated", handler);
  }, [load]);

  // No portfolio / no MFs
  if (holdings.length > 0 && mfHoldingsCount === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-base font-bold">NAV Correlation Matrix</h3>
        <p className="text-xs text-muted-foreground">
          Compare daily return correlation across your mutual funds.
        </p>
        <div className="mt-6 p-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          <p className="font-semibold text-foreground">No mutual funds in portfolio</p>
          <p className="text-xs mt-1">
            Correlation analysis requires at least 2 mutual funds with historical
            NAV data.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="h-6 w-56 animate-pulse rounded bg-muted mb-4" />
        <div className="h-48 animate-pulse rounded-lg bg-muted/60" />
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
              Correlation unavailable
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

  const noMatrix = result.matrix.length === 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div>
          <h3 className="text-base font-bold">NAV Correlation Matrix</h3>
          <p className="text-xs text-muted-foreground">
            Funds that historically move together — they may be more correlated
            than they look.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-card border border-border p-0.5 rounded-xl text-[11px]">
          {availableLookbacks.map((l) => (
            <button
              key={l}
              onClick={() => setLookback(l as Lookback)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                lookback === l
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {noMatrix ? (
        <div className="mt-6 p-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-foreground">
            Insufficient historical data
          </p>
          <p className="text-xs mt-1">{result.disclaimer}</p>
          {result.insufficient_funds.length > 0 && (
            <ul className="mt-3 text-[11px] text-left max-w-md mx-auto">
              {result.insufficient_funds.map((f) => (
                <li key={f.fund_id} className="py-0.5">
                  · {f.fund_name} — {f.reason ?? "Insufficient data"}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          {/* Matrix */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-xs border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="text-left text-muted-foreground p-2 min-w-[140px]">
                    Fund
                  </th>
                  {result.funds.map((f) => (
                    <th
                      key={f}
                      className="text-left text-muted-foreground font-medium p-2 min-w-[80px]"
                      title={f}
                    >
                      {shortName(f)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.funds.map((fundA, i) => (
                  <tr key={fundA}>
                    <td className="p-2 font-semibold" title={fundA}>
                      {shortName(fundA)}
                    </td>
                    {result.matrix[i].map((cell, j) => (
                      <td
                        key={j}
                        className={`p-2 rounded-md text-center font-mono ${cellColor(
                          cell
                        )}`}
                      >
                        {cell.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pairs list */}
          {result.pairs.length > 0 && (
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Funds moving similarly
              </h4>
              <div className="space-y-1.5">
                {result.pairs
                  .filter((p) => p.correlation >= result.thresholds.medium)
                  .map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs p-2.5 rounded-lg border border-border bg-accent/30"
                    >
                      <div className="min-w-0 flex-1 truncate">
                        <span className="font-semibold">{p.fund_a}</span>
                        <span className="mx-1.5 text-muted-foreground">↔</span>
                        <span className="font-semibold">{p.fund_b}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-semibold">
                          {p.correlation.toFixed(2)}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            p.classification === "Very Similar Behaviour"
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-300"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                          }`}
                        >
                          {p.classification}
                        </span>
                      </div>
                    </div>
                  ))}
                {result.pairs.every(
                  (p) => p.correlation < result.thresholds.medium
                ) && (
                  <p className="text-xs text-muted-foreground">
                    No fund pair has historically moved in close sync over the
                    selected lookback.
                  </p>
                )}
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
                <strong>Thresholds:</strong> High ≥ {result.thresholds.high},{" "}
                Medium ≥ {result.thresholds.medium}
              </p>
              <p className="italic">{result.disclaimer}</p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

export default CorrelationHeatmap;
