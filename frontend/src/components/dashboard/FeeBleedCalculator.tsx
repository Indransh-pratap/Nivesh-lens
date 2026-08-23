"use client";

import React, { useState } from "react";
import { 
  Coins, 
  TrendingDown, 
  Sparkles
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function FeeBleedCalculator() {
  const { 
    getWastedFeeAnnually, 
    holdings
  } = usePortfolioStore();

  const annualBleed = getWastedFeeAnnually();
  const [cagrExpectation, setCagrExpectation] = useState(12);

  // Compounding calculation: PMT=annualBleed, r=cagrExpectation%, n=years
  const calculateCompoundedLoss = (years: number) => {
    const r = cagrExpectation / 100;
    return Math.round(annualBleed * (((Math.pow(1 + r, years) - 1) / r)));
  };

  const loss5Y = calculateCompoundedLoss(5);
  const loss10Y = calculateCompoundedLoss(10);
  const loss15Y = calculateCompoundedLoss(15);
  const loss20Y = calculateCompoundedLoss(20);

  const regularFunds = holdings.filter(h => h.type === "Mutual Fund" && h.planType === "Regular");

  return (
    <div className="rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--negative)]/10 text-[var(--negative)] border border-[var(--negative)]/20 flex items-center justify-center font-bold">
            <Coins className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Wasted Fee & Duplicate TER Calculator</h3>
            <p className="text-xs text-muted-foreground">See how much wealth is quietly lost to redundant expense ratios & Regular plan commissions</p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl border border-[var(--negative)]/20 bg-[var(--negative)]/10 text-[var(--negative)] text-xs font-semibold flex items-center gap-2 self-start sm:self-auto font-mono tabular-nums">
          <TrendingDown className="w-4 h-4" strokeWidth={1.75} />
          <span>Bleeding ₹{annualBleed.toLocaleString("en-IN")} / year</span>
        </div>
      </div>

      {/* Loss Projections & Compounding Graph */}
      <div className="grid lg:grid-cols-[1.1fr_1.3fr] gap-6 mt-6 items-center">
        
        {/* Annual Bleed Summary Box */}
        <div className="p-6 rounded-2xl bg-[var(--background-elevated)] border border-border/70 space-y-4">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Annual Duplicate Fee Bleed</p>
            <p className="text-3xl font-semibold font-mono text-[var(--negative)] mt-1 tabular-nums">
              ₹{annualBleed.toLocaleString("en-IN")}
              <span className="text-xs font-normal text-muted-foreground ml-1.5 font-sans">every single year</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--negative)]/10 border border-[var(--negative)]/20 text-xs text-[var(--negative)]">
            <strong className="font-bold text-[var(--negative)]">Where is this money going?</strong>
            <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
              <li>• <strong className="text-foreground">₹16,600</strong> in Regular Plan broker commissions across 2 funds.</li>
              <li>• <strong className="text-foreground">₹8,200</strong> in duplicate Total Expense Ratios (TER) for overlapping stocks.</li>
            </ul>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Simulate Market CAGR Growth:</span>
              <span className="font-mono font-bold text-foreground tabular-nums">{cagrExpectation}% per year</span>
            </div>
            <input 
              type="range"
              min="8"
              max="16"
              value={cagrExpectation}
              onChange={(e) => setCagrExpectation(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        </div>

        {/* Multi-Year Compounding Loss Horizon */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
            <span>Compounded Wealth Lost (Opportunity Cost)</span>
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">Compounded @ {cagrExpectation}% CAGR</span>
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { years: "5 Years", loss: loss5Y, color: "text-[var(--warning)]" },
              { years: "10 Years", loss: loss10Y, color: "text-[var(--negative)]" },
              { years: "15 Years", loss: loss15Y, color: "text-[var(--negative)]" },
              { years: "20 Years", loss: loss20Y, color: "text-[var(--negative)]" },
            ].map((col) => (
              <div key={col.years} className="p-3.5 rounded-xl bg-[var(--background-elevated)] border border-border/70 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">{col.years}</p>
                <p className={`font-mono text-base font-semibold mt-1 tabular-nums ${col.color}`}>
                  ₹{Math.round(col.loss / 1000)}k
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono tabular-nums">
                  (₹{col.loss.toLocaleString("en-IN")})
                </p>
              </div>
            ))}
          </div>

          {/* Regular Funds List */}
          <div className="mt-4 p-4 rounded-xl bg-[var(--background-elevated)] border border-border/70 space-y-2">
            <p className="text-[11px] font-bold text-foreground">Regular Plan Schemes Identified in Portfolio:</p>
            {regularFunds.map((rf) => (
              <div key={rf.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/70 last:border-none font-mono">
                <div className="font-sans">
                  <span className="text-foreground font-semibold">{rf.name}</span>
                  <span className="text-[10px] text-[var(--negative)] ml-2 font-mono tabular-nums">TER: {((rf.expenseRatio || 0) * 100).toFixed(2)}%</span>
                </div>
                <span className="text-[var(--positive)] text-[11px] font-semibold font-sans hover:underline cursor-pointer">Switch to Direct →</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">Converting Regular schemes to Direct plans takes 1-click with zero capital lock-in.</span>
        <Link href="/simulator">
          <Button size="sm" className="font-bold gap-1.5">
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Simulate Direct Plan Switch</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
