"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Flame,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { usePortfolioStore } from "@/store/portfolioStore";

function valueOf(
  holding: any
): number {
  return (
    Number(
      holding.currentValue ??
        holding.current_value ??
        0
    ) || 0
  );
}

function isEquity(
  holding: any
): boolean {
  const type =
    String(
      holding.assetType ??
        holding.asset_type ??
        ""
    ).toUpperCase();

  const assetClass =
    String(
      holding.assetClass ??
        holding.asset_class ??
        ""
    ).toUpperCase();

  return (
    type.includes("EQUITY") ||
    type.includes("STOCK") ||
    assetClass.includes("EQUITY") ||
    assetClass.includes("STOCK")
  );
}

export function InteractiveCrashBar() {
  const holdings =
    usePortfolioStore(
      (state) => state.holdings
    );

  const [
    dropPercent,
    setDropPercent,
  ] = useState(15);

  const metrics = useMemo(() => {
    const portfolioValue =
      holdings.reduce(
        (sum, holding) =>
          sum + valueOf(holding),
        0
      );

    const equityValue =
      holdings
        .filter(isEquity)
        .reduce(
          (sum, holding) =>
            sum + valueOf(holding),
          0
        );

    const equityWeight =
      portfolioValue > 0
        ? equityValue /
          portfolioValue
        : 0;

    /*
     * We use only the actual equity exposure
     * from the authenticated user's portfolio.
     */
    const effectiveDropRate =
      (dropPercent *
        equityWeight *
        1.12) /
      100;

    const estimatedLoss =
      Math.round(
        portfolioValue *
          effectiveDropRate
      );

    const remainingValue =
      Math.max(
        0,
        portfolioValue -
          estimatedLoss
      );

    const topEquity =
      [...holdings]
        .filter(isEquity)
        .sort(
          (a, b) =>
            valueOf(b) -
            valueOf(a)
        )[0] ?? null;

    const topWeight =
      topEquity &&
      portfolioValue > 0
        ? (valueOf(topEquity) /
            portfolioValue) *
          100
        : 0;

    const topLoss =
      Math.round(
        estimatedLoss *
          (topWeight / 100)
      );

    return {
      portfolioValue,
      equityValue,
      equityWeight,
      estimatedLoss,
      remainingValue,
      topEquity,
      topWeight,
      topLoss,
    };
  }, [
    holdings,
    dropPercent,
  ]);

  const presets = [
    {
      label: "5% Pullback",
      value: 5,
    },
    {
      label: "15% Correction",
      value: 15,
    },
    {
      label: "25% Bear Market",
      value: 25,
    },
    {
      label: "38% Crash",
      value: 38,
    },
  ];

  if (
    holdings.length === 0
  ) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <TrendingDown className="w-8 h-8 text-muted-foreground mx-auto mb-3" />

        <h3 className="text-base font-bold">
          Crash Stress-Tester
        </h3>

        <p className="text-xs text-muted-foreground mt-1">
          Import a portfolio before running a drawdown simulation.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-6 text-foreground">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--negative-soft)] text-[var(--negative)] border border-[var(--negative)]/30 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">
                Live Drawdown & Crash Stress-Tester
              </h3>

              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--negative-soft)] text-[var(--negative)] font-mono font-bold">
                LIVE PORTFOLIO
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Simulation uses your imported portfolio value and equity allocation.
            </p>
          </div>
        </div>

        <Link href="/stress-tester">
          <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            Advanced Scenarios
            <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {presets.map(
              (preset) => (
                <button
                  key={
                    preset.value
                  }
                  onClick={() =>
                    setDropPercent(
                      preset.value
                    )
                  }
                  className={cn(
                    "px-3 py-1 rounded-xl text-xs font-bold font-mono border",
                    dropPercent ===
                      preset.value
                      ? "bg-[var(--negative)] text-white border-[var(--negative)]"
                      : "bg-accent/40 border-border text-muted-foreground"
                  )}
                >
                  {
                    preset.label
                  }
                </button>
              )
            )}
          </div>

          <span className="font-mono text-sm font-bold text-[var(--negative)]">
            Selected Drop: -
            {dropPercent}%
          </span>
        </div>

        <input
          type="range"
          min={1}
          max={50}
          step={1}
          value={dropPercent}
          onChange={(event) =>
            setDropPercent(
              Number(
                event.target.value
              )
            )
          }
          className="w-full h-2.5 accent-[var(--negative)]"
        />

        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
          <span>-1%</span>
          <span>-25%</span>
          <span>-50%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div className="p-4 rounded-xl bg-accent/40 border border-border">
          <span className="text-[11px] text-muted-foreground font-sans block">
            Estimated Net Loss
          </span>

          <span className="text-xl sm:text-2xl font-bold text-[var(--negative)] block mt-1">
            -₹
            {metrics.estimatedLoss.toLocaleString(
              "en-IN"
            )}
          </span>

          <span className="text-[10.5px] text-muted-foreground block mt-1">
            Portfolio Drop: -
            {(
              metrics.portfolioValue >
              0
                ? (metrics.estimatedLoss /
                    metrics.portfolioValue) *
                  100
                : 0
            ).toFixed(2)}
            %
          </span>
        </div>

        <div className="p-4 rounded-xl bg-accent/40 border border-border">
          <span className="text-[11px] text-muted-foreground font-sans block">
            Preserved Capital
          </span>

          <span className="text-xl sm:text-2xl font-bold block mt-1">
            ₹
            {metrics.remainingValue.toLocaleString(
              "en-IN"
            )}
          </span>

          <span className="text-[10.5px] text-primary block mt-1">
            Equity exposure:{" "}
            {(
              metrics.equityWeight *
              100
            ).toFixed(1)}
            %
          </span>
        </div>

        <div className="p-4 rounded-xl bg-accent/40 border border-border">
          <span className="text-[11px] text-muted-foreground font-sans block">
            Largest Equity Holding
          </span>

          <span className="text-base font-bold truncate block mt-1">
            {metrics.topEquity
              ?.name ??
              "N/A"}
          </span>

          <span className="text-[10.5px] text-[var(--negative)] block mt-1">
            Weight:{" "}
            {metrics.topWeight.toFixed(
              2
            )}
            %
          </span>

          <span className="text-[10.5px] text-muted-foreground block">
            Estimated loss share: ₹
            {metrics.topLoss.toLocaleString(
              "en-IN"
            )}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-primary" />

        <span>
          Simulation is calculated from your current stored holdings; no demo portfolio value is used.
        </span>
      </div>
    </div>
  );
}