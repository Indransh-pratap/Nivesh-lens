"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  ShieldCheck, 
  Info, 
  Layers, 
  PieChart, 
  Coins, 
  Activity,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { usePortfolioStore } from "@/store/portfolioStore";
import { DiagnosticsResponse } from "@/types";

export function HealthScoreGauge() {
  const { 
    getDiversificationScore, 
    getWhatIfDiversificationScore, 
    isWhatIfActive 
  } = usePortfolioStore();

  const [diagnostics, setDiagnostics] = useState<DiagnosticsResponse | null>(null);

  useEffect(() => {
    const fetchDiagnostics = async () => {
      const activeId = typeof window !== "undefined" ? localStorage.getItem("nivesh_active_portfolio_id") : null;
      if (!activeId) return;
      try {
        const res = await fetch(`/api/portfolio/portfolios/${activeId}/diagnostics`);
        if (res.ok) {
          const data = await res.json();
          setDiagnostics(data);
        }
      } catch (err) {
        console.error("Failed to fetch diagnostics:", err);
      }
    };

    fetchDiagnostics();
    const handleUpdate = () => { fetchDiagnostics(); };
    window.addEventListener("nivesh_portfolio_updated", handleUpdate);
    return () => window.removeEventListener("nivesh_portfolio_updated", handleUpdate);
  }, []);

  const score = isWhatIfActive 
    ? getWhatIfDiversificationScore() 
    : (diagnostics?.diversification_score?.score ?? getDiversificationScore());
  
  const { dashOffset, rating } = useMemo(() => {
    const minScore = 300;
    const maxScore = 900;
    const clamped = Math.min(Math.max(score, minScore), maxScore);
    const pct = (clamped - minScore) / (maxScore - minScore);
    const arcLength = 251.2;
    const offset = arcLength - (pct * arcLength);

    const getScoreRating = (val: number) => {
      if (val >= 800) return { label: "Prime Diversified", color: "text-[var(--positive)]", bg: "bg-[var(--positive)]/10 border-[var(--positive)]/20", text: "Optimal risk-return efficiency across sectors and asset classes." };
      if (val >= 700) return { label: "Healthy Portfolio", color: "text-[var(--info)]", bg: "bg-[var(--info)]/10 border-[var(--info)]/20", text: "Strong foundation with minor single-stock concentration alerts." };
      if (val >= 550) return { label: "Moderate Risk", color: "text-[var(--warning)]", bg: "bg-[var(--warning)]/10 border-[var(--warning)]/20", text: "Significant stock overlap and regular fund fee bleed detected." };
      return { label: "High Vulnerability", color: "text-[var(--negative)]", bg: "bg-[var(--negative)]/10 border-[var(--negative)]/20", text: "Excessive single-company concentration and missing nominee safeguards." };
    };

    return {
      dashOffset: offset,
      rating: getScoreRating(score)
    };
  }, [score]);

  const p = diagnostics?.diversification_score?.pillars;

  const pillars = [
    { 
      name: "Asset Class Spread", 
      score: p ? Math.round(p.asset_spread.score) : 88, 
      max: 100, 
      icon: PieChart, 
      note: p ? p.asset_spread.note : "Well balanced Equity, Debt FD, and Global Tech.", 
      status: p ? p.asset_spread.status : "Optimal", 
      color: "bg-[var(--positive)]" 
    },
    { 
      name: "Single-Company Exposure", 
      score: isWhatIfActive ? 82 : (p ? Math.round(p.single_company_exposure.score) : 64), 
      max: 100, 
      icon: Layers, 
      note: isWhatIfActive ? "Overlaps trimmed via simulator." : (p ? p.single_company_exposure.note : "Single company exposure evaluated across direct and indirect holdings."), 
      status: isWhatIfActive ? "Improved" : (p ? p.single_company_exposure.status : "Alert"), 
      color: isWhatIfActive ? "bg-[var(--positive)]" : (p && p.single_company_exposure.score < 60 ? "bg-[var(--negative)]" : "bg-[var(--warning)]") 
    },
    { 
      name: "Scheme Overlap & TER", 
      score: isWhatIfActive ? 90 : (p ? Math.round(p.scheme_overlap_ter.score) : 68), 
      max: 100, 
      icon: Coins, 
      note: isWhatIfActive ? "Saved duplicate TER fees." : (p ? p.scheme_overlap_ter.note : "Regular plan and duplicate fee analysis."), 
      status: isWhatIfActive ? "Optimal" : (p ? p.scheme_overlap_ter.status : "Moderate"), 
      color: isWhatIfActive ? "bg-[var(--positive)]" : (p && p.scheme_overlap_ter.score < 60 ? "bg-[var(--negative)]" : "bg-[var(--info)]") 
    },
    { 
      name: "Nominee Compliance", 
      score: p ? Math.round(p.nominee_compliance.score) : 62, 
      max: 100, 
      icon: ShieldCheck, 
      note: p ? p.nominee_compliance.note : "Legal nominee safeguard check across registered folios.", 
      status: p ? p.nominee_compliance.status : "Action Req.", 
      color: p && p.nominee_compliance.score >= 80 ? "bg-[var(--positive)]" : "bg-[var(--negative)]" 
    }
  ];

  return (
    <div className="rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>Diversification Health Rating</span>
              {isWhatIfActive && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[var(--positive)]/10 text-[var(--positive)] border border-[var(--positive)]/20">
                  What-If Active (+65 pts)
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">Institutional FinTech Health Score (300 - 900 Scale)</p>
          </div>
        </div>

        <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 self-start sm:self-auto ${rating.bg} ${rating.color}`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span>{rating.label}</span>
        </div>
      </div>

      {/* Main Gauge & Breakdown Grid */}
      <div className="grid lg:grid-cols-[1.1fr_1.3fr] gap-8 mt-6 items-center">
        
        {/* Speedometer Gauge Visualizer */}
        <div className="flex flex-col items-center justify-center p-6 bg-[var(--background-elevated)] rounded-2xl border border-border/70 relative">
          
          {/* Gauge SVG Arc */}
          <div className="relative w-64 h-36 flex items-end justify-center overflow-hidden">
            <svg viewBox="0 0 200 110" className="w-full h-full">
              {/* Background track */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="14"
                strokeLinecap="round"
                className="text-white/[0.08]"
              />
              {/* Gradient Arc */}
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e2685f" />
                  <stop offset="40%" stopColor="#c99a4a" />
                  <stop offset="75%" stopColor="#c8a24b" />
                  <stop offset="100%" stopColor="#3fae7a" />
                </linearGradient>
              </defs>
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray="251.2"
                strokeDashoffset={dashOffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Score Center Value Display */}
            <div className="absolute bottom-1 flex flex-col items-center">
              <span className="font-mono text-4xl font-semibold tracking-tight text-foreground tabular-nums">
                {score}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                out of 900
              </span>
            </div>
          </div>

          {/* Scale Labels */}
          <div className="w-full flex justify-between px-4 text-[10px] font-mono text-muted-foreground pt-3 border-t border-border/70 mt-2">
            <span className="text-[var(--negative)] font-semibold">300 (Risk)</span>
            <span>600</span>
            <span className="text-[var(--positive)] font-semibold">900 (Optimal)</span>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-3 px-4 leading-relaxed">
            {rating.text}
          </p>
        </div>

        {/* 5-Pillar Score Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pb-1 border-b border-border/70">
            <span>Core Diagnostic Pillars</span>
            <span>Impact Score</span>
          </div>

          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.name} className="p-3.5 rounded-xl bg-[var(--background-elevated)] border border-border/70 hover:border-border-strong transition-colors">
                <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={1.75} />
                    <span className="text-foreground font-semibold">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[10px] text-muted-foreground font-sans">({p.status})</span>
                    <span className="text-xs font-bold text-foreground tabular-nums">{p.score} / {p.max}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-[#131316] rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${p.color} rounded-full transition-all duration-700`}
                    style={{ width: `${(p.score / p.max) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{p.note}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Action Footer */}
      <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
          <span>Swapping overlapping funds or converting Regular plans can boost score by +65 to +120 points.</span>
        </div>
        <Link href="/simulator" className="text-primary hover:underline font-semibold flex items-center gap-1 shrink-0">
          <span>Launch Fund Swap Engine</span>
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
        </Link>
      </div>
    </div>
  );
}
