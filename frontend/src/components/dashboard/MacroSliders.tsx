"use client";

import React from "react";
import { 
  SlidersHorizontal, 
  RotateCcw, 
  DollarSign, 
  Fuel, 
  Percent, 
  Building,
  Laptop
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { EmptyState } from "@/components/ui/EmptyState";

export function MacroSliders() {
  const { 
    macroConfig, 
    updateMacroConfig, 
    resetMacroConfig, 
    getMacroStressedValue,
    holdings,
    openSyncModal
  } = usePortfolioStore();

  if (!holdings || holdings.length === 0) {
    return (
      <EmptyState
        icon={SlidersHorizontal}
        title="No portfolio data to stress test"
        description="Upload a CAS statement or connect your account to simulate dynamic macro risk scenarios and sector shock impacts on your actual holdings."
        actionLabel="Connect Portfolio"
        onAction={() => openSyncModal("CAS")}
      />
    );
  }

  const { stressedValue, dropPercent, dropRupees } = getMacroStressedValue();

  return (
    <div className="rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <SlidersHorizontal className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Dynamic Macro Risk Sliders</h3>
            <p className="text-xs text-muted-foreground">Real-time portfolio stress engine based on macroeconomic shocks</p>
          </div>
        </div>

        <button 
          onClick={resetMacroConfig}
          className="px-3 py-1.5 rounded-xl border border-border bg-[var(--background-elevated)] text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span>Reset Sliders</span>
        </button>
      </div>

      {/* Sliders Grid & Stressed P&L Impact */}
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 mt-6 items-center">
        
        {/* Sliders Control Panel */}
        <div className="space-y-4 p-5 rounded-2xl bg-[var(--background-elevated)] border border-border/70">
          
          {/* Crude Oil */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-[var(--warning)]" strokeWidth={1.75} />
                <span>Brent Crude Oil Price ($/barrel)</span>
              </span>
              <span className="font-mono font-bold text-foreground tabular-nums">${macroConfig.crudePrice} / bbl</span>
            </div>
            <input 
              type="range" 
              min="65" 
              max="120" 
              value={macroConfig.crudePrice}
              onChange={(e) => updateMacroConfig({ crudePrice: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>$65 (Cooling)</span>
              <span className="text-foreground font-semibold">Base: $82</span>
              <span>$120 (War Spike)</span>
            </div>
          </div>

          {/* RBI Repo Rate */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
                <span>RBI Repo Interest Rate (%)</span>
              </span>
              <span className="font-mono font-bold text-foreground tabular-nums">{macroConfig.repoRate}%</span>
            </div>
            <input 
              type="range" 
              min="5.5" 
              max="8.0" 
              step="0.25"
              value={macroConfig.repoRate}
              onChange={(e) => updateMacroConfig({ repoRate: Number(e.target.value) })}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>5.50% (Dovish)</span>
              <span className="text-foreground font-semibold">Base: 6.50%</span>
              <span>8.00% (Hawkish)</span>
            </div>
          </div>

          {/* USD/INR */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[var(--positive)]" strokeWidth={1.75} />
                <span>USD / INR Exchange Rate (₹)</span>
              </span>
              <span className="font-mono font-bold text-foreground tabular-nums">₹{macroConfig.usdInr}</span>
            </div>
            <input 
              type="range" 
              min="80" 
              max="95" 
              step="0.5"
              value={macroConfig.usdInr}
              onChange={(e) => updateMacroConfig({ usdInr: Number(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>₹80 (Strong Rupee)</span>
              <span className="text-foreground font-semibold">Base: ₹84.2</span>
              <span>₹95 (Depreciation)</span>
            </div>
          </div>

          {/* Sector Shocks */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                <Building className="w-3 h-3 text-[var(--info)]" strokeWidth={1.75} />
                <span>Banking Sector</span>
              </label>
              <input 
                type="range" 
                min="-25" 
                max="15" 
                value={macroConfig.bankingSectorShock}
                onChange={(e) => updateMacroConfig({ bankingSectorShock: Number(e.target.value) })}
                className="w-full accent-[var(--primary)] cursor-pointer"
              />
              <div className="text-right font-mono text-[10px] font-bold text-muted-foreground tabular-nums">
                {macroConfig.bankingSectorShock > 0 ? "+" : ""}{macroConfig.bankingSectorShock}%
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                <Laptop className="w-3 h-3 text-[var(--info)]" strokeWidth={1.75} />
                <span>IT Sector</span>
              </label>
              <input 
                type="range" 
                min="-25" 
                max="15" 
                value={macroConfig.itSectorShock}
                onChange={(e) => updateMacroConfig({ itSectorShock: Number(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="text-right font-mono text-[10px] font-bold text-muted-foreground tabular-nums">
                {macroConfig.itSectorShock > 0 ? "+" : ""}{macroConfig.itSectorShock}%
              </div>
            </div>
          </div>
        </div>

        {/* Live Stressed Output Card */}
        <div className="p-6 rounded-2xl bg-[var(--background-elevated)] border border-border/70 space-y-4 font-mono">
          <div className="flex items-center justify-between border-b border-border/70 pb-3 font-sans">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Macro Shock Output</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
              dropPercent >= 0 
                ? "bg-[var(--positive)]/10 text-[var(--positive)] border border-[var(--positive)]/20" 
                : "bg-[var(--negative)]/10 text-[var(--negative)] border border-[var(--negative)]/20"
            }`}>
              {dropPercent >= 0 ? "Resilient" : "Under Pressure"}
            </span>
          </div>

          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground font-sans">Stressed Portfolio Value</p>
            <p className="text-3xl font-semibold text-foreground mt-1 tabular-nums">
              ₹{stressedValue.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[var(--card)] border border-border/70">
              <span className="text-[10px] uppercase text-muted-foreground font-sans block">Net P&L Shock</span>
              <span className={`text-lg font-semibold tabular-nums ${dropRupees >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                {dropRupees >= 0 ? "+" : ""}₹{dropRupees.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--card)] border border-border/70">
              <span className="text-[10px] uppercase text-muted-foreground font-sans block">Percentage Shift</span>
              <span className={`text-lg font-semibold tabular-nums ${dropPercent >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                {dropPercent >= 0 ? "+" : ""}{dropPercent}%
              </span>
            </div>
          </div>

          <p className="text-[11px] font-sans text-muted-foreground leading-relaxed">
            Your 34% banking weight makes you sensitive to RBI repo rate hikes, while your USD tech allocation in Parag Parikh acts as an automatic dollar hedge.
          </p>
        </div>
      </div>
    </div>
  );
}
