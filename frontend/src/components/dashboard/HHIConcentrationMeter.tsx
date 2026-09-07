"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { 
  Info, 
  Calculator
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { InsightFlag } from "@/components/ui/InsightFlag";
import { EmptyState } from "@/components/ui/EmptyState";

export function HHIConcentrationMeter() {
  const { getHHIConcentrationScore, companyExposures, holdings, openSyncModal } = usePortfolioStore();
  const router = useRouter();

  if (holdings.length === 0 && companyExposures.length === 0) {
    return (
      <EmptyState
        icon={Calculator}
        title="HHI Concentration Meter Unavailable"
        description="Upload a CAS statement or sync your portfolio to measure single-stock concentration risk using the Herfindahl-Hirschman Index."
        actionLabel="Connect Portfolio"
        onAction={openSyncModal}
      />
    );
  }

  const hhi = getHHIConcentrationScore();

  // Status computation
  const getHHIStatus = (score: number) => {
    if (score < 1500) {
      return {
        label: "Well Diversified (Safe)",
        color: "text-[var(--positive)]",
        badgeBg: "bg-[var(--positive)]/10 border-[var(--positive)]/20 text-[var(--positive)]",
        description: "Your capital is comfortably distributed across varied market caps and industries without excessive dependence on any single pillar.",
        barColor: "bg-[var(--positive)]"
      };
    }
    if (score <= 2500) {
      return {
        label: "Moderate Concentration",
        color: "text-[var(--warning)]",
        badgeBg: "bg-[var(--warning)]/10 border-[var(--warning)]/20 text-[var(--warning)]",
        description: "A few corporate giants (e.g. Reliance + HDFC) dominate your returns. A single negative earnings surprise could drag down your entire net worth.",
        barColor: "bg-[var(--warning)]"
      };
    }
    return {
      label: "Highly Concentrated (Danger)",
      color: "text-[var(--negative)]",
      badgeBg: "bg-[var(--negative)]/10 border-[var(--negative)]/20 text-[var(--negative)]",
      description: "Severe concentration! More than 40% of your net worth is tied up in 2-3 stocks, creating asymmetric tail risk.",
      barColor: "bg-[var(--negative)]"
    };
  };

  const status = getHHIStatus(hhi);
  const top5 = companyExposures.slice(0, 5);
  const top5TotalPercent = top5.reduce((acc, c) => acc + c.totalTruePercent, 0);

  return (
    <div className="rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <Calculator className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">HHI Concentration Score</h3>
            <p className="text-xs text-muted-foreground">Herfindahl-Hirschman Index for True Portfolio Concentration</p>
          </div>
        </div>

        <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 self-start sm:self-auto ${status.badgeBg}`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span>{status.label}</span>
        </div>
      </div>

      {/* Main Meter & Mathematical Formula */}
      <div className="grid md:grid-cols-[1fr_1.3fr] gap-6 mt-6 items-center">
        
        {/* HHI Dial Gauge */}
        <div className="p-6 rounded-2xl bg-[var(--background-elevated)] border border-border/70 text-center space-y-4">
          <p className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">Herfindahl-Hirschman Index</p>
          
          <div className="flex items-baseline justify-center gap-2 font-mono">
            <span className={`text-5xl font-semibold tracking-tight tabular-nums ${status.color}`}>
              {hhi}
            </span>
            <span className="text-xs text-muted-foreground font-normal">/ 10,000</span>
          </div>

          {/* Meter track */}
          <div className="space-y-1.5">
            <div className="w-full h-2.5 bg-[var(--background)] rounded-full overflow-hidden p-0.5 border border-border flex">
              <div className="h-full bg-[var(--positive)] w-[25%] rounded-l-full" title="Safe: 0-1500" />
              <div className="h-full bg-[var(--warning)] w-[20%]" title="Moderate: 1500-2500" />
              <div className="h-full bg-[var(--negative)] w-[55%] rounded-r-full" title="Danger: 2500-10000" />
            </div>

            <div className="flex justify-between text-[10px] font-mono text-muted-foreground pt-1">
              <span>0 (Infinite Spread)</span>
              <span className="text-[var(--positive)] font-semibold">1500</span>
              <span className="text-[var(--warning)] font-semibold">2500</span>
              <span className="text-[var(--negative)] font-semibold">10k</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {status.description}
          </p>
        </div>

        {/* Top 5 Contributions Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-border/70">
            <span className="font-semibold text-muted-foreground">Top 5 True Company Holdings</span>
            <span className="font-mono text-xs font-bold text-primary tabular-nums">
              {top5TotalPercent.toFixed(1)}% of Net Worth
            </span>
          </div>

          <div className="space-y-2">
            {top5.map((c) => {
              const squared = Math.round(c.totalTruePercent * c.totalTruePercent);
              return (
                <div key={c.id} className="p-3 rounded-xl bg-[var(--background-elevated)] border border-border/70 flex items-center justify-between text-xs hover:border-border-strong transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-semibold text-foreground">{c.companyName}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-muted-foreground tabular-nums">{c.totalTruePercent.toFixed(1)}% weight</span>
                    <span className="text-primary font-bold tabular-nums">+{squared} HHI pts</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formula info banner */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground flex items-start gap-2">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
            <span>
              <strong>Formula: </strong> {"HHI = \\sum (Weight %)^2"}. Institutional benchmarks use HHI to detect single-stock vulnerability.
            </span>
          </div>
        </div>
      </div>

      {hhi >= 1500 && (
        <div className="mt-6">
          <InsightFlag
            severity={hhi > 2500 ? "danger" : "warning"}
            headline={`HHI score of ${hhi} is above the safe threshold of 1,500`}
            why={`At this score, your top 5 holdings alone account for ${top5TotalPercent.toFixed(1)}% of net worth — a correction in just one of them moves your entire portfolio, not just one line item.`}
            fixLabel="Run a fund-swap simulation to bring this down"
            onFix={() => router.push("/simulator")}
          />
        </div>
      )}
    </div>
  );
}
