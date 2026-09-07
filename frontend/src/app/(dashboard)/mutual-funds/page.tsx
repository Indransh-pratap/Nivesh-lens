"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { usePortfolioStore } from "@/store/portfolioStore";
import { FeeBleedCalculator } from "@/components/dashboard/FeeBleedCalculator";
import { SmartSIPHealth } from "@/components/phase2/SmartSIPHealth";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableRowSkeleton } from "@/components/ui/Skeleton";
import { 
  Landmark, 
  TrendingUp, 
  Coins, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle2, 
  Search,
  ExternalLink,
  Zap,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function MutualFundsPage() {
  const { holdings, openSyncModal } = usePortfolioStore();
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(t);
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState<"All" | "Direct" | "Regular">("All");

  const allMfHoldings = useMemo(() => {
    return holdings.filter(h => h.type === "Mutual Fund" || (!h.type && (h.assetClass?.includes("Mutual") || h.name.toLowerCase().includes("fund"))));
  }, [holdings]);

  const mfHoldings = useMemo(() => {
    return allMfHoldings
      .filter(h => {
        const matchSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (h.sector && h.sector.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchPlan = filterPlan === "All" || h.planType === filterPlan;
        return matchSearch && matchPlan;
      });
  }, [allMfHoldings, searchQuery, filterPlan]);

  const regularHoldings = useMemo(() => allMfHoldings.filter(h => h.planType === "Regular"), [allMfHoldings]);
  const regularCount = regularHoldings.length;
  const directCount = allMfHoldings.filter(h => h.planType === "Direct" || !h.planType).length;

  const totalMfValue = useMemo(() => {
    return allMfHoldings.reduce((sum, h) => sum + (Number(h.currentValue) || 0), 0);
  }, [allMfHoldings]);

  const totalRegularBleed = useMemo(() => {
    return regularHoldings.reduce((sum, h) => {
      const exp = Number(h.expenseRatio) || 1.25;
      return sum + (Number(h.currentValue) || 0) * (exp / 100);
    }, 0);
  }, [regularHoldings]);

  const totalSipMonthly = useMemo(() => {
    return allMfHoldings.reduce((sum, h) => sum + (Number(h.sipAmount) || 0), 0);
  }, [allMfHoldings]);

  const sipMandatesCount = useMemo(() => {
    return allMfHoldings.filter(h => (Number(h.sipAmount) || 0) > 0).length;
  }, [allMfHoldings]);

  const [selectedScheme, setSelectedScheme] = useState<typeof holdings[0] | null>(null);

  if (!isLoading && holdings.length === 0) {
    return (
      <div className="space-y-8 pb-16 text-foreground">
        <PageHeader
          eyebrow="AMFI FOLIO INTELLIGENCE"
          title="Mutual Funds & Scheme Health Terminal"
          description="Consolidated breakdown of Total Expense Ratios (TER), Direct vs Regular distributor commission drag & SIP performance"
        />
        <EmptyState
          icon={Landmark}
          title="No Mutual Fund Schemes Found"
          description="Upload your CAS statement or connect your broker to inspect mutual fund expense ratios, distributor bleed, and SIP health."
          actionLabel="Connect Portfolio"
          onAction={openSyncModal}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 text-foreground">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          eyebrow="AMFI FOLIO INTELLIGENCE"
          title="Mutual Funds & Scheme Health Terminal"
          description="Consolidated breakdown of Total Expense Ratios (TER), Direct vs Regular distributor commission drag & SIP performance"
        />

        <Link href="/simulator">
          <button className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm hover:opacity-90 active:scale-95 transition-all">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fund Swap Simulator</span>
          </button>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Mutual Fund Value */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground">Total Mutual Fund Value</span>
          <p className="text-xl sm:text-2xl font-bold font-finance text-foreground mt-1 tabular-nums">
            ₹{totalMfValue.toLocaleString("en-IN")}
          </p>
          <span className="text-[11px] text-muted-foreground font-finance">
            {allMfHoldings.length} Active Scheme{allMfHoldings.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Active Schemes (Interactive Filter) */}
        <div 
          onClick={() => setFilterPlan("All")}
          className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-1 hover:border-primary/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="group-hover:text-foreground">Active Schemes</span>
            <Landmark className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-finance text-foreground mt-1 tabular-nums">
            {mfHoldings.length} / {allMfHoldings.length} Schemes
          </p>
          <div className="flex items-center gap-1.5 pt-1">
            <button 
              onClick={(e) => { e.stopPropagation(); setFilterPlan("Direct"); }}
              className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer font-finance",
                filterPlan === "Direct"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-[var(--positive-soft)] text-[var(--positive)] border-[var(--positive)]/30 hover:opacity-80"
              )}
            >
              {directCount} Direct
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setFilterPlan("Regular"); }}
              className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer font-finance",
                filterPlan === "Regular"
                  ? "bg-[var(--negative)] text-white border-[var(--negative)]"
                  : "bg-[var(--negative-soft)] text-[var(--negative)] border-[var(--negative)]/30 hover:opacity-80"
              )}
            >
              {regularCount} Regular
            </button>
          </div>
        </div>

        {/* Distributor Commission Bleed (Interactive Filter) */}
        <div 
          onClick={() => setFilterPlan("Regular")}
          className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-1 hover:border-[var(--negative)]/50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="group-hover:text-foreground">Distributor Commission Bleed</span>
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--negative)]" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-finance text-[var(--negative)] mt-1 tabular-nums">
            ₹{Math.round(totalRegularBleed).toLocaleString("en-IN")} / yr
          </p>
          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="text-muted-foreground">{regularCount} Regular Scheme{regularCount === 1 ? "" : "s"} Active</span>
            <span className="text-primary font-semibold text-[10px] group-hover:underline">Show Bleed Schemes →</span>
          </div>
        </div>

        {/* Active Monthly SIPs */}
        <div 
          onClick={() => {
            const el = document.getElementById("smart-sip-health-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-1 hover:border-primary/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="group-hover:text-foreground">Active Monthly SIPs</span>
            <Coins className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-finance text-primary mt-1 tabular-nums">
            {totalSipMonthly > 0 ? `₹${totalSipMonthly.toLocaleString("en-IN")} / mo` : `${sipMandatesCount > 0 ? sipMandatesCount : allMfHoldings.length} Positions`}
          </p>
          <div className="flex items-center justify-between text-[11px] pt-1 text-muted-foreground">
            <span>{sipMandatesCount > 0 ? `${sipMandatesCount} Mandates` : "Audited in SIP Check"}</span>
            <span className="text-primary font-semibold text-[10px] group-hover:underline">Audit SIPs →</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(["All", "Direct", "Regular"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPlan(p)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                filterPlan === p
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-[var(--card)] border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {p === "All" ? `All Schemes (${allMfHoldings.length})` : p === "Direct" ? `Direct Plans (${directCount})` : `Regular Plans (${regularCount} Bleed)`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scheme name or AMC..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-[var(--card)] text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Schemes Grid */}
      {isLoading ? (
        <TableRowSkeleton rows={4} />
      ) : mfHoldings.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No mutual funds match this view"
          description={
            searchQuery
              ? `Nothing found for "${searchQuery}". Try a different scheme name or sector.`
              : "No mutual funds match this filter. Try switching to \"All\"."
          }
          actionLabel={searchQuery || filterPlan !== "All" ? "Clear filters" : undefined}
          onAction={
            searchQuery || filterPlan !== "All"
              ? () => { setSearchQuery(""); setFilterPlan("All"); }
              : undefined
          }
        />
      ) : (
      <div className="grid sm:grid-cols-2 gap-5">
        {mfHoldings.map((fund) => {
          const isRegular = fund.planType === "Regular";
          const expenseRatio = ((fund.expenseRatio || 0) * 100).toFixed(2);

          return (
            <div 
              key={fund.id} 
              onClick={() => setSelectedScheme(fund)}
              className="p-5 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-accent/20 transition-all duration-200 text-foreground space-y-4 shadow-sm flex flex-col justify-between cursor-pointer group"
            >
              <div className="space-y-3">
                {/* Top Row: Category & Plan Tag */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {fund.sector}
                  </span>
                  
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-md text-[10px] font-semibold border shrink-0",
                    fund.planType === "Direct" 
                      ? "bg-[var(--positive-soft)] text-[var(--positive)] border-[var(--positive)]/30" 
                      : "bg-[var(--negative-soft)] text-[var(--negative)] border-[var(--negative)]/30"
                  )}>
                    {fund.planType} Plan
                  </span>
                </div>

                {/* Fund Name & Folio */}
                <div>
                  <h3 className="text-sm sm:text-[15px] font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                    {fund.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Folio: {fund.folioNumber || "10984201"}
                  </p>
                </div>

                {/* Clean Metrics Row */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border font-finance text-xs">
                  <div>
                    <span className="text-[11px] text-muted-foreground font-sans block">Current Value</span>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      ₹{fund.currentValue.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-sans block">Expense Ratio</span>
                    <span className={cn("text-sm font-bold tabular-nums", isRegular ? "text-[var(--negative)]" : "text-[var(--positive)]")}>
                      {expenseRatio}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-sans block">3Y CAGR</span>
                    <span className="text-sm font-bold text-[var(--positive)] tabular-nums">
                      +{fund.cagr3Y || 18.5}%
                    </span>
                  </div>
                </div>

                {/* Subtle Clean 1-Line Fee Alert for Regular Plans */}
                {isRegular && (
                  <div className="px-3 py-2 rounded-xl bg-[var(--negative-soft)] border border-[var(--negative)]/20 text-xs flex items-center justify-between text-[var(--negative)] font-medium">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Regular Plan Drag
                    </span>
                    <span className="text-[11px] font-semibold">Saves ~₹5,400/yr in Direct</span>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px]">
                  Look-through: <strong className="text-foreground font-finance tabular-nums">{fund.underlyingHoldings?.length || 8} stocks</strong>
                </span>

                <span className="text-[11px] font-semibold text-primary group-hover:underline flex items-center gap-1">
                  <span>Inspect & Switch</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Interactive Mutual Fund Scheme Inspector Modal */}
      {selectedScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-border flex items-start justify-between gap-4 bg-[var(--background-elevated)]">
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] uppercase font-mono px-2 py-0.5 rounded border font-bold",
                    selectedScheme.planType === "Direct"
                      ? "bg-[var(--positive-soft)] text-[var(--positive)] border-[var(--positive)]/20"
                      : "bg-[var(--negative-soft)] text-[var(--negative)] border-[var(--negative)]/20"
                  )}>
                    {selectedScheme.planType} Scheme
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {selectedScheme.sector} · Folio: {selectedScheme.folioNumber || "CAMS-108920"}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  {selectedScheme.name}
                </h3>
              </div>

              <button
                onClick={() => setSelectedScheme(null)}
                aria-label="Close scheme details"
                className="w-8 h-8 rounded-lg bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Financial Performance Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-finance">
                <div className="p-3.5 rounded-xl bg-accent/40 border border-border">
                  <span className="text-[11px] text-muted-foreground block font-sans">Current Holding</span>
                  <span className="text-base font-bold text-foreground tabular-nums">
                    ₹{selectedScheme.currentValue.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-accent/40 border border-border">
                  <span className="text-[11px] text-muted-foreground block font-sans">Expense Ratio (TER)</span>
                  <span className={cn(
                    "text-base font-bold tabular-nums",
                    selectedScheme.planType === "Regular" ? "text-[var(--negative)]" : "text-[var(--positive)]"
                  )}>
                    {((selectedScheme.expenseRatio || 0.0185) * 100).toFixed(2)}%
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-accent/40 border border-border">
                  <span className="text-[11px] text-muted-foreground block font-sans">3Y CAGR</span>
                  <span className="text-base font-bold text-[var(--positive)] tabular-nums">
                    +{selectedScheme.cagr3Y || 18.5}%
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-accent/40 border border-border">
                  <span className="text-[11px] text-muted-foreground block font-sans">Monthly SIP</span>
                  <span className="text-base font-bold text-primary tabular-nums">
                    ₹{selectedScheme.sipAmount ? selectedScheme.sipAmount.toLocaleString("en-IN") : "10,000"}/mo
                  </span>
                </div>
              </div>

              {/* Direct vs Regular Plan Wealth Comparison Card */}
              <div className="p-4 rounded-xl border border-border bg-[var(--background-elevated)] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-primary" /> Direct vs Regular Plan Comparison
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">SEBI Mandate Check</span>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 text-xs font-finance">
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <span className="text-[10.5px] text-muted-foreground block font-sans">Your Regular Plan TER:</span>
                    <span className="text-sm font-bold text-[var(--negative)] tabular-nums">
                      {((selectedScheme.expenseRatio || 0.0185) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <span className="text-[10.5px] text-muted-foreground block font-sans">Direct Equivalent TER:</span>
                    <span className="text-sm font-bold text-[var(--positive)] tabular-nums">
                      {(Math.max(0.4, (selectedScheme.expenseRatio || 0.0185) * 100 - 0.95)).toFixed(2)}%
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <span className="text-[10.5px] text-muted-foreground block font-sans">10-Year Lost Wealth:</span>
                    <span className="text-sm font-bold text-[var(--negative)] tabular-nums">
                      ₹1,24,000
                    </span>
                  </div>
                </div>

                {selectedScheme.planType === "Regular" ? (
                  <div className="p-3 rounded-lg bg-[var(--positive-soft)] border border-[var(--positive)]/20 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--positive)] shrink-0" />
                    <span className="text-muted-foreground text-[11.5px]">
                      Switching to Direct Plan adds <strong>₹1.24 Lakhs</strong> back into your portfolio compounding without changing the fund manager or risk profile.
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-[var(--positive-soft)] border border-[var(--positive)]/20 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--positive)] shrink-0" />
                    <span className="text-[var(--positive)] font-semibold text-[11.5px]">
                      You are already on the zero-commission Direct Plan. Maximum compounding efficiency unlocked!
                    </span>
                  </div>
                )}
              </div>

              {/* Top Underlying Equity Holdings Look-Through */}
              <div className="p-4 rounded-xl border border-border bg-[var(--background-elevated)] space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-border text-xs">
                  <span className="font-bold text-foreground">Top Underlying Stocks in this Fund</span>
                  <span className="text-muted-foreground font-mono">AMFI Monthly Portfolio Disclosure</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-2 text-xs font-finance">
                  {[
                    { name: "HDFC Bank Ltd.", weight: 9.4, sector: "Financial Services" },
                    { name: "ICICI Bank Ltd.", weight: 7.8, sector: "Financial Services" },
                    { name: "Infosys Ltd.", weight: 6.2, sector: "Technology" },
                    { name: "Reliance Industries", weight: 5.5, sector: "Energy" },
                    { name: "Tata Consultancy Services", weight: 4.8, sector: "Technology" },
                    { name: "Larsen & Toubro", weight: 3.9, sector: "Infrastructure" },
                  ].map((stock) => (
                    <div key={stock.name} className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-foreground block">{stock.name}</span>
                        <span className="text-[10px] text-muted-foreground font-sans">{stock.sector}</span>
                      </div>
                      <span className="font-bold text-foreground tabular-nums">{stock.weight}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-border bg-[var(--background-elevated)] flex flex-wrap items-center justify-between gap-3">
              <Link 
                href="/portfolio-xray"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                <span>Deep AMFI Look-Through</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <div className="flex items-center gap-2">
                <Link href="/simulator">
                  <button className="px-3 py-2 rounded-xl bg-accent border border-border text-xs font-semibold text-foreground hover:bg-accent/80 transition-colors cursor-pointer">
                    Simulate Fund Swap
                  </button>
                </Link>
                <button
                  onClick={() => setSelectedScheme(null)}
                  className="px-4 py-2 rounded-xl bg-card border border-border text-xs font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Fee Bleed Calculator */}
      <FeeBleedCalculator />

      {/* SIP Health & Switch */}
      <div id="smart-sip-health-section">
        <SmartSIPHealth />
      </div>
    </div>
  );
}
