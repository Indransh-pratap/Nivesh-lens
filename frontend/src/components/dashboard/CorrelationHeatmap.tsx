"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Activity, 
  Info
} from "lucide-react";
import { 
  MOCK_CORRELATION_FUNDS, 
  MOCK_CORRELATION_MATRIX 
} from "@/data/mock/portfolioData";
import { InsightFlag } from "@/components/ui/InsightFlag";

export function CorrelationHeatmap() {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number; val: number } | null>(null);
  const router = useRouter();

  const handleFix = () => {
    router.push("/exposure");
  };

  // Monochromatic Sequential Opacity Matrix based on Brand Accent
  const getHeatmapColor = (val: number) => {
    if (val === 1.0) return "bg-primary text-white font-bold border border-primary/40";
    if (val >= 0.80) return "bg-primary/70 text-white font-semibold border border-primary/30"; // Strong co-movement
    if (val >= 0.65) return "bg-primary/40 text-[var(--info)] font-medium border border-primary/20";
    if (val >= 0.45) return "bg-primary/20 text-[var(--info)] font-normal border border-primary/10";
    return "bg-primary/8 text-slate-400 font-normal border border-border/50";
  };

  return (
    <div className="rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">NAV Correlation Matrix (mfapi.in Engine)</h3>
            <p className="text-xs text-muted-foreground">Checks daily co-movement to identify overlapping holdings that pretend to be different</p>
          </div>
        </div>

        {/* Monochromatic Sequential Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground bg-[var(--background-elevated)] px-3 py-1.5 rounded-xl border border-border/70">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-primary/10 border border-primary/20" /> &lt;0.45 (Low)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-primary/40" /> 0.45-0.75</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-primary/80" /> &gt;0.80 (Overlap)</span>
        </div>
      </div>

      {/* Main Grid & Analysis */}
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 mt-6 items-center">
        
        {/* Heatmap Grid */}
        <div className="overflow-x-auto p-4 rounded-2xl bg-[var(--background-elevated)] border border-border/70">
          <table className="w-full text-center text-xs font-mono border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left text-[10px] text-muted-foreground font-sans uppercase font-bold tracking-wider">Scheme / Asset</th>
                {MOCK_CORRELATION_FUNDS.map((f, i) => (
                  <th key={i} className="p-2 text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                    {f.split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_CORRELATION_FUNDS.map((rowName, r) => (
                <tr key={r}>
                  <td className="p-2 text-left font-sans text-xs font-semibold text-foreground whitespace-nowrap">
                    {rowName}
                  </td>
                  {MOCK_CORRELATION_MATRIX[r].map((val, c) => (
                    <td key={c} className="p-1">
                      <div 
                        onMouseEnter={() => setHoveredCell({ row: r, col: c, val })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`h-9 w-12 rounded-lg flex items-center justify-center text-[11px] tabular-nums transition-all duration-150 cursor-pointer hover:scale-105 select-none ${getHeatmapColor(val)}`}
                      >
                        {val.toFixed(2)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Clone Alert Cards & Diagnostics */}
        <div className="space-y-3 font-sans">
          <InsightFlag
            severity="danger"
            headline="Overlap alert — 0.89 co-movement between two holdings"
            why="ICICI Bluechip and HDFC Bank Direct Stock move in virtual lockstep. Holding both feels like diversification, but adds zero protection since they'll rise and fall together."
            fixLabel="Consider trimming one of the two"
            onFix={handleFix}
          />

          <div className="p-4 rounded-xl bg-[var(--background-elevated)] border border-border/70 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Info className="w-4 h-4 text-primary" strokeWidth={1.75} />
              <span>Optimal Diversifier:</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Nippon Small Cap Fund</strong> has the lowest co-movement (0.35 - 0.42) against your large caps, offering genuine non-correlated alpha.
            </p>
          </div>

          {hoveredCell && (
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-mono animate-in fade-in">
              <span>{MOCK_CORRELATION_FUNDS[hoveredCell.row]} × {MOCK_CORRELATION_FUNDS[hoveredCell.col]}</span>
              <p className="font-bold text-foreground mt-0.5 font-sans">
                Co-movement factor: <span className="font-mono tabular-nums">{hoveredCell.val.toFixed(2)}</span> ({hoveredCell.val > 0.8 ? "Highly Redundant" : "Healthy Spread"})
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
