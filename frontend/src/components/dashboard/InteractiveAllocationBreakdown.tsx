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

      if (ac.includes("global") || ac.includes("international") || name.includes("nasdaq") || name.includes("us ")) {
        globalVal += val;
      } else if (ac.includes("debt") || ac.includes("fixed") || type === "fd" || name.includes("bond") || name.includes("liquid")) {
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
      const sec = h.sector && h.sector !== "Diversified MF" && h.sector !== "Equity" 
        ? h.sector 
        : (h.type === "Mutual Fund" ? "Diversified Equity" : "General Industry");
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

  const [selectedSector, setSelectedSector] = useState<SectorItem | null>(null);
  const [activeTab, setActiveTab] = useState<"asset" | "sector">("sector");

  const currentSelectedSector = selectedSector || (sectors.length > 0 ? sectors[0] : null);

  if (holdings.length === 0 || (sectors.length === 0 && assetClasses.length === 0)) {
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
