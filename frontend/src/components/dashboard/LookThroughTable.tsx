"use client";

import React, { useState } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  ShieldAlert, 
  Layers, 
  Building, 
  AlertTriangle
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { IconButton } from "@/components/ui/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";

export function LookThroughTable() {
  const { companyExposures, holdings, openSyncModal } = usePortfolioStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"exposure" | "direct" | "indirect">("exposure");

  if (holdings.length === 0 && companyExposures.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No Look-Through Data Available"
        description="Upload your CAS statement or connect your portfolio to see true company exposure combining direct equities and mutual fund holdings."
        actionLabel="Connect Portfolio"
        onAction={openSyncModal}
      />
    );
  }

  const sectors = ["All", "Financial Services", "Energy & Petrochemicals", "Information Technology", "Technology & Software"];

  const filteredExposures = companyExposures
    .filter((c) => {
      const matchesSearch = c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.conglomerateGroup.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector = selectedSector === "All" || c.sector === selectedSector;
      return matchesSearch && matchesSector;
    })
    .sort((a, b) => {
      if (sortBy === "exposure") return b.totalTruePercent - a.totalTruePercent;
      if (sortBy === "direct") return b.directValue - a.directValue;
      return b.indirectValue - a.indirectValue;
    });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground">
      {/* Header & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">AMFI Stock Look-Through & Combined True Exposure</h3>
              <p className="text-xs text-muted-foreground">Aggregates Direct Stocks + Secret Mutual Fund Underlying Portfolios</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stock, group, ticker..."
              className="h-9 pl-9 pr-3 rounded-xl border border-border bg-[var(--background)] text-xs text-foreground focus:border-primary/60 outline-none transition-colors w-48 sm:w-60 placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Sector filter */}
          <select 
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-[var(--background)] text-xs text-muted-foreground focus:text-foreground focus:border-primary/60 outline-none cursor-pointer"
          >
            {sectors.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
          </select>
        </div>
      </div>

      {/* Exposure Table */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--background-elevated)] text-[10px] uppercase font-bold text-muted-foreground tracking-wider border-y border-border/70">
            <tr>
              <th className="py-3 px-4">Company & Group</th>
              <th className="py-3 px-3">Sector</th>
              <th className="py-3 px-3 text-right cursor-pointer hover:text-foreground transition-colors" onClick={() => setSortBy("direct")}>
                Direct Stock
              </th>
              <th className="py-3 px-3 text-right cursor-pointer hover:text-foreground transition-colors" onClick={() => setSortBy("indirect")}>
                MF Look-Through
              </th>
              <th className="py-3 px-4 text-right cursor-pointer hover:text-foreground font-semibold text-primary transition-colors" onClick={() => setSortBy("exposure")}>
                Combined True Exposure %
              </th>
              <th className="py-3 px-3 text-center">Risk Category</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {filteredExposures.map((item) => {
              const isExpanded = expandedId === item.id;
              const isDanger = item.totalTruePercent >= 14;
              const isWarning = item.totalTruePercent >= 8 && item.totalTruePercent < 14;

              return (
                <React.Fragment key={item.id}>
                  <tr 
                    onClick={() => toggleExpand(item.id)}
                    className={`hover:bg-accent transition-colors cursor-pointer ${
                      isExpanded ? "bg-accent" : ""
                    }`}
                  >
                    {/* Company info */}
                    <td className="py-3.5 px-4 font-sans">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isDanger ? "bg-[var(--negative)]/10 text-[var(--negative)] border border-[var(--negative)]/20" : 
                          isWarning ? "bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20" : 
                          "bg-primary/10 text-primary border border-primary/20"
                        }`}>
                          {item.ticker.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            <span>{item.companyName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono font-normal">({item.ticker})</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-normal mt-0.5">
                            Group: <span className="text-foreground/80 font-medium">{item.conglomerateGroup}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Sector */}
                    <td className="py-3.5 px-3 font-sans text-muted-foreground">
                      {item.sector}
                    </td>

                    {/* Direct Value (Right-aligned) */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      <div className="text-foreground font-semibold tabular-nums">
                        ₹{item.directValue.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-normal tabular-nums">
                        {item.directPercent.toFixed(2)}%
                      </div>
                    </td>

                    {/* Indirect Value via MFs (Right-aligned) */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      <div className="text-foreground font-semibold tabular-nums">
                        ₹{item.indirectValue.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-[var(--info)] font-normal tabular-nums">
                        {item.indirectPercent.toFixed(2)}% in {item.heldViaFunds.length} Funds
                      </div>
                    </td>

                    {/* True Combined Total % (Right-aligned) */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-semibold text-sm tabular-nums ${
                          isDanger ? "text-[var(--negative)]" : isWarning ? "text-[var(--warning)]" : "text-[var(--positive)]"
                        }`}>
                          {item.totalTruePercent.toFixed(2)}%
                        </span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          (₹{Math.round(item.totalTrueValue).toLocaleString("en-IN")})
                        </span>
                      </div>
                      {/* Bar progress */}
                      <div className="w-28 h-1.5 bg-[var(--background)] rounded-full overflow-hidden mt-1 ml-auto">
                        <div 
                          className={`h-full rounded-full ${
                            isDanger ? "bg-[var(--negative)]" : isWarning ? "bg-[var(--warning)]" : "bg-[var(--positive)]"
                          }`}
                          style={{ width: `${Math.min(item.totalTruePercent * 5, 100)}%` }}
                        />
                      </div>
                    </td>

                    {/* Risk Tag */}
                    <td className="py-3.5 px-3 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border inline-flex items-center gap-1 ${
                        isDanger ? "bg-[var(--negative)]/10 text-[var(--negative)] border-[var(--negative)]/20" : 
                        isWarning ? "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20" : 
                        "bg-[var(--positive)]/10 text-[var(--positive)] border-[var(--positive)]/20"
                      }`}>
                        {isDanger && <ShieldAlert className="w-3 h-3" strokeWidth={1.75} />}
                        <span>{item.riskCategory}</span>
                      </span>
                    </td>

                    {/* Expand Chevron */}
                    <td className="py-3.5 px-4 text-right">
                      <IconButton
                        aria-label={isExpanded ? "Collapse holding details" : "Expand holding details"}
                        aria-expanded={isExpanded}
                        className="bg-accent"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" strokeWidth={1.75} /> : <ChevronDown className="w-4 h-4" strokeWidth={1.75} />}
                      </IconButton>
                    </td>
                  </tr>

                  {/* Expandable Look-Through Nested Details */}
                  {isExpanded && (
                    <tr className="bg-[var(--background-elevated)]/70">
                      <td colSpan={7} className="p-4 border-t border-border/70 font-sans">
                        <div className="rounded-xl border border-border bg-[var(--card)] p-4 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/70">
                            <h5 className="text-xs font-bold text-foreground flex items-center gap-2">
                              <Building className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
                              <span>Look-Through Breakdown for {item.companyName}</span>
                            </h5>
                            <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                              <span>Promoter Pledging: <strong className="text-foreground tabular-nums">{item.promoterPledging}%</strong></span>
                              <span>FII Holding: <strong className="text-foreground tabular-nums">{item.fiiHolding}%</strong></span>
                            </div>
                          </div>

                          {/* Funds breakdown grid */}
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground mb-2">Mutual Funds Holding This Stock Behind The Scenes:</p>
                            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2">
                              {item.heldViaFunds.map((f: { fundName: string; fundTicker: string; fundAllocation: number; indirectValue: number }) => (
                                <div key={f.fundName} className="p-2.5 rounded-xl border border-border/70 bg-[var(--background-elevated)] text-xs">
                                  <p className="font-semibold text-foreground truncate">{f.fundName}</p>
                                  <div className="flex justify-between items-center mt-1.5 font-mono text-[11px]">
                                    <span className="text-muted-foreground">Weight: <strong className="text-primary tabular-nums">{f.fundAllocation}%</strong></span>
                                    <span className="text-foreground font-semibold tabular-nums">₹{Math.round(f.indirectValue).toLocaleString("en-IN")}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Vulnerability alert banner */}
                          <div className="p-2.5 rounded-xl bg-[var(--warning)]/10 border border-[var(--warning)]/20 text-xs text-[var(--warning)] flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--warning)]" strokeWidth={1.75} />
                            <div>
                              <strong className="font-semibold text-[var(--warning)]">Vulnerability Index: </strong>
                              <span>{item.supplyChainVulnerability}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
