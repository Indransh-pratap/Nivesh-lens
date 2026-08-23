"use client";

import React, { useState } from "react";
import { 
  Users, 
  Search, 
  ArrowUpDown, 
  ShieldAlert, 
  CheckCircle2, 
  Layers,
  ArrowRight
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { InsightFlag } from "@/components/ui/InsightFlag";
import { cn } from "@/lib/utils";

interface CrossFamilyStock {
  name: string;
  ticker: string;
  sector: string;
  totalFamilyValue: number;
  totalFamilyPercent: number;
  youValue: number;
  youPercent: number;
  spouseValue: number;
  spousePercent: number;
  fatherValue: number;
  fatherPercent: number;
  alertLevel: "High Risk" | "Moderate" | "Balanced";
}

const CROSS_FAMILY_HOLDINGS: CrossFamilyStock[] = [
  {
    name: "HDFC Bank Ltd.",
    ticker: "HDFCBANK",
    sector: "Financial Services",
    totalFamilyValue: 1280000,
    totalFamilyPercent: 20.35,
    youValue: 552354,
    youPercent: 15.87,
    spouseValue: 387000,
    spousePercent: 22.4,
    fatherValue: 340646,
    fatherPercent: 26.2,
    alertLevel: "High Risk"
  },
  {
    name: "Reliance Industries Ltd.",
    ticker: "RELIANCE",
    sector: "Energy & Conglomerates",
    totalFamilyValue: 1050000,
    totalFamilyPercent: 16.69,
    youValue: 509472,
    youPercent: 14.64,
    spouseValue: 280000,
    spousePercent: 16.2,
    fatherValue: 260528,
    fatherPercent: 20.0,
    alertLevel: "High Risk"
  },
  {
    name: "Infosys Ltd.",
    ticker: "INFY",
    sector: "Technology",
    totalFamilyValue: 620000,
    totalFamilyPercent: 9.85,
    youValue: 280000,
    youPercent: 8.04,
    spouseValue: 190000,
    spousePercent: 11.0,
    fatherValue: 150000,
    fatherPercent: 11.5,
    alertLevel: "Moderate"
  },
  {
    name: "Tata Motors Ltd.",
    ticker: "TATAMOTORS",
    sector: "Automotive",
    totalFamilyValue: 480000,
    totalFamilyPercent: 7.63,
    youValue: 295800,
    youPercent: 8.50,
    spouseValue: 110000,
    spousePercent: 6.37,
    fatherValue: 74200,
    fatherPercent: 5.7,
    alertLevel: "Moderate"
  },
  {
    name: "ICICI Bank Ltd.",
    ticker: "ICICIBANK",
    sector: "Financial Services",
    totalFamilyValue: 510000,
    totalFamilyPercent: 8.10,
    youValue: 240000,
    youPercent: 6.89,
    spouseValue: 160000,
    spousePercent: 9.27,
    fatherValue: 110000,
    fatherPercent: 8.46,
    alertLevel: "Moderate"
  },
  {
    name: "HDFC Corporate Bond Fund",
    ticker: "HDFCBOND",
    sector: "Fixed Income",
    totalFamilyValue: 850000,
    totalFamilyPercent: 13.51,
    youValue: 480240,
    youPercent: 13.80,
    spouseValue: 220000,
    spousePercent: 12.75,
    fatherValue: 149760,
    fatherPercent: 11.52,
    alertLevel: "Balanced"
  }
];

export function FamilyPortfolioView() {
  const { familyMembers, activeFamilyMemberId, setActiveFamilyMember, holdings } = usePortfolioStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showMatrix, setShowMatrix] = useState(true);
  const [highlighted, setHighlighted] = useState(false);
  const [showMemberAssets, setShowMemberAssets] = useState(false);

  const totalHouseholdWealth = familyMembers.reduce((acc, m) => acc + m.portfolioValue, 0);
  const activeMember = familyMembers.find(m => m.id === activeFamilyMemberId) || familyMembers[0];

  // Toggle member asset expansion
  const handleMemberClick = (memberId: string) => {
    if (activeFamilyMemberId === memberId && showMemberAssets) {
      setShowMemberAssets(false);
    } else {
      setActiveFamilyMember(memberId);
      setShowMemberAssets(true);
    }
  };

  // Specific filtered holdings for the selected family member
  const memberHoldings = React.useMemo(() => {
    if (!activeMember) return holdings;
    if (activeMember.relation === "Self") {
      return holdings.slice(0, 9);
    } else if (activeMember.relation === "Spouse") {
      return holdings.slice(2, 8);
    } else {
      return [
        holdings[0],
        holdings[1],
        holdings[3],
        holdings[4],
        holdings[6],
        holdings[7],
        holdings[8],
        holdings[9] || holdings[2]
      ];
    }
  }, [activeMember, holdings]);

  const handleCompareFix = () => {
    setShowMatrix(true);
    setHighlighted(true);
    const el = document.getElementById("family-comparison-matrix");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setTimeout(() => setHighlighted(false), 3000);
  };

  const filteredHoldings = CROSS_FAMILY_HOLDINGS.filter(h => 
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.ticker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-foreground">
      {/* Top Aggregator Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-md relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Family Portfolio Aggregator (Household View)</h3>
              <p className="text-xs text-muted-foreground">Combines investments across PANs to catch cross-family duplication & optimize taxes</p>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl border border-primary/20 bg-primary/10 text-primary text-xs font-bold font-mono tabular-nums">
            Household Total: ₹{totalHouseholdWealth.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Household Member Cards */}
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          {familyMembers.map((member) => {
            const isSelected = activeFamilyMemberId === member.id && showMemberAssets;
            return (
              <div 
                key={member.id} 
                onClick={() => handleMemberClick(member.id)}
                className={`p-5 rounded-2xl border transition-all duration-150 cursor-pointer group ${
                  isSelected 
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40" 
                    : "border-border bg-card hover:border-border-strong hover:bg-accent/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-accent border border-border text-primary flex items-center justify-center font-bold text-xs">
                      {member.name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground">{member.relation} · <span className="font-mono">{member.panMasked}</span></p>
                    </div>
                  </div>
                  <span className="font-finance text-xs font-bold text-[var(--positive)] tabular-nums">
                    {member.healthScore} <span className="text-[9px] font-normal text-muted-foreground font-sans">Health</span>
                  </span>
                </div>

                <div className="mt-4 pt-3.5 border-t border-border font-finance">
                  <p className="text-xl font-bold text-foreground tabular-nums">
                    ₹{member.portfolioValue.toLocaleString("en-IN")}
                  </p>
                  <div className="flex justify-between text-[11px] mt-1">
                    <span className="text-[var(--positive)] font-semibold tabular-nums">+₹{member.totalGain.toLocaleString("en-IN")} (+{member.gainPercent}%)</span>
                    <span className={cn(
                      "font-semibold font-sans tabular-nums underline decoration-primary/40 underline-offset-2 transition-colors",
                      isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                    )}>
                      {isSelected ? "▲ Hide Assets" : `▼ Inspect ${member.holdingsCount} Assets`}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground font-sans mt-2.5 pt-2 border-t border-border">
                  Largest exposure: <strong className="text-foreground">{member.topStock}</strong>
                </p>
              </div>
            );
          })}
        </div>

        {/* Active Family Member Holdings Expanded View */}
        {showMemberAssets && activeMember && (
          <div className="mt-6 p-5 rounded-2xl border border-primary/30 bg-card shadow-sm space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                  {activeMember.name[0]}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>{activeMember.name} ({activeMember.relation})</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono">
                      {activeMember.panMasked}
                    </span>
                  </h4>
                  <p className="text-xs text-muted-foreground">Individual Asset Inventory ({memberHoldings.length} Assets · Net Worth ₹{activeMember.portfolioValue.toLocaleString("en-IN")})</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right font-finance hidden sm:block">
                  <span className="text-xs text-muted-foreground font-sans mr-2">Total Gain:</span>
                  <span className="text-xs font-bold text-[var(--positive)] tabular-nums">+₹{activeMember.totalGain.toLocaleString("en-IN")} (+{activeMember.gainPercent}%)</span>
                </div>
                
                <button
                  onClick={() => setShowMemberAssets(false)}
                  className="px-3 py-1.5 rounded-xl bg-accent border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Hide Details ✕</span>
                </button>
              </div>
            </div>

            {/* Member Assets Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {memberHoldings.map((h, idx) => {
                const isGain = h.returns >= 0;
                return (
                  <div 
                    key={`${h.id || idx}-${activeMember.id}`}
                    className="p-3.5 rounded-xl border border-border bg-[var(--background-elevated)] space-y-2 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[9px] uppercase font-mono text-muted-foreground font-semibold">
                          {h.sector}
                        </span>
                        <h5 className="text-xs font-bold text-foreground line-clamp-1">{h.name}</h5>
                        <p className="text-[10px] text-muted-foreground font-mono">{h.ticker}</p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium border border-border bg-accent text-muted-foreground shrink-0">
                        {h.type} {h.planType ? `(${h.planType})` : ""}
                      </span>
                    </div>

                    <div className="flex justify-between items-end pt-2 border-t border-border/70 font-finance text-xs">
                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase block font-sans">Holding Value</span>
                        <span className="font-bold text-foreground tabular-nums">₹{h.currentValue.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-muted-foreground uppercase block font-sans">Return</span>
                        <span className={cn("font-bold tabular-nums", isGain ? "text-[var(--positive)]" : "text-[var(--negative)]")}>
                          {isGain ? "+" : ""}{h.returns.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cross-Family Duplication Alert Banner */}
        <div className="mt-5">
          <InsightFlag
            severity="warning"
            headline="Cross-family concentration — Reliance & HDFC show up in every member's portfolio"
            why="Across You, Spouse, and Father, your household holds ₹12.8L in HDFC Group and ₹10.5L in Reliance Industries. If either company corrects by 15%, the family loses over ₹3,50,000 collectively — even though each individual portfolio looked diversified on its own."
            fixLabel="Compare holdings across family members"
            onFix={handleCompareFix}
          />
        </div>
      </div>

      {/* Cross-Family Holdings Comparison Matrix */}
      {showMatrix && (
        <div 
          id="family-comparison-matrix"
          className={cn(
            "rounded-2xl border border-border bg-card p-6 shadow-md transition-all duration-300 space-y-5",
            highlighted && "ring-2 ring-primary border-primary bg-primary/5"
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Cross-Family Asset Comparison Matrix</h4>
                <p className="text-xs text-muted-foreground">True side-by-side exposure percentage across all household PANs</p>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stock or fund..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-mono text-[11px]">
                  <th className="pb-3 font-semibold">Instrument Name</th>
                  <th className="pb-3 font-semibold">Sector</th>
                  <th className="pb-3 font-semibold text-right">Combined Family Value</th>
                  <th className="pb-3 font-semibold text-right">Family Weight</th>
                  <th className="pb-3 font-semibold text-right">You (Self)</th>
                  <th className="pb-3 font-semibold text-right">Spouse</th>
                  <th className="pb-3 font-semibold text-right">Father</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono">
                {filteredHoldings.map((h) => (
                  <tr key={h.ticker} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3.5 font-sans font-bold text-foreground">
                      {h.name}
                      <span className="block text-[10px] font-mono text-muted-foreground font-normal">{h.ticker}</span>
                    </td>
                    <td className="py-3.5 font-sans text-muted-foreground">{h.sector}</td>
                    <td className="py-3.5 text-right font-bold text-foreground tabular-nums">
                      ₹{(h.totalFamilyValue / 100000).toFixed(2)}L
                    </td>
                    <td className="py-3.5 text-right font-bold tabular-nums">
                      <span className={h.totalFamilyPercent > 15 ? "text-[var(--negative)]" : "text-foreground"}>
                        {h.totalFamilyPercent}%
                      </span>
                    </td>
                    <td className="py-3.5 text-right text-muted-foreground tabular-nums">
                      ₹{(h.youValue / 100000).toFixed(2)}L ({h.youPercent}%)
                    </td>
                    <td className="py-3.5 text-right text-muted-foreground tabular-nums">
                      ₹{(h.spouseValue / 100000).toFixed(2)}L ({h.spousePercent}%)
                    </td>
                    <td className="py-3.5 text-right text-muted-foreground tabular-nums">
                      ₹{(h.fatherValue / 100000).toFixed(2)}L ({h.fatherPercent}%)
                    </td>
                    <td className="py-3.5 text-center font-sans">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-bold border",
                        h.alertLevel === "High Risk" && "bg-[var(--negative-soft)] text-[var(--negative)] border-[var(--negative)]/30",
                        h.alertLevel === "Moderate" && "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning)]/30",
                        h.alertLevel === "Balanced" && "bg-[var(--positive-soft)] text-[var(--positive)] border-[var(--positive)]/30"
                      )}>
                        {h.alertLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
