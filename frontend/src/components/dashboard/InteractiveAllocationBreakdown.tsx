"use client";

import React, { useState, useMemo } from "react";
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
import { usePortfolioStore } from "@/store/portfolioStore";

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

const SECTOR_COLORS: Record<string, string> = {
  "Financial Services": "#3b82f6",
  "Banking": "#3b82f6",
  "Technology": "#6366f1",
  "Information Technology": "#6366f1",
  "Technology & IT": "#6366f1",
  "Energy": "#0ea5e9",
  "Energy & Conglomerates": "#0ea5e9",
  "Oil & Gas": "#0ea5e9",
  "Automotive & EV": "#f59e0b",
  "Automobile": "#f59e0b",
  "Consumer & FMCG": "#8b5cf6",
  "FMCG": "#8b5cf6",
  "Healthcare & Pharma": "#10b981",
  "Healthcare": "#10b981",
  "Metals & Mining": "#d97706",
  "Infrastructure": "#f97316",
  "Others & Cash": "#64748b",
};

export function InteractiveAllocationBreakdown() {
  const { holdings } = usePortfolioStore();

  const totalValue = useMemo(() => {
    return holdings.reduce((sum, h) => sum + (Number(h.currentValue) || 0), 0);
  }, [holdings]);

  const assetClasses: AssetClassItem[] = useMemo(() => {
    if (holdings.length === 0 || totalValue === 0) return [];
    
    let equityVal = 0;
    let debtVal = 0;
    let globalVal = 0;
    let otherVal = 0;

    for (const h of holdings) {
      const val = Number(h.currentValue) || 0;
      const ac = String(h.assetClass || "").toLowerCase();
      const type = String(h.type || "").toLowerCase();
      const name = String(h.name || "").toLowerCase();

      const isDebt = ac.includes("debt") || ac.includes("fixed") || type === "fd" ||
        name.includes("bond") || name.includes("liquid") || name.includes("gilt") ||
        name.includes("money market") || name.includes("overnight") || name.includes("treasury") ||
        name.includes("short term") || name.includes("corporate bond") || name.includes("banking & psu") ||
        name.includes("dynamic bond") || name.includes("credit risk");

      const isGlobal = ac.includes("global") || ac.includes("international") ||
        name.includes("nasdaq") || name.includes("us ") || name.includes("overseas") ||
        name.includes("world") || name.includes("s&p 500");

      if (isGlobal) {
        globalVal += val;
      } else if (isDebt) {
        debtVal += val;
      } else if (ac.includes("equity") || type === "stock" || type.includes("mutual")) {
        equityVal += val;
      } else {
        otherVal += val;
      }
    }

    const items: AssetClassItem[] = [];
    if (equityVal > 0) {
      items.push({
        name: "Indian Equities (Direct + MFs)",
        value: equityVal,
        percent: Number(((equityVal / totalValue) * 100).toFixed(1)),
        color: "#3b82f6",
        description: "Direct stocks and domestic active mutual fund portfolios"
      });
    }
    if (debtVal > 0) {
      items.push({
        name: "Fixed Income & Debt",
        value: debtVal,
        percent: Number(((debtVal / totalValue) * 100).toFixed(1)),
        color: "#64748b",
        description: "Debt mutual funds, corporate bonds and fixed deposits"
      });
    }
    if (globalVal > 0) {
      items.push({
        name: "Global Equities",
        value: globalVal,
        percent: Number(((globalVal / totalValue) * 100).toFixed(1)),
        color: "#6366f1",
        description: "International index funds, ETFs and foreign equities"
      });
    }
    if (otherVal > 0) {
      items.push({
        name: "Other Assets / Cash",
        value: otherVal,
        percent: Number(((otherVal / totalValue) * 100).toFixed(1)),
        color: "#10b981",
        description: "Cash balances and other financial instruments"
      });
    }

    return items;
  }, [holdings, totalValue]);

  const sectors: SectorItem[] = useMemo(() => {
    if (holdings.length === 0 || totalValue === 0) return [];

    const map = new Map<string, { value: number; holdings: string[] }>();

    for (const h of holdings) {
      const nameLower = String(h.name || "").toLowerCase();
      const acLower = String(h.assetClass || "").toLowerCase();
      const typeLower = String(h.type || "").toLowerCase();

      const isDebt = acLower.includes("debt") || acLower.includes("fixed") || typeLower === "fd" ||
        nameLower.includes("bond") || nameLower.includes("liquid") || nameLower.includes("gilt") ||
        nameLower.includes("money market") || nameLower.includes("overnight") || nameLower.includes("treasury");

      const sec = h.sector && h.sector !== "Diversified MF" && h.sector !== "Equity" 
        ? h.sector 
        : (isDebt ? "Fixed Income & Debt" : (h.type === "Mutual Fund" ? "Diversified Equity" : "General Industry"));
      const val = Number(h.currentValue) || 0;
      
      const existing = map.get(sec) || { value: 0, holdings: [] };
      existing.value += val;
      if (h.name && !existing.holdings.includes(h.name)) {
        existing.holdings.push(h.name);
      }
      map.set(sec, existing);
    }

    const fallbackColors = ["#3b82f6", "#6366f1", "#0ea5e9", "#f59e0b", "#8b5cf6", "#10b981", "#64748b", "#ec4899"];
    let colorIdx = 0;

    const list: SectorItem[] = [];
    map.forEach((data, secName) => {
      const pct = Number(((data.value / totalValue) * 100).toFixed(1));
      const riskRating: "Low" | "Moderate" | "High" = pct > 25 ? "High" : pct > 15 ? "Moderate" : "Low";
      const color = SECTOR_COLORS[secName] || fallbackColors[colorIdx % fallbackColors.length];
      colorIdx++;

      list.push({
        name: secName,
        percent: pct,
        value: data.value,
        color,
        topHoldings: data.holdings.slice(0, 4),
        riskRating
      });
    });

    return list.sort((a, b) => b.value - a.value);
  }, [holdings, totalValue]);

  // Dynamic Market Mood Index (MMI) calculated strictly from extracted CAS holdings
  const mmiData = useMemo(() => {
    if (holdings.length === 0 || totalValue <= 0) {
      return null;
    }

    let equityValue = 0;
    let debtValue = 0;
    let highRiskValue = 0;
    let totalInvestedCost = 0;
    let totalReturnsVal = 0;
    let regularPlanValue = 0;
    let regularCount = 0;

    let maxHoldingVal = 0;
    let topHoldingName = "";
    let topHighRiskName = "";
    let maxHighRiskVal = 0;

    for (const h of holdings) {
      const val = Number(h.currentValue) || 0;
      const qty = Number((h as any).units ?? h.quantity) || 0;
      const costPerUnit = Number(h.avgPrice ?? (h as any).averageCost) || 0;
      const cost = qty > 0 && costPerUnit > 0 ? qty * costPerUnit : 0;
      totalInvestedCost += cost;

      const retVal = Number(h.returnsValue) || 0;
      totalReturnsVal += retVal;

      if (val > maxHoldingVal) {
        maxHoldingVal = val;
        topHoldingName = h.name || "Top Holding";
      }

      const nameLower = String(h.name || "").toLowerCase();
      const acLower = String(h.assetClass || "").toLowerCase();
      const typeLower = String(h.type || "").toLowerCase();

      const isDebt = acLower.includes("debt") || acLower.includes("fixed") || typeLower === "fd" ||
        nameLower.includes("bond") || nameLower.includes("liquid") || nameLower.includes("gilt") ||
        nameLower.includes("money market") || nameLower.includes("overnight") || nameLower.includes("treasury") ||
        nameLower.includes("short term") || nameLower.includes("corporate bond") || nameLower.includes("banking & psu") ||
        nameLower.includes("dynamic bond") || nameLower.includes("credit risk");

      const isHighRisk = h.riskGrade === "High" ||
        typeLower === "stock" ||
        nameLower.includes("small cap") ||
        nameLower.includes("smallcap") ||
        nameLower.includes("micro cap") ||
        nameLower.includes("mid cap") ||
        nameLower.includes("midcap") ||
        nameLower.includes("thematic") ||
        nameLower.includes("sectoral") ||
        nameLower.includes("contra") ||
        nameLower.includes("opportunities") ||
        nameLower.includes("technology") ||
        nameLower.includes("pharma") ||
        nameLower.includes("infra") ||
        nameLower.includes("momentum");

      if (isHighRisk) {
        highRiskValue += val;
        if (val > maxHighRiskVal) {
          maxHighRiskVal = val;
          topHighRiskName = h.name;
        }
      }

      if (isDebt) {
        debtValue += val;
      } else {
        equityValue += val;
      }

      const isRegular = h.planType === "Regular" || nameLower.includes("regular");
      if (isRegular) {
        regularPlanValue += val;
        regularCount++;
      }
    }

    const equityPct = Number(((equityValue / totalValue) * 100).toFixed(1));
    const debtPct = Number(((debtValue / totalValue) * 100).toFixed(1));
    const highRiskPct = Number(((highRiskValue / totalValue) * 100).toFixed(1));
    const regularBleedAnnually = Math.round(regularPlanValue * 0.008);

    // Dynamic return %
    let returnPct = 0;
    if (totalInvestedCost > 0) {
      returnPct = Number((((totalValue - totalInvestedCost) / totalInvestedCost) * 100).toFixed(1));
    } else if (totalReturnsVal !== 0 && totalValue > 0) {
      const impliedCost = totalValue - totalReturnsVal;
      returnPct = impliedCost > 0 ? Number(((totalReturnsVal / impliedCost) * 100).toFixed(1)) : 0;
    } else {
      const weightedRet = holdings.reduce((sum, h) => sum + ((Number(h.returns) || 0) * (Number(h.currentValue) || 0)), 0);
      returnPct = Number((weightedRet / (totalValue || 1)).toFixed(1));
    }

    const topHoldingPct = Number(((maxHoldingVal / totalValue) * 100).toFixed(1));

    // Dynamic MMI Factors (0-100 scale)
    const equityFactor = Math.min(100, Math.max(0, equityPct));
    const riskFactor = Math.min(100, Math.max(0, highRiskPct * 1.6));

    let momentumFactor = 50;
    if (returnPct >= 35) {
      momentumFactor = Math.min(100, 75 + (returnPct - 35) * 0.8);
    } else if (returnPct >= 15) {
      momentumFactor = 60 + ((returnPct - 15) / 20) * 15;
    } else if (returnPct >= 0) {
      momentumFactor = 45 + (returnPct / 15) * 15;
    } else if (returnPct >= -15) {
      momentumFactor = 25 + ((returnPct + 15) / 15) * 20;
    } else {
      momentumFactor = Math.max(5, 25 + returnPct * 0.5);
    }

    const concentrationFactor = Math.min(100, Math.max(20, topHoldingPct * 2.2));

    const rawScore = (equityFactor * 0.35) + (riskFactor * 0.25) + (momentumFactor * 0.25) + (concentrationFactor * 0.15);
    const score = Math.round(Math.min(96, Math.max(6, rawScore)));

    let zone: {
      label: string;
      range: string;
      colorClass: string;
      borderClass: string;
      bgSoftClass: string;
      description: string;
      strategy: string;
    };

    if (score < 30) {
      zone = {
        label: "EXTREME FEAR",
        range: "0-29",
        colorClass: "text-[var(--negative)]",
        borderClass: "border-[var(--negative)]/30",
        bgSoftClass: "bg-[var(--negative-soft)]",
        description: "Defensive / Capital Preservation",
        strategy: `Extracted CAS data reveals a defensive portfolio with ${debtPct}% allocated to fixed income/debt and only ${equityPct}% in equities. While shielded from market corrections, evaluate systematic SIP deployment into broad index funds to prevent inflation drag and capture long-term compounding.`
      };
    } else if (score < 50) {
      zone = {
        label: "FEAR",
        range: "30-49",
        colorClass: "text-[var(--warning)]",
        borderClass: "border-[var(--warning)]/30",
        bgSoftClass: "bg-[var(--warning-soft)]",
        description: "Conservative Cushion / Low Beta",
        strategy: `With ${equityPct}% equity allocation and ${debtPct}% debt cushion, your portfolio exhibits cautious sentiment. Drawdown risk is well contained. Maintain disciplined monthly SIPs in large-cap or flexi-cap core funds to build steady compounding momentum.`
      };
    } else if (score < 70) {
      zone = {
        label: "GREED",
        range: "50-69",
        colorClass: "text-[var(--positive)]",
        borderClass: "border-[var(--positive)]/30",
        bgSoftClass: "bg-[var(--positive-soft)]",
        description: "Active Growth / Bullish Upside",
        strategy: `Your extracted CAS holdings indicate strong equity participation (${equityPct}% equity, with ${highRiskPct}% in high-beta/small-cap allocations). Overall unrealized gain stands at ${returnPct >= 0 ? "+" : ""}${returnPct}%. Continue scheduled SIPs and utilize periodic rebalancing to avoid single-stock or sector concentration drift.`
      };
    } else {
      zone = {
        label: "EXTREME GREED",
        range: "70-100",
        colorClass: "text-purple-400",
        borderClass: "border-purple-500/30",
        bgSoftClass: "bg-purple-500/10",
        description: "Aggressive / Small-Cap Concentration",
        strategy: `Extracted CAS shows an aggressive equity tilt (${equityPct}% equity, ${highRiskPct}% in high-risk/small-cap assets${topHighRiskName ? ` led by ${topHighRiskName}` : ""}). In extreme greed conditions, avoid aggressive lump sum top-ups at peak valuations. Maintain disciplined SIPs and review profit-booking or rebalancing into debt.`
      };
    }

    if (regularCount > 0 && regularBleedAnnually > 0) {
      zone.strategy += ` ⚠️ Detected ₹${regularBleedAnnually.toLocaleString("en-IN")}/yr in regular plan distributor commission bleed across ${regularCount} schemes in your CAS. Switching to Direct plans will eliminate this fee.`;
    }

    return {
      score,
      zone,
      equityPct,
      equityValue,
      debtPct,
      debtValue,
      highRiskPct,
      highRiskValue,
      returnPct,
      holdingsCount: holdings.length,
      topHoldingName,
      topHoldingPct,
      regularBleedAnnually,
      regularCount,
    };
  }, [holdings, totalValue]);

  const [selectedSector, setSelectedSector] = useState<SectorItem | null>(null);
  const [activeTab, setActiveTab] = useState<"asset" | "sector">("sector");

  const currentSelectedSector = selectedSector || (sectors.length > 0 ? sectors[0] : null);

  if (holdings.length === 0 || (sectors.length === 0 && assetClasses.length === 0) || !mmiData) {
    return null;
  }

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
              Sectors ({sectors.length})
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
              Asset Classes ({assetClasses.length})
            </button>
          </div>
        </div>

        {activeTab === "sector" ? (
          <div className="space-y-4">
            {/* Sector Progress Bar Stack */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-[var(--background-elevated)] border border-border">
              {sectors.map((sec) => (
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
              {sectors.map((sec) => {
                const isSelected = currentSelectedSector?.name === sec.name;
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
            {currentSelectedSector && (
              <div className="p-4 rounded-xl bg-[var(--background-elevated)] border border-border/80 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/70">
                  <span className="font-bold text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentSelectedSector.color }} />
                    {currentSelectedSector.name} Deep Dive
                  </span>
                  <span className="font-mono font-bold text-primary tabular-nums text-xs">
                    {currentSelectedSector.percent}% of Net Worth (₹{(currentSelectedSector.value / 100000).toFixed(2)}L)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Major holdings contributing to this category in your portfolio:
                </p>
                <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                  {currentSelectedSector.topHoldings.map((h) => (
                    <span key={h} className="px-2.5 py-1 rounded-lg bg-[var(--card)] border border-border font-medium text-foreground">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3">
              {assetClasses.map((ac) => (
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

      {/* Right: Dynamic Indian Market Mood Index (Derived Strictly from CAS Extracted Data) */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-5 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[var(--nse-gold-soft)] text-[var(--nse-gold)] border border-[var(--nse-gold)]/30 flex items-center justify-center font-bold">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Market Mood Index</h3>
                <p className="text-xs text-muted-foreground font-mono">Extracted CAS Portfolio Sentiment</p>
              </div>
            </div>
            <span className={cn(
              "px-3 py-1 rounded-full border text-xs font-bold font-mono transition-colors",
              mmiData.zone.bgSoftClass,
              mmiData.zone.colorClass,
              mmiData.zone.borderClass
            )}>
              {mmiData.zone.label} ({mmiData.score})
            </span>
          </div>

          {/* Sentiment Visual Gauge */}
          <div className="pt-4 pb-2 text-center space-y-2">
            <div className="relative inline-block">
              <span className={cn("text-5xl font-extrabold font-mono tracking-tight tabular-nums", mmiData.zone.colorClass)}>
                {mmiData.score}
              </span>
              <span className="text-xs text-muted-foreground font-mono block">
                out of 100 • {mmiData.zone.description}
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-accent/40 border border-border overflow-hidden relative mt-4">
              <div 
                className="h-full bg-gradient-to-r from-[var(--negative)] via-[var(--warning)] to-[var(--positive)] rounded-full"
                style={{ width: "100%" }}
              />
              {/* Dynamic pointer indicator */}
              <div 
                className="absolute top-0 bottom-0 w-2.5 bg-white shadow-lg rounded-full -ml-1.5 transition-all duration-500 border border-black/20"
                style={{ left: `${Math.min(97, Math.max(3, mmiData.score))}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] font-mono text-muted-foreground pt-1">
              <span>0 (Extreme Fear)</span>
              <span>50 (Neutral)</span>
              <span>100 (Extreme Greed)</span>
            </div>
          </div>

          {/* CAS Extracted Drivers (Dynamic Metrics Grid) */}
          <div className="grid grid-cols-2 gap-2 pt-1 pb-1">
            <div className="p-2.5 rounded-xl bg-accent/30 border border-border/80">
              <div className="text-[10px] font-mono text-muted-foreground">Equity Exposure</div>
              <div className="text-xs font-bold font-mono text-foreground tabular-nums">
                {mmiData.equityPct}% <span className="text-[10px] text-muted-foreground font-normal">(₹{(mmiData.equityValue / 100000).toFixed(1)}L)</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-accent/30 border border-border/80">
              <div className="text-[10px] font-mono text-muted-foreground">Small/Mid-Cap Tilt</div>
              <div className="text-xs font-bold font-mono text-foreground tabular-nums">
                {mmiData.highRiskPct}% <span className="text-[10px] text-muted-foreground font-normal">(₹{(mmiData.highRiskValue / 100000).toFixed(1)}L)</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-accent/30 border border-border/80">
              <div className="text-[10px] font-mono text-muted-foreground">Extracted P&L Return</div>
              <div className={cn(
                "text-xs font-bold font-mono tabular-nums",
                mmiData.returnPct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
              )}>
                {mmiData.returnPct >= 0 ? "+" : ""}{mmiData.returnPct}%
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-accent/30 border border-border/80">
              <div className="text-[10px] font-mono text-muted-foreground">Extracted Assets</div>
              <div className="text-xs font-bold font-mono text-foreground tabular-nums">
                {mmiData.holdingsCount} Holdings
              </div>
            </div>
          </div>

          {/* Dynamic Portfolio Action Strategy Derived from CAS */}
          <div className="p-3.5 rounded-xl bg-accent/40 border border-border space-y-1.5 text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5 text-[11.5px]">
              <Info className="w-3.5 h-3.5 text-primary" />
              Dynamic Portfolio Action Strategy:
            </span>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">
              {mmiData.zone.strategy}
            </p>
          </div>
        </div>

        {/* Bottom Fast Action */}
        <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>Extracted from CAS • {mmiData.holdingsCount} Assets</span>
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
