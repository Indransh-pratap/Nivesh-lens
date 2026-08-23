"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  Search, 
  Info,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Flame
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { cn } from "@/lib/utils";

interface OverlapSearchItem {
  id: string;
  name: string;
  type: "Mutual Fund" | "Stock" | "IPO" | "NFO";
  category: string;
  currentPriceOrNAV: string;
  overlapPercent: number;
  verdict: "Safe to Buy (Low Overlap)" | "Moderate Overlap (Proceed with Caution)" | "High Risk (Severe Duplication)";
  overlappingHoldings: { holdingName: string; viaFund: string; existingExposurePercent: number }[];
  rationale: string;
  projectedWeightIncrease: string;
}

const EXTENDED_OVERLAP_DATABASE: OverlapSearchItem[] = [
  {
    id: "item_ppfc",
    name: "Parag Parikh Flexi Cap Fund",
    type: "Mutual Fund",
    category: "Flexi Cap Equity",
    currentPriceOrNAV: "NAV: ₹78.45",
    overlapPercent: 38.5,
    verdict: "Moderate Overlap (Proceed with Caution)",
    overlappingHoldings: [
      { holdingName: "HDFC Bank Ltd.", viaFund: "Direct Equity + Mirae Large Cap", existingExposurePercent: 15.87 },
      { holdingName: "ITC Ltd.", viaFund: "Direct Equity", existingExposurePercent: 4.2 },
      { holdingName: "Bajaj Holdings", viaFund: "PPFC Underlying", existingExposurePercent: 3.1 }
    ],
    rationale: "You already hold 15.87% in HDFC Bank. Adding Parag Parikh Flexi Cap will increase your total HDFC Bank concentration to ~18.4%, slightly above the recommended single-stock ceiling.",
    projectedWeightIncrease: "+2.53% added to HDFC Bank"
  },
  {
    id: "item_quant_small",
    name: "Quant Small Cap Fund",
    type: "Mutual Fund",
    category: "Small Cap Equity",
    currentPriceOrNAV: "NAV: ₹245.10",
    overlapPercent: 8.2,
    verdict: "Safe to Buy (Low Overlap)",
    overlappingHoldings: [
      { holdingName: "Reliance Industries", viaFund: "Direct Stock", existingExposurePercent: 14.64 },
      { holdingName: "Bikaji Foods", viaFund: "Quant Small Cap", existingExposurePercent: 2.1 }
    ],
    rationale: "Minimal 8.2% overlap with your existing large-cap centric portfolio. Adding this fund will introduce fresh small-cap alpha without duplicating your existing bluechip holdings.",
    projectedWeightIncrease: "High diversification bonus"
  },
  {
    id: "item_tatamotors",
    name: "Tata Motors Ltd.",
    type: "Stock",
    category: "Automotive & EV",
    currentPriceOrNAV: "LTP: ₹1,085.40",
    overlapPercent: 6.8,
    verdict: "Safe to Buy (Low Overlap)",
    overlappingHoldings: [
      { holdingName: "Tata Motors (Indirect)", viaFund: "Mirae Asset Large Cap", existingExposurePercent: 2.3 },
      { holdingName: "Tata Group Overall", viaFund: "HDFC Flexi Cap", existingExposurePercent: 4.5 }
    ],
    rationale: "Direct stock purchase adds distinct automotive exposure. Total Tata Group rollup remains safe at ~9.6% of overall capital.",
    projectedWeightIncrease: "+3.0% added to Auto sector"
  },
  {
    id: "item_hdfc_top100",
    name: "HDFC Top 100 Fund",
    type: "Mutual Fund",
    category: "Large Cap",
    currentPriceOrNAV: "NAV: ₹1,120.30",
    overlapPercent: 64.2,
    verdict: "High Risk (Severe Duplication)",
    overlappingHoldings: [
      { holdingName: "HDFC Bank Ltd.", viaFund: "Direct + 3 other MFs", existingExposurePercent: 15.87 },
      { holdingName: "Reliance Industries", viaFund: "Direct + 2 other MFs", existingExposurePercent: 14.64 },
      { holdingName: "ICICI Bank", viaFund: "Direct Stock", existingExposurePercent: 7.8 }
    ],
    rationale: "CRITICAL OVERLAP: 64.2% of this fund's top 10 holdings are already in your portfolio. You are essentially paying an extra 0.85% expense ratio to rebuy stocks you already own directly!",
    projectedWeightIncrease: "Extreme double-dipping alert"
  },
  {
    id: "item_swiggy",
    name: "Swiggy Ltd. IPO",
    type: "IPO",
    category: "Consumer Tech",
    currentPriceOrNAV: "Band: ₹371 - ₹390",
    overlapPercent: 14.5,
    verdict: "Moderate Overlap (Proceed with Caution)",
    overlappingHoldings: [
      { holdingName: "Prosus NV / Naspers", viaFund: "Global Tech ETF", existingExposurePercent: 4.8 },
      { holdingName: "Zomato Ltd.", viaFund: "Direct Stock", existingExposurePercent: 3.2 }
    ],
    rationale: "You hold direct Zomato equity (3.2%) and indirect Prosus exposure. Adding Swiggy increases your quick-commerce sector bet to ~8.0% of total equity allocation.",
    projectedWeightIncrease: "+3.5% in Quick-Commerce"
  },
  {
    id: "item_motilal_mid",
    name: "Motilal Oswal Midcap Fund",
    type: "Mutual Fund",
    category: "Mid Cap Equity",
    currentPriceOrNAV: "NAV: ₹98.20",
    overlapPercent: 12.0,
    verdict: "Safe to Buy (Low Overlap)",
    overlappingHoldings: [
      { holdingName: "Persistent Systems", viaFund: "Direct Stock", existingExposurePercent: 3.8 },
      { holdingName: "Kalyan Jewellers", viaFund: "Motilal Underlying", existingExposurePercent: 2.4 }
    ],
    rationale: "High mid-cap uniqueness (88% distinct holdings). Recommended for retail investors looking to expand beyond large-cap banking concentration.",
    projectedWeightIncrease: "Optimal mid-cap diversification"
  }
];

