"use client";

import React, { useState, useMemo } from "react";
import { 
  Users, 
  Search, 
  Layers
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

interface CrossFamilyStock {
  name: string;
  ticker: string;
  sector: string;
  totalFamilyValue: number;
  totalFamilyPercent: number;
  alertLevel: "High Risk" | "Moderate" | "Balanced";
}

export function FamilyPortfolioView() {
  const { familyMembers, activeFamilyMemberId, setActiveFamilyMember, holdings, openSyncModal } = usePortfolioStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showMatrix, setShowMatrix] = useState(true);
  const [showMemberAssets, setShowMemberAssets] = useState(false);

  // If no family portfolios are connected, show clean institutional EmptyState
  if (!familyMembers || familyMembers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No family portfolios connected"
        description="Household-level wealth tracking combines investments across multiple PANs to detect cross-family stock duplication, total concentration risk, and tax optimization opportunities."
        actionLabel="Connect Family Portfolio"
        onAction={() => openSyncModal("CAS")}
      />
    );
  }

  const totalHouseholdWealth = familyMembers.reduce((acc, m) => acc + (m.portfolioValue || 0), 0);
  const activeMember = familyMembers.find(m => m.id === activeFamilyMemberId) || familyMembers[0];

  const handleMemberClick = (memberId: string) => {
    if (activeFamilyMemberId === memberId && showMemberAssets) {
      setShowMemberAssets(false);
    } else {
      setActiveFamilyMember(memberId);
      setShowMemberAssets(true);
    }
  };

  const memberHoldings = activeMember ? holdings : [];

  const crossFamilyHoldings: CrossFamilyStock[] = useMemo(() => {
    if (!holdings || holdings.length === 0 || totalHouseholdWealth <= 0) return [];
    return holdings.map((h) => {
      const val = Number(h.currentValue) || 0;
      const pct = (val / totalHouseholdWealth) * 100;
      return {
        name: h.name,
        ticker: h.ticker,
        sector: h.sector || "Diversified",
        totalFamilyValue: val,
        totalFamilyPercent: Number(pct.toFixed(2)),
        alertLevel: pct > 20 ? ("High Risk" as const) : pct > 12 ? ("Moderate" as const) : ("Balanced" as const),
      };
    });
  }, [holdings, totalHouseholdWealth]);

  const filteredHoldings = crossFamilyHoldings.filter(h => 
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.ticker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-foreground">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-md relative overflow-hidden">
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

                {member.topStock && (
                  <p className="text-[10px] text-muted-foreground font-sans mt-2.5 pt-2 border-t border-border">
                    Largest exposure: <strong className="text-foreground">{member.topStock}</strong>
                  </p>
                )}
              </div>
            );
          })}
        </div>

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

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {memberHoldings.map((h, idx) => {
                const isGain = (h.returns || 0) >= 0;
                return (
                  <div 
                    key={`${h.id || idx}-${activeMember.id}`}
                    className="p-3.5 rounded-xl border border-border bg-[var(--background-elevated)] space-y-2 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[9px] uppercase font-mono text-muted-foreground font-semibold">
                          {h.sector || "Equity"}
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
                          {isGain ? "+" : ""}{(h.returns || 0).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showMatrix && crossFamilyHoldings.length > 0 && (
        <div 
          id="family-comparison-matrix"
          className="rounded-2xl border border-border bg-card p-6 shadow-md transition-all duration-300 space-y-5"
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

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-mono text-[11px]">
                  <th className="pb-3 font-semibold">Instrument Name</th>
                  <th className="pb-3 font-semibold">Sector</th>
                  <th className="pb-3 font-semibold text-right">Combined Family Value</th>
                  <th className="pb-3 font-semibold text-right">Family Weight</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono">
                {filteredHoldings.map((h) => (
                  <tr key={h.ticker || h.name} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3.5 font-sans font-bold text-foreground">
                      {h.name}
                      <span className="block text-[10px] font-mono text-muted-foreground font-normal">{h.ticker}</span>
                    </td>
                    <td className="py-3.5 font-sans text-muted-foreground">{h.sector}</td>
                    <td className="py-3.5 text-right font-bold text-foreground tabular-nums">
                      ₹{h.totalFamilyValue.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 text-right font-bold tabular-nums">
                      <span className={h.totalFamilyPercent > 15 ? "text-[var(--negative)]" : "text-foreground"}>
                        {h.totalFamilyPercent}%
                      </span>
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
