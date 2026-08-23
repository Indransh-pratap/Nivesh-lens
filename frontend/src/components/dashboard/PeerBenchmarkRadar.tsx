"use client";

import React from "react";
import { 
  Award
} from "lucide-react";
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer, 
  Tooltip 
} from "recharts";
import { MOCK_PEER_BENCHMARKS } from "@/data/mock/portfolioData";

export function PeerBenchmarkRadar() {
  const radarData = [
    { subject: "3Y CAGR", portfolio: 82, average: 60, top10: 95 },
    { subject: "Health Rating", portfolio: 84, average: 65, top10: 92 },
    { subject: "Sharpe Ratio", portfolio: 78, average: 52, top10: 88 },
    { subject: "Low Fee %", portfolio: 64, average: 48, top10: 90 },
    { subject: "Diversification", portfolio: 88, average: 58, top10: 96 }
  ];

  return (
    <div className="rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Peer Baseline Benchmarking</h3>
            <p className="text-xs text-muted-foreground">Comparison against 50,000+ Indian retail portfolios & top decile wealth builders</p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl border border-[var(--positive)]/20 bg-[var(--positive)]/10 text-[var(--positive)] text-xs font-semibold font-mono tabular-nums">
          Top 18% of Retail Investors
        </div>
      </div>

      {/* Main Grid: Radar Chart + Metric Breakdown */}
      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-6 mt-6 items-center">
        
        {/* Radar Chart */}
        <div className="h-64 w-full p-2 bg-[var(--background-elevated)] rounded-2xl border border-border/70 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1d1d22" />
              <PolarAngleAxis dataKey="subject" stroke="#6f6d73" fontSize={11} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="transparent" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "var(--background-elevated)", 
                  borderColor: "rgba(255,255,255,0.1)", 
                  borderRadius: "12px", 
                  fontSize: "11px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)"
                }}
              />
              <Radar name="Your Portfolio" dataKey="portfolio" stroke="#c8a24b" fill="#c8a24b" fillOpacity={0.35} />
              <Radar name="Average Retail" dataKey="average" stroke="#c99a4a" fill="#c99a4a" fillOpacity={0.12} />
              <Radar name="Top 10% Wealth" dataKey="top10" stroke="#3fae7a" fill="#3fae7a" fillOpacity={0.12} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison Table */}
        <div className="space-y-2.5 text-xs font-mono">
          <div className="grid grid-cols-4 text-[10px] uppercase font-bold text-muted-foreground pb-2 border-b border-border/70 font-sans tracking-wider">
            <span>Diagnostic Factor</span>
            <span className="text-primary font-bold text-right">You</span>
            <span className="text-right">Avg Retail</span>
            <span className="text-[var(--positive)] text-right">Top 10%</span>
          </div>

          {MOCK_PEER_BENCHMARKS.map((b) => (
            <div key={b.category} className="grid grid-cols-4 py-2 border-b border-border/50 items-center">
              <span className="font-sans font-semibold text-foreground truncate pr-2">{b.category}</span>
              <span className="text-primary font-semibold text-right tabular-nums">{b.portfolio} {b.unit}</span>
              <span className="text-muted-foreground text-right tabular-nums">{b.average} {b.unit}</span>
              <span className="text-[var(--positive)] font-bold text-right tabular-nums">{b.top10Percent} {b.unit}</span>
            </div>
          ))}

          <div className="pt-3 flex justify-between items-center text-[11px] font-sans text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> Your Portfolio</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--warning)]" /> Avg Retail</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--positive)]" /> Top 10%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