export function PreBuyOverlapGuard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("item_hdfc_top100");
  const [filterType, setFilterType] = useState<"All" | "Mutual Fund" | "Stock" | "IPO">("All");

  const filteredList = EXTENDED_OVERLAP_DATABASE.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = filterType === "All" || item.type === filterType;
    return matchSearch && matchFilter;
  });

  const selectedItem = EXTENDED_OVERLAP_DATABASE.find(i => i.id === selectedId) || EXTENDED_OVERLAP_DATABASE[0];

  const getVerdictStyle = (verdict: string) => {
    if (verdict.includes("High Risk")) return "bg-[var(--negative-soft)] text-[var(--negative)] border-[var(--negative)]/30";
    if (verdict.includes("Moderate")) return "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning)]/30";
    return "bg-[var(--positive-soft)] text-[var(--positive)] border-[var(--positive)]/30";
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-md text-foreground relative overflow-hidden space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">&ldquo;Pre-Buy&rdquo; Overlap & Double-Dipping Guard</h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold border border-primary/20">
                GROWW & ZERODHA RADAR
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Simulate any Indian stock, mutual fund or IPO before buying to prevent duplicate concentration
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stock, fund (e.g. Parag Parikh, HDFC)..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary outline-none transition-colors"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {(["All", "Mutual Fund", "Stock", "IPO"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
              filterType === t
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-accent/40 border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "All" ? "All Instruments" : t === "Mutual Fund" ? "Mutual Funds" : t === "Stock" ? "Direct Equities" : "IPOs & NFOs"}
          </button>
        ))}
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-6">
        
        {/* Instrument Selection List */}
        <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
          {filteredList.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer space-y-2",
                  isSelected 
                    ? "border-primary bg-primary/10 shadow-sm" 
                    : "border-border/70 bg-[var(--background-elevated)] hover:border-border-strong hover:bg-accent/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-muted-foreground font-bold">
                      {item.type} · {item.category}
                    </span>
                    <h4 className="text-xs font-bold text-foreground mt-0.5">{item.name}</h4>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground tabular-nums shrink-0">
                    {item.currentPriceOrNAV}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1 text-xs">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-muted-foreground text-[11px]">Portfolio Overlap:</span>
                    <span className={cn(
                      "font-bold tabular-nums",
                      item.overlapPercent > 40 ? "text-[var(--negative)]" : item.overlapPercent > 15 ? "text-[var(--warning)]" : "text-[var(--positive)]"
                    )}>
                      {item.overlapPercent}%
                    </span>
                  </div>

                  <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold border", getVerdictStyle(item.verdict))}>
                    {item.overlapPercent > 40 ? "Severe Overlap" : item.overlapPercent > 15 ? "Moderate" : "Safe to Buy"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Instrument Diagnostic Deep Dive */}
        <div className="p-5 rounded-2xl bg-[var(--background-elevated)] border border-border/80 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between border-b border-border/70 pb-3 gap-3">
              <div>
                <span className="text-[10px] uppercase font-mono text-primary font-bold">
                  {selectedItem.type} · {selectedItem.category}
                </span>
                <h4 className="text-base font-bold text-foreground mt-0.5">{selectedItem.name}</h4>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Current Market Band: <strong className="text-foreground">{selectedItem.currentPriceOrNAV}</strong>
                </p>
              </div>

              <div className="text-right">
                <span className={cn("px-3 py-1 rounded-xl text-xs font-bold border block font-mono", getVerdictStyle(selectedItem.verdict))}>
                  {selectedItem.overlapPercent}% OVERLAP
                </span>
                <span className="text-[10px] text-muted-foreground font-mono mt-1 block">
                  {selectedItem.projectedWeightIncrease}
                </span>
              </div>
            </div>

            {/* Overlapping Underlying Holdings */}
            <div className="space-y-2.5 text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Duplicate Stocks Already In Your Portfolio:
              </span>

              <div className="space-y-2 font-mono">
                {selectedItem.overlappingHoldings.map((h, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[var(--card)] border border-border flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground font-sans block">{h.holdingName}</span>
                      <span className="text-[10px] text-muted-foreground font-sans">Held via: <strong className="text-primary">{h.viaFund}</strong></span>
                    </div>
                    <span className="text-[var(--negative)] font-bold text-xs tabular-nums">
                      {h.existingExposurePercent}% Existing Weight
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Advisor Rationale */}
            <div className="p-4 rounded-xl bg-[var(--card)] border border-border text-xs text-muted-foreground space-y-1.5">
              <span className="text-foreground font-bold flex items-center gap-1.5 font-sans">
                <Sparkles className="w-3.5 h-3.5 text-[var(--warning)]" />
                <span>Nivesh Lens Diagnostic Recommendation:</span>
              </span>
              <p className="leading-relaxed text-[11.5px] font-sans text-muted-foreground">
                {selectedItem.rationale}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-3 border-t border-border/70 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-mono text-[11px]">Calculated against your 14 live assets</span>
            <button 
              onClick={() => alert(`Pre-buy audit simulated for ${selectedItem.name}. Diagnostic passed.`)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              <span>Simulate Portfolio Impact</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
