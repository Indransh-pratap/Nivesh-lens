"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  Zap
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { Button } from "@/components/ui/Button";

export function WhatIfFundSwap() {
  const { 
    holdings, 
    isWhatIfActive, 
    swapFund, 
    resetWhatIf,
    getDiversificationScore,
    getWhatIfDiversificationScore
  } = usePortfolioStore();

  const [selectedHoldingId, setSelectedHoldingId] = useState<string>("h6"); // Default ICICI Bluechip Regular
  const [selectedReplacement, setSelectedReplacement] = useState<{
    name: string;
    ticker: string;
    expenseRatio: number;
    category: string;
    cagrAdvantage: string;
  }>({
    name: "UTI Nifty 50 Index Fund - Direct (G)",
    ticker: "UTINIFTY",
    expenseRatio: 0.0020, // 0.20%
    category: "Large Cap Index (Zero Commission)",
    cagrAdvantage: "+1.8% Net Alpha vs Regular Active"
  });

  const baseScore = getDiversificationScore();
  const projectedScore = isWhatIfActive ? getWhatIfDiversificationScore() : baseScore + 65;

  const candidateReplacements = [
    {
      name: "UTI Nifty 50 Index Fund - Direct (G)",
      ticker: "UTINIFTY",
      expenseRatio: 0.0020,
      category: "Low-Cost Large Cap Index",
      cagrAdvantage: "Saves 1.34% TER Annually"
    },
    {
      name: "Motilal Oswal Midcap Fund - Direct (G)",
      ticker: "MOMIDCAP",
      expenseRatio: 0.0065,
      category: "Diversified Midcap Growth",
      cagrAdvantage: "Adds non-overlapping high-growth midcaps"
    },
    {
      name: "HDFC Gold ETF - Direct Plan",
      ticker: "HDFCGOLD",
      expenseRatio: 0.0035,
      category: "Macro Inflation Hedge (Gold)",
      cagrAdvantage: "Reduces equity market crash correlation"
    }
  ];

  const handleApplySwap = () => {
    swapFund(
      selectedHoldingId, 
      selectedReplacement.name, 
      selectedReplacement.ticker, 
      selectedReplacement.expenseRatio
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Interactive &ldquo;What-If&rdquo; Fund Swap Engine</h3>
            <p className="text-xs text-muted-foreground">Simulate replacing overlapping or high-fee funds to see instant score & fee improvements</p>
          </div>
        </div>

        {isWhatIfActive && (
          <button 
            onClick={resetWhatIf}
            className="px-3 py-1.5 rounded-xl border border-border bg-[var(--background-elevated)] text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Reset to Current Portfolio</span>
          </button>
        )}
      </div>

      {/* Swap Controls & Interactive Builder */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        
        {/* Left Side: Select Target Fund & Replacement */}
        <div className="space-y-4 p-5 rounded-2xl bg-[var(--background-elevated)] border border-border/70">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center justify-between">
              <span>1. Choose Underperforming / Overlapping Fund to Drop</span>
              <span className="text-[var(--negative)] font-mono text-[11px] font-semibold">Regular Plan Flagged</span>
            </label>
            <select 
              value={selectedHoldingId}
              onChange={(e) => setSelectedHoldingId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-[var(--background)] text-xs text-foreground focus:border-primary/60 outline-none cursor-pointer font-sans"
            >
              {holdings.filter(h => h.type === "Mutual Fund").map((fund) => (
                <option key={fund.id} value={fund.id}>
                  {fund.name} ({fund.planType} · TER: {((fund.expenseRatio || 0)*100).toFixed(2)}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              2. Select Optimized Alternative Strategy:
            </label>
            <div className="space-y-2">
              {candidateReplacements.map((rep) => {
                const isSelected = selectedReplacement.name === rep.name;
                return (
                  <div
                    key={rep.name}
                    onClick={() => setSelectedReplacement(rep)}
                    className={`p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                      isSelected 
                        ? "border-primary/60 bg-primary/10 shadow-sm" 
                        : "border-border/70 bg-[var(--card)] hover:border-border-strong"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{rep.name}</span>
                      <span className="text-[10px] font-mono text-[var(--positive)] font-semibold tabular-nums">TER: {(rep.expenseRatio * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center mt-1 text-[11px] text-muted-foreground">
                      <span>{rep.category}</span>
                      <span className="text-primary font-medium">{rep.cagrAdvantage}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Button onClick={handleApplySwap} className="w-full h-10 text-xs font-bold gap-2 mt-2">
            <Zap className="w-4 h-4" strokeWidth={1.75} />
            <span>Simulate Fund Replacement Now</span>
          </Button>
        </div>

        {/* Right Side: Before vs After Side-by-Side Dashboard */}
        <div className="space-y-4 p-5 rounded-2xl bg-[var(--background-elevated)] border border-border/70">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Simulation Metrics Impact</span>
            <span className="text-xs font-mono text-[var(--positive)] font-semibold">
              {isWhatIfActive ? "✓ Strategy Applied" : "Previewing Changes"}
            </span>
          </div>

          <div className="space-y-3 font-mono">
            {/* Health Score Comparison */}
            <div className="p-4 rounded-xl bg-[var(--card)] border border-border/70">
              <div className="flex justify-between text-xs font-sans text-muted-foreground">
                <span>Diversification Health Rating</span>
                <span className="text-[var(--positive)] font-bold font-mono">+65 Points</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-base font-semibold text-foreground tabular-nums">{baseScore} <span className="text-xs text-muted-foreground font-normal">Current</span></span>
                <ArrowRight className="w-4 h-4 text-primary" strokeWidth={1.75} />
                <span className="text-xl font-semibold text-[var(--positive)] tabular-nums">{projectedScore} <span className="text-xs font-sans font-normal text-muted-foreground">Projected</span></span>
              </div>
            </div>

            {/* Overlap Reduction */}
            <div className="p-4 rounded-xl bg-[var(--card)] border border-border/70">
              <div className="flex justify-between text-xs font-sans text-muted-foreground">
                <span>Portfolio Stock Overlap %</span>
                <span className="text-[var(--positive)] font-bold font-mono">-24% Overlap</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-base font-semibold text-[var(--negative)] tabular-nums">42.0% <span className="text-xs text-muted-foreground font-normal">Current</span></span>
                <ArrowRight className="w-4 h-4 text-primary" strokeWidth={1.75} />
                <span className="text-xl font-semibold text-[var(--positive)] tabular-nums">18.0% <span className="text-xs font-sans font-normal text-muted-foreground">Clean</span></span>
              </div>
            </div>

            {/* Annual Fee Savings */}
            <div className="p-4 rounded-xl bg-[var(--positive)]/10 border border-[var(--positive)]/20 text-[var(--positive)]">
              <div className="flex justify-between text-xs font-sans">
                <span className="font-bold">Guaranteed Annual Fee Savings</span>
                <span className="font-bold font-mono tabular-nums">₹18,600 / yr</span>
              </div>
              <p className="text-[11px] font-sans text-muted-foreground mt-1 leading-relaxed">
                By replacing 1.54% Regular active commission with 0.20% Direct Index tracking. Compounded over 10 years @ 12% = <strong className="text-foreground font-mono tabular-nums">₹3,26,000+ extra wealth</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
