"use client";

import React, { useState } from "react";
import { 
  History, 
  ShieldCheck, 
  RotateCcw, 
  Zap
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from "recharts";
import { MOCK_CRASH_SCENARIOS } from "@/data/mock/portfolioData";
import { usePortfolioStore } from "@/store/portfolioStore";

export function CrashSimulator() {
  const { getTotalPortfolioValue, openPanicGuard } = usePortfolioStore();
  const portfolioVal = getTotalPortfolioValue();

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("c1");
  const [customShock, setCustomShock] = useState<number>(30);
  const [isCustom, setIsCustom] = useState<boolean>(false);

  const selectedScenario = MOCK_CRASH_SCENARIOS.find(s => s.id === selectedScenarioId) || MOCK_CRASH_SCENARIOS[0];

  const estimatedDropPercent = isCustom 
    ? -(customShock * 0.78).toFixed(1) 
    : selectedScenario.portfolioImpact;

  const estimatedLossRupees = isCustom 
    ? Math.round(portfolioVal * (Number(estimatedDropPercent) / 100))
    : selectedScenario.estimatedLossRupees;

  const recoveryMonths = isCustom 
    ? Math.round(customShock * 0.6) 
    : selectedScenario.recoveryMonths;

  const chartData = selectedScenario.historicalNiftyPoints || [
    { month: "Base", nifty: 100, portfolio: 100 },
    { month: "Crash Bottom", nifty: 100 - customShock, portfolio: 100 + Number(estimatedDropPercent) },
    { month: "6 Mo", nifty: 85, portfolio: 90 },
    { month: "12 Mo", nifty: 105, portfolio: 110 },
    { month: "18 Mo", nifty: 120, portfolio: 125 }
  ];

  return (
    <div className="rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--negative)]/10 text-[var(--negative)] border border-[var(--negative)]/20 flex items-center justify-center font-bold">
            <History className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Historical Crash Stress-Tester</h3>
            <p className="text-xs text-muted-foreground">Time Machine Simulator: See how your current assets survive past market meltdowns</p>
          </div>
        </div>

        <button 
          onClick={openPanicGuard}
          className="px-3 py-1.5 rounded-xl border border-[var(--positive)]/30 bg-[var(--positive)]/10 text-[var(--positive)] text-xs font-semibold flex items-center gap-1.5 hover:bg-[var(--positive)]/20 transition-all duration-150 active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
          <span>Behavioral Panic Guard</span>
        </button>
      </div>

      {/* Scenario Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-5 p-1 bg-[var(--background-elevated)] rounded-xl border border-border/70">
        {MOCK_CRASH_SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => { setSelectedScenarioId(scenario.id); setIsCustom(false); }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer truncate ${
              !isCustom && selectedScenarioId === scenario.id
                ? "bg-primary text-white shadow-md shadow-black/40"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {scenario.name.split(" ")[0]} {scenario.name.split(" ")[1]}
          </button>
        ))}
        <button
          onClick={() => setIsCustom(true)}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
            isCustom
              ? "bg-primary text-white shadow-md shadow-black/40"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          Custom Shock
        </button>
      </div>

      {/* Main Stress Display Grid */}
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 mt-6 items-center">
        
        {/* Drawdown Curve Recharts */}
        <div className="p-5 rounded-2xl bg-[var(--background-elevated)] border border-border/70 space-y-3">
          <div className="flex items-center justify-between text-xs pb-1">
            <span className="font-semibold text-foreground">
              {isCustom ? "Simulated Shock Drawdown & Recovery Trajectory" : `${selectedScenario.name} (${selectedScenario.dateRange})`}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">Recovery: <strong className="text-[var(--positive)] tabular-nums">{recoveryMonths} Months</strong></span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c8a24b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#c8a24b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#232226" />
                <XAxis dataKey="month" stroke="#6f6d73" fontSize={10} tickLine={false} />
                <YAxis stroke="#6f6d73" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${Math.round(v/100000)}L`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "var(--card)", borderColor: "#2e2d32", borderRadius: "12px", fontSize: "11px", color: "#f2f1ed", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)" }}
                  formatter={(val: number | string | readonly (string | number)[] | undefined) => [
                    `₹${Number(val || 0).toLocaleString("en-IN")}`, 
                    "Portfolio Value"
                  ]}
                />
                <Area type="monotone" dataKey="portfolio" stroke="#c8a24b" strokeWidth={2} fillOpacity={1} fill="url(#portfolioGrad)" name="Your Portfolio" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-primary" /> Portfolio Trajectory</span>
            <span className="flex items-center gap-1.5 text-[var(--positive)] font-mono"><RotateCcw className="w-3 h-3" strokeWidth={1.75} /> Recovered in {recoveryMonths} mo</span>
          </div>
        </div>

        {/* Shock Metrics & Loss Breakdown */}
        <div className="space-y-4">
          {/* Custom slider if active */}
          {isCustom && (
            <div className="p-4 rounded-xl bg-[var(--background-elevated)] border border-border/70 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Simulate Nifty / Market Drop:</span>
                <span className="font-mono font-bold text-[var(--negative)] tabular-nums">-{customShock}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="60" 
                value={customShock}
                onChange={(e) => setCustomShock(Number(e.target.value))}
                className="w-full accent-[var(--negative)] cursor-pointer"
              />
            </div>
          )}

          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-[var(--background-elevated)] border border-border/70">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Simulated Drawdown</p>
              <p className="font-mono text-2xl font-semibold text-[var(--negative)] mt-1 tabular-nums">
                {estimatedDropPercent}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">Vs Nifty {isCustom ? `-${customShock}%` : `${selectedScenario.marketDrop}%`}</p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--background-elevated)] border border-border/70">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Estimated P&L Shock</p>
              <p className="font-mono text-xl font-semibold text-[var(--negative)] mt-1 tabular-nums">
                -₹{Math.abs(estimatedLossRupees).toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">On ₹{portfolioVal.toLocaleString("en-IN")}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--background-elevated)] border border-border/70 text-xs space-y-2">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
              <span>Diagnostic Takeaway:</span>
            </p>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              {selectedScenario.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
