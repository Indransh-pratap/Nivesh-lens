"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  X, 
  BarChart3, 
  Layers, 
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";

export interface MarketIndexItem {
  id: string;
  name: string;
  exchange: "NSE" | "BSE";
  value: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  yearHigh: number;
  yearLow: number;
  topConstituents: { name: string; weight: string; change: number }[];
  sparkline: number[];
}

const INITIAL_INDICES: MarketIndexItem[] = [
  {
    id: "nifty50",
    name: "NIFTY 50",
    exchange: "NSE",
    value: 24852.15,
    change: 112.40,
    changePercent: 0.45,
    dayHigh: 24890.30,
    dayLow: 24740.10,
    yearHigh: 26277.35,
    yearLow: 21281.45,
    topConstituents: [
      { name: "HDFC Bank", weight: "11.6%", change: 0.85 },
      { name: "Reliance Ind.", weight: "9.2%", change: 0.42 },
      { name: "ICICI Bank", weight: "7.8%", change: 1.15 },
      { name: "Infosys", weight: "5.9%", change: 1.45 },
      { name: "ITC Ltd.", weight: "4.1%", change: -0.30 }
    ],
    sparkline: [24750, 24780, 24760, 24810, 24830, 24810, 24852]
  },
  {
    id: "sensex",
    name: "SENSEX",
    exchange: "BSE",
    value: 81385.60,
    change: 420.15,
    changePercent: 0.52,
    dayHigh: 81520.40,
    dayLow: 80980.20,
    yearHigh: 85978.25,
    yearLow: 70319.04,
    topConstituents: [
      { name: "HDFC Bank", weight: "13.4%", change: 0.85 },
      { name: "Reliance Ind.", weight: "10.5%", change: 0.42 },
      { name: "ICICI Bank", weight: "8.9%", change: 1.15 },
      { name: "TCS", weight: "5.1%", change: 0.65 }
    ],
    sparkline: [81000, 81120, 81050, 81240, 81310, 81385]
  },
  {
    id: "banknifty",
    name: "BANK NIFTY",
    exchange: "NSE",
    value: 53210.80,
    change: -78.40,
    changePercent: -0.15,
    dayHigh: 53450.00,
    dayLow: 53080.50,
    yearHigh: 54467.35,
    yearLow: 44429.10,
    topConstituents: [
      { name: "HDFC Bank", weight: "27.5%", change: 0.85 },
      { name: "ICICI Bank", weight: "23.1%", change: 1.15 },
      { name: "Axis Bank", weight: "11.2%", change: -1.25 },
      { name: "SBI", weight: "9.8%", change: -0.75 }
    ],
    sparkline: [53350, 53280, 53400, 53220, 53180, 53210]
  },
  {
    id: "niftyit",
    name: "NIFTY IT",
    exchange: "NSE",
    value: 42150.30,
    change: 390.60,
    changePercent: 0.94,
    dayHigh: 42280.90,
    dayLow: 41820.40,
    yearHigh: 44250.00,
    yearLow: 32500.00,
    topConstituents: [
      { name: "Infosys", weight: "28.5%", change: 1.45 },
      { name: "TCS", weight: "24.2%", change: 0.65 },
      { name: "HCL Tech", weight: "12.3%", change: 1.10 },
      { name: "Wipro", weight: "8.1%", change: 0.40 }
    ],
    sparkline: [41800, 41920, 41890, 42050, 42100, 42150]
  },
  {
    id: "midcap100",
    name: "NIFTY MIDCAP 100",
    exchange: "NSE",
    value: 58420.50,
    change: 280.10,
    changePercent: 0.48,
    dayHigh: 58550.00,
    dayLow: 58110.00,
    yearHigh: 60250.00,
    yearLow: 41100.00,
    topConstituents: [
      { name: "Persistent Sys", weight: "3.8%", change: 2.10 },
      { name: "Federal Bank", weight: "3.2%", change: 0.95 },
      { name: "Polycab India", weight: "2.9%", change: 1.40 }
    ],
    sparkline: [58150, 58240, 58300, 58380, 58420]
  },
  {
    id: "vix",
    name: "INDIA VIX",
    exchange: "NSE",
    value: 13.15,
    change: -0.35,
    changePercent: -2.59,
    dayHigh: 13.80,
    dayLow: 12.95,
    yearHigh: 24.50,
    yearLow: 9.85,
    topConstituents: [],
    sparkline: [13.6, 13.5, 13.4, 13.2, 13.15]
  }
];

