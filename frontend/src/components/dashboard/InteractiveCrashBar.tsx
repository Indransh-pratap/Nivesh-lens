"use client";

import React, { useState } from "react";
import { 
  TrendingDown, 
  SlidersHorizontal, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  Flame,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function InteractiveCrashBar() {
  const [dropPercent, setDropPercent] = useState<number>(15);

  const portfolioValue = 3480000;
  // Beta weighted loss calculation: Equity beta is ~1.15, Debt beta is 0.05, Cash is 0
  // Equities: 78.4%, Debt: 13.8%, Global Tech: 7.8%
  const effectiveDropRate = (dropPercent * 0.784 * 1.12) / 100;
  const estimatedLoss = Math.round(portfolioValue * effectiveDropRate);
  const remainingValue = portfolioValue - estimatedLoss;

  const quickPresets = [
    { label: "5% Pullback", val: 5 },
    { label: "15% Correction", val: 15 },
    { label: "25% Bear Market", val: 25 },
    { label: "38% 2020 Covid", val: 38 },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-6 text-foreground relative overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--negative-soft)] text-[var(--negative)] border border-[var(--negative)]/30 flex items-center justify-center font-bold">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">Live Drawdown & Crash Stress-Tester</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--negative-soft)] text-[var(--negative)] font-mono font-bold">
                REAL-TIME SIMULATOR
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Drag the market fall slider to watch real-time capital impact & bond buffer defense
            </p>
          </div>
        </div>

        <Link href="/stress-tester">
          <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer">
            <span>Advanced Scenarios (2008 / 2022)</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
      </div>

      {/* Preset Buttons & Slider */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {quickPresets.map((p) => (
              <button
                key={p.val}
                onClick={() => setDropPercent(p.val)}
                className={cn(
                  "px-3 py-1 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer border",
                  dropPercent === p.val
                    ? "bg-[var(--negative)] text-white border-[var(--negative)] shadow-sm"
                    : "bg-accent/40 border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <span className="font-mono text-sm font-bold text-[var(--negative)] tabular-nums">
            Selected Drop: -{dropPercent}%
          </span>
        </div>

        {/* Interactive Slider Input */}
        <div className="space-y-1 pt-1">
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={dropPercent}
            onChange={(e) => setDropPercent(Number(e.target.value))}
            className="w-full h-2.5 bg-accent rounded-lg appearance-none cursor-pointer accent-[var(--negative)]"
          />
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
            <span>-1% (Minor Dip)</span>
            <span>-25% (Market Correction)</span>
            <span>-50% (GFC / Black Swan)</span>
          </div>
        </div>
      </div>

      {/* Live Calculated Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-mono">
        <div className="p-4 rounded-xl bg-accent/40 border border-border space-y-1">
          <span className="text-[11px] text-muted-foreground font-sans block">Estimated Net Loss</span>
          <span className="text-xl sm:text-2xl font-bold text-[var(--negative)] tabular-nums block">
            -₹{estimatedLoss.toLocaleString("en-IN")}
          </span>
          <span className="text-[10.5px] text-muted-foreground block">
            Portfolio Drop: -{((estimatedLoss / portfolioValue) * 100).toFixed(2)}%
          </span>
        </div>

        <div className="p-4 rounded-xl bg-accent/40 border border-border space-y-1">
          <span className="text-[11px] text-muted-foreground font-sans block">Preserved Capital</span>
          <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums block">
            ₹{remainingValue.toLocaleString("en-IN")}
          </span>
          <span className="text-[10.5px] text-primary block font-sans">
            Protected by ₹4.80L Debt Allocation
          </span>
        </div>

        <div className="p-4 rounded-xl bg-accent/40 border border-border space-y-1">
          <span className="text-[11px] text-muted-foreground font-sans block">Most Vulnerable Holding</span>
          <span className="text-base font-bold text-foreground truncate block">
            HDFC Bank (15.87%)
          </span>
          <span className="text-[10.5px] text-[var(--negative)] block">
            Takes ~₹{Math.round(estimatedLoss * 0.28).toLocaleString("en-IN")} of total drawdown
          </span>
        </div>
      </div>

    </div>
  );
}
