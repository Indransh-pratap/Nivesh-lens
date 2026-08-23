"use client";

import React, { useMemo } from "react";
import { 
  ShieldCheck, 
  Activity, 
  Layers, 
  PieChart, 
  Coins, 
  Building2, 
  Info,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { HealthScoreData } from "@/types";
import { MOCK_HEALTH_SCORE } from "@/data/mock/phase1Data";

interface FinancialHealthScoreCardProps {
  data?: HealthScoreData;
  className?: string;
}

export const FinancialHealthScoreCard = React.memo(function FinancialHealthScoreCard({
  data = MOCK_HEALTH_SCORE,
  className = ""
}: FinancialHealthScoreCardProps) {
  const { overallScore, ratingGrade, percentileRank, ratingText, subPillars } = data;

  // Memoized calculation for SVG radial arc: 300 to 900 scale
  const { dashOffset, ratingBadge } = useMemo(() => {
    const minScore = 300;
    const maxScore = 900;
    const clamped = Math.min(Math.max(overallScore, minScore), maxScore);
    const pct = (clamped - minScore) / (maxScore - minScore);
    
    // Circumference for r=70: 2 * Math.PI * 70 ≈ 439.82. Semi-circle arc ≈ 219.91
    const arcLength = 219.91;
    const offset = arcLength - (pct * arcLength);

    const badgeConfig = {
      Prime: { color: "text-[var(--positive)]", bg: "bg-[var(--positive)]/10 border-[var(--positive)]/20", label: "Prime Diversified (Top Decile)" },
      Healthy: { color: "text-[var(--info)]", bg: "bg-[var(--info)]/10 border-[var(--info)]/20", label: "Healthy Asset Mix" },
      "Moderate Risk": { color: "text-[var(--warning)]", bg: "bg-[var(--warning)]/10 border-[var(--warning)]/20", label: "Moderate Overlap & Fees" },
      Vulnerable: { color: "text-[var(--negative)]", bg: "bg-[var(--negative)]/10 border-[var(--negative)]/20", label: "High Single-Stock Concentration" }
    }[ratingGrade] || { color: "text-[var(--info)]", bg: "bg-[var(--info)]/10 border-[var(--info)]/20", label: "Healthy Asset Mix" };

    return {
      dashOffset: offset,
      ratingBadge: badgeConfig
    };
  }, [overallScore, ratingGrade]);

  const getPillarIcon = (name: string) => {
    if (name.includes("Asset")) return PieChart;
    if (name.includes("Company")) return Layers;
    if (name.includes("Overlap") || name.includes("TER")) return Coins;
    if (name.includes("Group")) return Building2;
    return ShieldCheck;
  };

  const getPillarColor = (status: string) => {
    if (status === "Optimal") return "bg-[var(--positive)]";
    if (status === "Moderate") return "bg-[var(--info)]";
    if (status === "Alert") return "bg-[var(--warning)]";
    return "bg-[var(--negative)]";
  };

  return (
    <div className={`rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden ${className}`}>
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Financial Health Score</h3>
            <p className="text-xs text-muted-foreground">Institutional 300 to 900 Diversification & Risk Metric (CIBIL-Inspired)</p>
          </div>
        </div>

        <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 self-start sm:self-auto ${ratingBadge.bg} ${ratingBadge.color}`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span>{ratingBadge.label}</span>
        </div>
      </div>

      {/* Main Speedometer & Sub-Pillars Grid */}
      <div className="grid lg:grid-cols-[1.1fr_1.3fr] gap-8 mt-6 items-center">
        
        {/* Speedometer Radial Gauge */}
        <div className="flex flex-col items-center justify-center p-6 bg-[var(--background-elevated)] rounded-2xl border border-border/70 relative">
          
          <div className="relative w-64 h-36 flex items-end justify-center overflow-hidden">
            <svg viewBox="0 0 180 100" className="w-full h-full">
              {/* Background Track */}
              <path
                d="M 20 90 A 70 70 0 0 1 160 90"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeLinecap="round"
                className="text-white/[0.08]"
              />
              
              {/* Dynamic Gradient */}
              <defs>
                <linearGradient id="healthSpeedometerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e2685f" />
                  <stop offset="35%" stopColor="#c99a4a" />
                  <stop offset="70%" stopColor="#c8a24b" />
                  <stop offset="100%" stopColor="#3fae7a" />
                </linearGradient>
              </defs>

              {/* Progress Arc */}
              <path
                d="M 20 90 A 70 70 0 0 1 160 90"
                fill="none"
                stroke="url(#healthSpeedometerGrad)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray="219.91"
                strokeDashoffset={dashOffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Numerical Score Center */}
            <div className="absolute bottom-1 flex flex-col items-center">
              <span className="font-mono text-4xl font-semibold tracking-tight text-foreground tabular-nums">
                {overallScore}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                out of 900
              </span>
            </div>
          </div>

          {/* Gauge Tick Labels */}
          <div className="w-full flex justify-between px-4 text-[10px] font-mono text-muted-foreground pt-3 border-t border-border/70 mt-2">
            <span className="text-[var(--negative)] font-semibold">300 (Vulnerable)</span>
            <span>600</span>
            <span className="text-[var(--positive)] font-semibold">900 (Optimal)</span>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-primary font-semibold font-mono">
            <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Better than {percentileRank}% of analyzed retail portfolios</span>
          </div>

          <p className="text-[11px] text-center text-muted-foreground mt-2 px-2 leading-relaxed font-sans">
            {ratingText}
          </p>
        </div>

        {/* 5-Sub Pillars Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pb-1 border-b border-border/70">
            <span>Diagnostic Pillar Scorecard</span>
            <span>Performance</span>
          </div>

          {subPillars.map((p) => {
            const Icon = getPillarIcon(p.name);
            const colorClass = getPillarColor(p.status);
            return (
              <div key={p.id} className="p-3.5 rounded-xl bg-[var(--background-elevated)] border border-border/70 hover:border-border-strong transition-colors">
                <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={1.75} />
                    <span className="text-foreground font-semibold">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[10px] text-muted-foreground font-sans">({p.status})</span>
                    <span className="text-xs font-bold text-foreground tabular-nums">{p.score}/{p.maxScore}</span>
                  </div>
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full h-1.5 bg-[#131316] rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${colorClass} rounded-full transition-all duration-700`}
                    style={{ width: `${(p.score / p.maxScore) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-normal">{p.insight}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Action Strip */}
      <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={1.75} />
          <span>Calculated across 8 folios and 4 direct stocks with underlying look-through disclosures.</span>
        </span>
        <Link href="/portfolio-xray" className="text-primary hover:underline font-semibold flex items-center gap-1 shrink-0">
          <span>Inspect Company Look-Through</span>
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
        </Link>
      </div>
    </div>
  );
});
