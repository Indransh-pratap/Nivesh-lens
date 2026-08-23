"use client";

import React, { useState } from "react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip 
} from "recharts";
import { 
  Layers, 
  PieChart as PieIcon, 
  Gauge, 
  Info,
  ChevronRight,
  TrendingUp,
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface AssetClassItem {
  name: string;
  value: number;
  percent: number;
  color: string;
  description: string;
}

interface SectorItem {
  name: string;
  percent: number;
  value: number;
  color: string;
  topHoldings: string[];
  riskRating: "Low" | "Moderate" | "High";
}

const ASSET_CLASSES: AssetClassItem[] = [
  { name: "Indian Equities (Direct + MFs)", value: 2728320, percent: 78.4, color: "#3b82f6", description: "Large, Mid & Small cap direct stocks & active mutual fund portfolios" },
  { name: "Fixed Income & Liquid Debt", value: 480240, percent: 13.8, color: "#64748b", description: "HDFC Corporate Bond Fund & High-yield Bank Fixed Deposits" },
  { name: "Global Tech / US Equities", value: 271440, percent: 7.8, color: "#6366f1", description: "Nasdaq 100 ETF & International Tech FoF" },
];

const SECTORS: SectorItem[] = [
  { name: "Financial Services", percent: 31.4, value: 1092720, color: "#3b82f6", topHoldings: ["HDFC Bank", "ICICI Bank", "Kotak Bank"], riskRating: "High" },
  { name: "Technology & IT", percent: 18.2, value: 633360, color: "#6366f1", topHoldings: ["Infosys", "TCS", "Persistent Systems"], riskRating: "Low" },
  { name: "Energy & Conglomerates", percent: 14.6, value: 508080, color: "#0ea5e9", topHoldings: ["Reliance Industries", "Tata Power"], riskRating: "Moderate" },
  { name: "Automotive & EV", percent: 8.5, value: 295800, color: "#f59e0b", topHoldings: ["Tata Motors", "M&M"], riskRating: "Moderate" },
  { name: "Consumer & FMCG", percent: 6.8, value: 236640, color: "#8b5cf6", topHoldings: ["ITC Ltd", "HUL"], riskRating: "Low" },
  { name: "Healthcare & Pharma", percent: 5.5, value: 191400, color: "#10b981", topHoldings: ["Sun Pharma", "Cipla"], riskRating: "Low" },
  { name: "Others & Cash", percent: 15.0, value: 522000, color: "#64748b", topHoldings: ["Fixed Deposits", "Liquid Cash"], riskRating: "Low" },
];

export function InteractiveAllocationBreakdown() {
  const [selectedSector, setSelectedSector] = useState<SectorItem>(SECTORS[0]);
  const [activeTab, setActiveTab] = useState<"asset" | "sector">("sector");

  return (
    <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 text-foreground">
      
      {/* Left: Interactive Asset & Sector Allocation */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Capital & Sector Exposure</h3>
              <p className="text-xs text-muted-foreground">True consolidated breakdown across direct stocks + hidden fund weights</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-accent/40 p-1 rounded-xl border border-border text-xs">
            <button
              onClick={() => setActiveTab("sector")}
              className={cn(
                "px-3 py-1 rounded-lg font-bold transition-all cursor-pointer",
                activeTab === "sector" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sectors (7)
            </button>
            <button
              onClick={() => setActiveTab("asset")}
              className={cn(
                "px-3 py-1 rounded-lg font-bold transition-all cursor-pointer",
                activeTab === "asset" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Asset Classes (3)
            </button>
          </div>
        </div>

        {activeTab === "sector" ? (
          <div className="space-y-4">
            {/* Sector Progress Bar Stack */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-[var(--background-elevated)] border border-border">
              {SECTORS.map((sec) => (
                <div
                  key={sec.name}
                  style={{ width: `${sec.percent}%`, backgroundColor: sec.color }}
                  title={`${sec.name}: ${sec.percent}%`}
                  className="h-full cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedSector(sec)}
                />
              ))}
            </div>

            {/* Clickable Sector Grid */}
            <div className="grid sm:grid-cols-2 gap-2.5 pt-1">
              {SECTORS.map((sec) => {
                const isSelected = selectedSector.name === sec.name;
                return (
                  <div
                    key={sec.name}
                    onClick={() => setSelectedSector(sec)}
                    className={cn(
                      "p-3 rounded-xl border transition-all cursor-pointer text-xs flex items-center justify-between",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/70 bg-[var(--background-elevated)] hover:border-border-strong hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sec.color }} />
                      <div>
                        <span className="font-semibold text-foreground block">{sec.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ₹{(sec.value / 100000).toFixed(2)}L
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="font-bold text-foreground text-xs tabular-nums">{sec.percent}%</span>
                      <span className={cn(
                        "block text-[9px] font-sans font-semibold",
                        sec.riskRating === "High" ? "text-[var(--negative)]" : "text-muted-foreground"
                      )}>
                        {sec.riskRating} Risk
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sector Deep Dive Card */}
            <div className="p-4 rounded-xl bg-[var(--background-elevated)] border border-border/80 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/70">
                <span className="font-bold text-foreground flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedSector.color }} />
                  {selectedSector.name} Deep Dive
                </span>
                <span className="font-mono font-bold text-primary tabular-nums text-xs">
                  {selectedSector.percent}% of Net Worth (₹{(selectedSector.value / 100000).toFixed(2)}L)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Major stocks contributing to this sector in your portfolio:
              </p>
              <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                {selectedSector.topHoldings.map((h) => (
                  <span key={h} className="px-2.5 py-1 rounded-lg bg-[var(--card)] border border-border font-medium text-foreground">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3">
              {ASSET_CLASSES.map((ac) => (
                <div key={ac.name} className="p-4 rounded-xl bg-[var(--background-elevated)] border border-border/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ac.color }} />
                      <span className="font-bold text-foreground text-sm">{ac.name}</span>
                    </div>
                    <span className="font-mono font-bold text-foreground text-sm tabular-nums">
                      ₹{(ac.value / 100000).toFixed(2)}L ({ac.percent}%)
                    </span>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">{ac.description}</p>
                  <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${ac.percent}%`, backgroundColor: ac.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Indian Market Mood Index (Fear & Greed) */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[var(--nse-gold-soft)] text-[var(--nse-gold)] border border-[var(--nse-gold)]/30 flex items-center justify-center font-bold">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Market Mood Index</h3>
                <p className="text-xs text-muted-foreground font-mono">NSE / Indian Equities Sentiment</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[var(--positive-soft)] text-[var(--positive)] border border-[var(--positive)]/30 text-xs font-bold font-mono">
              GREED (68)
            </span>
          </div>

          {/* Sentiment Visual Gauge */}
          <div className="pt-6 pb-4 text-center space-y-2">
            <div className="relative inline-block">
              <span className="text-5xl font-extrabold font-mono text-[var(--positive)] tracking-tight tabular-nums">
                68
              </span>
              <span className="text-xs text-muted-foreground font-mono block">out of 100</span>
            </div>

            <div className="w-full h-3 rounded-full bg-accent/40 border border-border overflow-hidden relative mt-4">
              <div 
                className="h-full bg-gradient-to-r from-[var(--negative)] via-[var(--warning)] to-[var(--positive)] rounded-full"
                style={{ width: "100%" }}
              />
              {/* Pointer indicator */}
              <div 
                className="absolute top-0 bottom-0 w-2 bg-white shadow-md rounded-full -ml-1"
                style={{ left: "68%" }}
              />
            </div>

            <div className="flex justify-between text-[10px] font-mono text-muted-foreground pt-1">
              <span>0 (Extreme Fear)</span>
              <span>50 (Neutral)</span>
              <span>100 (Extreme Greed)</span>
            </div>
          </div>

          {/* Key Implications for Indian Retail Investors */}
          <div className="p-4 rounded-xl bg-accent/40 border border-border space-y-2 text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5 text-[11.5px]">
              <Info className="w-3.5 h-3.5 text-primary" />
              Portfolio Action Strategy:
            </span>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">
              When market mood is in <strong className="text-foreground">Greed</strong>, avoid aggressive lump sum top-ups in high-beta small cap funds. Continue scheduled SIPs and utilize Nivesh Lens to trim over-concentrated direct stocks.
            </p>
          </div>
        </div>

        {/* Bottom Fast Action */}
        <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>Updated: Today 15:30 IST</span>
          <Link 
            href="/sip-health"
            className="text-primary font-bold hover:underline cursor-pointer flex items-center gap-0.5 transition-colors"
          >
            <span>Audit SIP Health</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

    </div>
  );
}
