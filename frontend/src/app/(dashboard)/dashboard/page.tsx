"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  Coins,
  Layers,
  ArrowRight,
  RefreshCw,
  Activity,
  FileText,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  Inbox,
  ShieldCheck,
  Zap,
  Sparkles,
  Search,
  PieChart as PieIcon,
  Download,
  Share2,
  Bot,
  MessageSquare,
  ChevronDown,
  MoreHorizontal
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePortfolioStore } from "@/store/portfolioStore";
import { FinancialHealthScoreCard } from "@/components/dashboard/FinancialHealthScoreCard";
import { CasPdfUploader } from "@/components/dashboard/CasPdfUploader";
import { HHIConcentrationMeter } from "@/components/dashboard/HHIConcentrationMeter";
import { InteractivePortfolioChart } from "@/components/dashboard/InteractivePortfolioChart";
import { InteractiveAllocationBreakdown } from "@/components/dashboard/InteractiveAllocationBreakdown";
import { InteractiveCrashBar } from "@/components/dashboard/InteractiveCrashBar";
import { ChartSkeleton } from "@/components/ui/Skeleton";

// Only one of these tabs is ever visible at a time, so each is code-split
// out of the initial dashboard bundle and fetched on demand when its tab
// is opened, instead of shipping all seven tabs' JS on first load.
const VirtualizedTransactionTable = dynamic(() => import("@/components/dashboard/VirtualizedTransactionTable").then(m => m.VirtualizedTransactionTable), { loading: () => <ChartSkeleton />, ssr: false });
const LookThroughTable = dynamic(() => import("@/components/dashboard/LookThroughTable").then(m => m.LookThroughTable), { loading: () => <ChartSkeleton />, ssr: false });
const FeeBleedCalculator = dynamic(() => import("@/components/dashboard/FeeBleedCalculator").then(m => m.FeeBleedCalculator), { loading: () => <ChartSkeleton />, ssr: false });
const CrashSimulator = dynamic(() => import("@/components/dashboard/CrashSimulator").then(m => m.CrashSimulator), { loading: () => <ChartSkeleton />, ssr: false });
const PreBuyOverlapGuard = dynamic(() => import("@/components/dashboard/PreBuyOverlapGuard").then(m => m.PreBuyOverlapGuard), { loading: () => <ChartSkeleton />, ssr: false });
const InteractiveWhatsAppAgent = dynamic(() => import("@/components/dashboard/InteractiveWhatsAppAgent").then(m => m.InteractiveWhatsAppAgent), { loading: () => <ChartSkeleton />, ssr: false });
import {
  MOCK_USER_PROFILE,
  MOCK_HEALTH_SCORE,
  MOCK_WASTED_FEES,
  MOCK_TOP_EXPOSURES,
  MOCK_TRANSACTIONS_50,
} from "@/data/mock/phase1Data";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { EmptyState } from "@/components/ui/EmptyState";
import { InsightFlag } from "@/components/ui/InsightFlag";
import { KPICardSkeleton } from "@/components/ui/Skeleton";
import { OnboardingTour } from "@/components/dashboard/OnboardingTour";
import { cn } from "@/lib/utils";

type DashboardTab = 
  | "overview" 
  | "prebuy" 
  | "simulator" 
  | "ai_advisor" 
  | "lookthrough" 
  | "feebleed" 
  | "statement";