export function MarketTickerBar() {
  const [indices, setIndices] = useState<MarketIndexItem[]>(INITIAL_INDICES);
  const [selectedIdx, setSelectedIdx] = useState<MarketIndexItem | null>(null);
  const [tickingId, setTickingId] = useState<string | null>(null);

  // Live market tick simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const targetIndex = Math.floor(Math.random() * (indices.length - 1));
      const delta = (Math.random() - 0.48) * 4.5;
      
      setIndices((prev) => {
        const next = [...prev];
        const item = next[targetIndex];
        const newValue = Number((item.value + delta).toFixed(2));
        const newChange = Number((item.change + delta).toFixed(2));
        const newChangePct = Number(((newChange / (newValue - newChange)) * 100).toFixed(2));
        
        next[targetIndex] = {
          ...item,
          value: newValue,
          change: newChange,
          changePercent: newChangePct
        };
        return next;
      });

      setTickingId(indices[targetIndex].id);
      setTimeout(() => setTickingId(null), 900);
    }, 3800);

    return () => clearInterval(interval);
  }, [indices]);

  return (
    <>
      <div className="w-full bg-[var(--background-elevated)] border-b border-border/80 text-foreground text-xs select-none">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 flex items-center justify-between h-9 overflow-hidden">
          
          {/* Left: Market Status Pulse */}
          <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-border/70">
            <div className="relative flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-[var(--positive)]" />
              <span className="absolute w-3.5 h-3.5 rounded-full bg-[var(--positive)]/40 animate-radar" />
            </div>
            <span className="text-[11px] font-semibold text-foreground tracking-tight hidden sm:inline">
              NSE/BSE LIVE
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums hidden lg:inline">
              09:15 - 15:30 IST
            </span>
          </div>

          {/* Center: Live Ticker Items */}
          <div className="flex items-center gap-5 overflow-x-auto no-scrollbar py-1 px-3 flex-1">
            {indices.map((idx) => {
              const isPositive = idx.change >= 0;
              const isTicking = tickingId === idx.id;

              return (
                <button
                  key={idx.id}
                  onClick={() => setSelectedIdx(idx)}
                  className={cn(
                    "flex items-center gap-2 hover:bg-accent/80 px-2 py-0.5 rounded-md transition-all duration-150 cursor-pointer shrink-0 group text-left",
                    isTicking && (isPositive ? "bg-[var(--positive-soft)]" : "bg-[var(--negative-soft)]")
                  )}
                >
                  <span className="text-[11.5px] font-medium text-foreground group-hover:text-primary transition-colors">
                    {idx.name}
                  </span>
                  
                  <span className="font-mono text-[11.5px] font-semibold tabular-nums text-foreground">
                    {idx.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>

                  <span
                    className={cn(
                      "font-mono text-[10.5px] font-medium tabular-nums flex items-center gap-0.5 px-1 rounded",
                      isPositive 
                        ? "text-[var(--positive)] bg-[var(--positive-soft)]" 
                        : "text-[var(--negative)] bg-[var(--negative-soft)]"
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-2.5 h-2.5" strokeWidth={2.5} />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5" strokeWidth={2.5} />
                    )}
                    {isPositive ? "+" : ""}{idx.changePercent.toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Quick Insights Action */}
          <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-border/70 shrink-0">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[var(--warning)]" strokeWidth={2} />
              <span>GIFT NIFTY: <strong className="text-foreground font-mono">24,910 (+0.58%)</strong></span>
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Index Detail Modal */}
      {selectedIdx && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-up">
          <div 
            className="w-full max-w-lg bg-[var(--card)] border border-border rounded-2xl p-6 shadow-2xl space-y-5 text-foreground relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
                  <BarChart3 className="w-5 h-5" strokeWidth={2} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">{selectedIdx.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-accent text-primary font-mono font-bold">
                      {selectedIdx.exchange}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">Benchmark Index Overview</p>
                </div>
              </div>

              <IconButton
                onClick={() => setSelectedIdx(null)}
                aria-label="Close index details"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </IconButton>
            </div>

            {/* Current Price & Day Range */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--background-elevated)] border border-border">
              <div>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">Index Value</span>
                <span className="text-2xl font-bold font-mono text-foreground mt-0.5 block tabular-nums">
                  ₹{selectedIdx.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <span className={cn(
                  "text-xs font-semibold font-mono tabular-nums flex items-center gap-1 mt-1",
                  selectedIdx.change >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                )}>
                  {selectedIdx.change >= 0 ? "+" : ""}{selectedIdx.change.toFixed(2)} ({selectedIdx.change >= 0 ? "+" : ""}{selectedIdx.changePercent.toFixed(2)}%) Today
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Day's Low: ₹{selectedIdx.dayLow.toLocaleString("en-IN")}</span>
                    <span>High: ₹{selectedIdx.dayHigh.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="w-full h-1.5 bg-border rounded-full overflow-hidden mt-1">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ 
                        width: `${Math.min(100, Math.max(10, ((selectedIdx.value - selectedIdx.dayLow) / (selectedIdx.dayHigh - selectedIdx.dayLow)) * 100))}%` 
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>52W L: ₹{selectedIdx.yearLow.toLocaleString("en-IN")}</span>
                    <span>52W H: ₹{selectedIdx.yearHigh.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="w-full h-1.5 bg-border rounded-full overflow-hidden mt-1">
                    <div 
                      className="h-full bg-[var(--warning)] rounded-full"
                      style={{ 
                        width: `${Math.min(100, Math.max(10, ((selectedIdx.value - selectedIdx.yearLow) / (selectedIdx.yearHigh - selectedIdx.yearLow)) * 100))}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Constituents */}
            {selectedIdx.topConstituents.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
                    Top Index Weights & Movers
                  </span>
                  <span>Weight · Change</span>
                </div>

                <div className="space-y-1.5">
                  {selectedIdx.topConstituents.map((stock) => (
                    <div
                      key={stock.name}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--background-elevated)] border border-border/70 text-xs"
                    >
                      <span className="font-medium text-foreground">{stock.name}</span>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-muted-foreground">{stock.weight}</span>
                        <span className={cn(
                          "font-semibold tabular-nums",
                          stock.change >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                        )}>
                          {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer Note */}
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" strokeWidth={2} />
              <span>Nivesh Lens uses AMFI & NSE feeds to benchmark your portfolio true returns against {selectedIdx.name}.</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