export default function DashboardPage() {
  const { openSyncModal, holdings, getTotalPortfolioValue, getTotalGainValue, getTotalGainPercent } = usePortfolioStore();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [pnlMode, setPnlMode] = useState<"total" | "day">("total");

  // Brief loading state
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  const { totalValue, totalGain, gainPercent, annualBleed, topExposure } = useMemo(() => {
    const value = getTotalPortfolioValue();
    const gain = getTotalGainValue();
    return {
      totalValue: value,
      totalGain: gain,
      gainPercent: getTotalGainPercent(),
      annualBleed: MOCK_WASTED_FEES.annualBleedAmount,
      topExposure: MOCK_TOP_EXPOSURES[0],
    };
  }, [holdings, getTotalPortfolioValue, getTotalGainValue, getTotalGainPercent]);

  const tabs: { id: DashboardTab; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
    { id: "overview", label: "Executive Terminal", icon: Activity },
    { id: "prebuy", label: "Pre-Buy Overlap Radar", icon: ShieldCheck },
    { id: "simulator", label: "Crash Stress-Tester", icon: SlidersHorizontal },
    { id: "ai_advisor", label: "AI Wealth Assistant", icon: Bot },
    { id: "lookthrough", label: "Stock Look-Through", icon: Layers },
    { id: "feebleed", label: "Fee Bleed & Direct", icon: Coins },
    { id: "statement", label: "CAS & Live Trades", icon: FileText },
  ];

  // Only the first 4 tabs show as buttons; the rest live in a "More" menu so
  // the tab bar doesn't force all 7 options into view at once.
  const PRIMARY_TAB_COUNT = 4;
  const primaryTabs = tabs.slice(0, PRIMARY_TAB_COUNT);
  const moreTabs = tabs.slice(PRIMARY_TAB_COUNT);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMoreOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMoreOpen]);

  const hasHoldings = holdings && holdings.length > 0;

  return (
    <div className="space-y-8 pb-16 max-w-[1440px] mx-auto">
      <OnboardingTour />
      
      {/* Clean Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Portfolio Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consolidated Look-Through · AMFI & NSE Synced · 8 Mutual Funds · 6 Equities
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => openSyncModal("OTP")} size="sm" className="text-xs font-semibold gap-1.5 h-8.5 px-3.5">
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Sync Live</span>
          </Button>

          <Link href="/advisor">
            <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5 h-8.5 px-3 border-border bg-card text-foreground hover:bg-accent">
              <Download className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Export</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Clean Minimal KPI Metric Cards */}
      {!hasHoldings ? (
        <EmptyState
          icon={Inbox}
          title="No portfolio connected yet"
          description="Connect via Account Aggregator (1-OTP) or upload a CAS statement to run your first diagnostic."
          actionLabel="Connect portfolio"
          onAction={() => openSyncModal("OTP")}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Net Worth Card */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-sm hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Net Portfolio Value</span>
              <div className="flex items-center gap-1 bg-accent/80 p-0.5 rounded-lg border border-border">
                <button
                  onClick={() => setPnlMode("total")}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-mono cursor-pointer transition-all",
                    pnlMode === "total" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  1Y
                </button>
                <button
                  onClick={() => setPnlMode("day")}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-mono cursor-pointer transition-all",
                    pnlMode === "day" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  1D
                </button>
              </div>
            </div>
            
            <p className="font-finance text-2xl sm:text-[30px] font-bold text-foreground tabular-nums tracking-tight">
              <CountUp value={totalValue} prefix="₹" />
            </p>

            {pnlMode === "total" ? (
              <div className="flex items-center gap-1.5 text-xs text-[var(--positive)] font-semibold tabular-nums font-finance">
                <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>+₹{totalGain.toLocaleString("en-IN")} (+{gainPercent.toFixed(2)}%)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-[var(--positive)] font-semibold tabular-nums font-finance">
                <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>+₹18,500 (+0.53%) Today</span>
              </div>
            )}
          </div>

          {/* Diagnostic Health Score (Interactive Click -> Portfolio X-Ray) */}
          <Link href="/portfolio-xray" className="block">
            <div className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-sm hover:border-primary/50 hover:bg-accent/30 transition-all cursor-pointer group h-full">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span className="group-hover:text-foreground transition-colors">Diagnostic Health Score</span>
                <Activity className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-2xl sm:text-[30px] font-bold text-foreground tabular-nums font-finance">
                <CountUp value={MOCK_HEALTH_SCORE.overallScore} />
                <span className="text-xs font-normal text-muted-foreground"> / 900</span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Grade: <strong className="text-[var(--positive)]">Healthy</strong></span>
                <span className="text-primary font-semibold group-hover:underline">View X-Ray →</span>
              </div>
            </div>
          </Link>

          {/* Top Single Stock Exposure (Interactive Click -> Look-Through Tab) */}
          <div 
            onClick={() => setActiveTab("lookthrough")}
            className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-sm hover:border-primary/50 hover:bg-accent/30 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span className="group-hover:text-foreground transition-colors">Top Single-Stock Weight</span>
              <Flame className="w-4 h-4 text-muted-foreground group-hover:text-[var(--negative)] transition-colors" />
            </div>
            <p className="text-2xl sm:text-[30px] font-bold text-[var(--negative)] tabular-nums font-finance">
              <CountUp value={topExposure.totalTruePercent} decimals={1} suffix="%" />
            </p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="truncate">{topExposure.companyName}</span>
              <span className="text-primary font-semibold group-hover:underline shrink-0 ml-1">Look-Through →</span>
            </div>
          </div>

          {/* Annual Fee Bleed (Interactive Click -> Fee Bleed Tab) */}
          <div 
            onClick={() => setActiveTab("feebleed")}
            className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-sm hover:border-primary/50 hover:bg-accent/30 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span className="group-hover:text-foreground transition-colors">Annual Fee Bleed</span>
              <Coins className="w-4 h-4 text-muted-foreground group-hover:text-[var(--warning)] transition-colors" />
            </div>
            <p className="text-2xl sm:text-[30px] font-bold text-[var(--warning)] tabular-nums font-finance">
              <CountUp value={annualBleed} prefix="₹" />
            </p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>10Y Loss: <strong className="text-foreground">₹4.35L</strong></span>
              <span className="text-primary font-semibold group-hover:underline">Switch Direct →</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tab Bar */}
      <div className="border-b border-border pb-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {primaryTabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border",
                  isActive 
                    ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={2} />
                <span>{t.label}</span>
              </button>
            );
          })}

          {moreTabs.length > 0 && (
            <div className="relative" ref={moreMenuRef}>
              {(() => {
                const activeMoreTab = moreTabs.find((t) => t.id === activeTab);
                const isMoreActive = !!activeMoreTab;
                return (
                  <button
                    onClick={() => setIsMoreOpen((v) => !v)}
                    aria-expanded={isMoreOpen}
                    aria-haspopup="menu"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border",
                      isMoreActive
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    {activeMoreTab ? <activeMoreTab.icon className="w-4 h-4" strokeWidth={2} /> : <MoreHorizontal className="w-4 h-4" strokeWidth={2} />}
                    <span>{activeMoreTab ? activeMoreTab.label : "More"}</span>
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isMoreOpen && "rotate-180")} strokeWidth={2} />
                  </button>
                );
              })()}

              {isMoreOpen && (
                <div role="menu" className="absolute left-0 top-full mt-1.5 w-56 rounded-xl border border-border bg-card shadow-xl shadow-black/20 py-1.5 z-20 animate-fade-in-up motion-reduce:animate-none">
                  {moreTabs.map((t) => {
                    const Icon = t.icon;
                    const isActive = activeTab === t.id;
                    return (
                      <button
                        key={t.id}
                        role="menuitem"
                        onClick={() => { setActiveTab(t.id); setIsMoreOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer text-left",
                          isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <Icon className="w-4 h-4" strokeWidth={2} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-200">
        
        {/* 1. Executive Terminal (Spacious & Clean Overview) */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fade-in-up">
            
            {/* Top Interactive Growth Chart */}
            <InteractivePortfolioChart />

            {/* Capital & Sector Allocation Breakdown */}
            <InteractiveAllocationBreakdown />

            {/* Quick Diagnostic Summary Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Top Double-Dipping Flags</h3>
                    <p className="text-xs text-muted-foreground font-mono">Stocks held directly + inside your mutual funds</p>
                  </div>
                  <button onClick={() => setActiveTab("lookthrough")} className="text-xs text-primary font-bold hover:underline cursor-pointer">
                    View All (12)
                  </button>
                </div>

                <div className="space-y-2.5 text-xs font-mono">
                  {MOCK_TOP_EXPOSURES.slice(0, 3).map((item) => (
                    <div
                      key={item.ticker}
                      className="p-3.5 rounded-xl bg-accent/40 border border-border flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-foreground font-sans text-sm">{item.companyName}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Direct: ₹{(item.directHoldingValue / 100000).toFixed(2)}L · Inside MFs: ₹
                          {(item.indirectHoldingValue / 100000).toFixed(2)}L
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[var(--negative)] text-sm tabular-nums">{item.totalTruePercent}%</p>
                        <p className="text-[10px] text-muted-foreground font-sans">{item.sector}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Annual Fee Bleed Summary</h3>
                    <p className="text-xs text-muted-foreground font-mono">Regular plan commissions + duplicate TER drag</p>
                  </div>
                  <button onClick={() => setActiveTab("feebleed")} className="text-xs text-primary font-bold hover:underline cursor-pointer">
                    Calculate 10Y
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-accent/40 border border-border space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-sans">Regular Plan Commissions</span>
                    <span className="font-bold text-foreground tabular-nums">₹16,600 / yr</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-sans">Duplicate Overlap TER</span>
                    <span className="font-bold text-foreground tabular-nums">₹8,200 / yr</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between items-center">
                    <span className="font-bold text-foreground font-sans">Total Annual Wealth Loss</span>
                    <span className="font-bold text-[var(--negative)] text-sm tabular-nums">₹24,800 / yr</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--positive-soft)] border border-[var(--positive)]/20 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[var(--positive)] shrink-0" strokeWidth={2} />
                  <span className="text-muted-foreground text-xs font-sans">
                    Switching 3 Regular funds to Direct adds <span className="font-bold text-foreground font-mono">₹4.35L</span> to your 10Y wealth compounding.
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 2. Dedicated Pre-Buy Overlap Radar Tab */}
        {activeTab === "prebuy" && (
          <div className="space-y-8 animate-fade-in-up">
            <PreBuyOverlapGuard />
          </div>
        )}

        {/* 3. Dedicated Crash Stress-Tester Tab */}
        {activeTab === "simulator" && (
          <div className="space-y-8 animate-fade-in-up">
            <InteractiveCrashBar />
            <CrashSimulator />
          </div>
        )}

        {/* 4. Dedicated WhatsApp AI Advisor Tab */}
        {activeTab === "ai_advisor" && (
          <div className="space-y-8 animate-fade-in-up">
            <InteractiveWhatsAppAgent />
          </div>
        )}

        {/* 5. Stock Look-Through Tab */}
        {activeTab === "lookthrough" && (
          <div className="space-y-8 animate-fade-in-up">
            <LookThroughTable />
          </div>
        )}

        {/* 6. Fee Bleed & Direct Switcher Tab */}
        {activeTab === "feebleed" && (
          <div className="space-y-8 animate-fade-in-up">
            <FeeBleedCalculator />
          </div>
        )}

        {/* 7. CAS Statements & Trades Tab */}
        {activeTab === "statement" && (
          <div className="space-y-8 animate-fade-in-up">
            <CasPdfUploader />
            <VirtualizedTransactionTable transactions={MOCK_TRANSACTIONS_50} />
          </div>
        )}

      </div>
    </div>
  );
}
