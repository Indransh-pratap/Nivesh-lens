"use client";

import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Layers, 
  Calendar,
  Zap,
  Info,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

type Timeframe = "1D" | "1W" | "1M" | "1Y" | "3Y" | "5Y" | "ALL";

interface ChartDataPoint {
  date: string;
  portfolio: number;
  benchmark: number;
  invested: number;
  returns: number;
  percent: number;
}

const TIMEFRAME_DATA: Record<Timeframe, ChartDataPoint[]> = {
  "1D": [
    { date: "09:15 AM", portfolio: 3462000, benchmark: 24780, invested: 2956000, returns: 506000, percent: 17.11 },
    { date: "10:30 AM", portfolio: 3468500, benchmark: 24810, invested: 2956000, returns: 512500, percent: 17.33 },
    { date: "11:45 AM", portfolio: 3474000, benchmark: 24830, invested: 2956000, returns: 518000, percent: 17.52 },
    { date: "01:00 PM", portfolio: 3471000, benchmark: 24815, invested: 2956000, returns: 515000, percent: 17.42 },
    { date: "02:15 PM", portfolio: 3478000, benchmark: 24840, invested: 2956000, returns: 522000, percent: 17.65 },
    { date: "03:30 PM", portfolio: 3480000, benchmark: 24852, invested: 2956000, returns: 524000, percent: 17.72 },
  ],
  "1W": [
    { date: "18 Aug", portfolio: 3420000, benchmark: 24650, invested: 2956000, returns: 464000, percent: 15.69 },
    { date: "19 Aug", portfolio: 3435000, benchmark: 24710, invested: 2956000, returns: 479000, percent: 16.20 },
    { date: "20 Aug", portfolio: 3428000, benchmark: 24690, invested: 2956000, returns: 472000, percent: 15.96 },
    { date: "21 Aug", portfolio: 3455000, benchmark: 24790, invested: 2956000, returns: 499000, percent: 16.88 },
    { date: "22 Aug", portfolio: 3480000, benchmark: 24852, invested: 2956000, returns: 524000, percent: 17.72 },
  ],
  "1M": [
    { date: "25 Jul", portfolio: 3340000, benchmark: 24200, invested: 2956000, returns: 384000, percent: 12.99 },
    { date: "01 Aug", portfolio: 3390000, benchmark: 24450, invested: 2956000, returns: 434000, percent: 14.68 },
    { date: "08 Aug", portfolio: 3415000, benchmark: 24600, invested: 2956000, returns: 459000, percent: 15.52 },
    { date: "15 Aug", portfolio: 3440000, benchmark: 24700, invested: 2956000, returns: 484000, percent: 16.37 },
    { date: "22 Aug", portfolio: 3480000, benchmark: 24852, invested: 2956000, returns: 524000, percent: 17.72 },
  ],
  "1Y": [
    { date: "Aug '23", portfolio: 2956000, benchmark: 19800, invested: 2956000, returns: 0, percent: 0.00 },
    { date: "Oct '23", portfolio: 3040000, benchmark: 20400, invested: 2956000, returns: 84000, percent: 2.84 },
    { date: "Dec '23", portfolio: 3180000, benchmark: 21700, invested: 2956000, returns: 224000, percent: 7.57 },
    { date: "Feb '24", portfolio: 3250000, benchmark: 22300, invested: 2956000, returns: 294000, percent: 9.94 },
    { date: "Apr '24", portfolio: 3320000, benchmark: 22800, invested: 2956000, returns: 364000, percent: 12.31 },
    { date: "Jun '24", portfolio: 3410000, benchmark: 24300, invested: 2956000, returns: 454000, percent: 15.35 },
    { date: "Aug '24", portfolio: 3480000, benchmark: 24852, invested: 2956000, returns: 524000, percent: 17.72 },
  ],
  "3Y": [
    { date: "Aug '21", portfolio: 2100000, benchmark: 17300, invested: 2000000, returns: 100000, percent: 5.00 },
    { date: "Aug '22", portfolio: 2450000, benchmark: 18100, invested: 2300000, returns: 150000, percent: 6.52 },
    { date: "Aug '23", portfolio: 2950000, benchmark: 21500, invested: 2700000, returns: 250000, percent: 9.25 },
    { date: "Aug '24", portfolio: 3480000, benchmark: 24852, invested: 2956000, returns: 524000, percent: 17.72 },
  ],
  "5Y": [
    { date: "2019", portfolio: 1400000, benchmark: 12100, invested: 1300000, returns: 100000, percent: 7.69 },
    { date: "2020", portfolio: 1650000, benchmark: 13900, invested: 1600000, returns: 50000, percent: 3.12 },
    { date: "2021", portfolio: 2200000, benchmark: 17300, invested: 2000000, returns: 200000, percent: 10.00 },
    { date: "2022", portfolio: 2500000, benchmark: 18100, invested: 2300000, returns: 200000, percent: 8.69 },
    { date: "2023", portfolio: 2980000, benchmark: 21500, invested: 2700000, returns: 280000, percent: 10.37 },
    { date: "2024", portfolio: 3480000, benchmark: 24852, invested: 2956000, returns: 524000, percent: 17.72 },
  ],
  "ALL": [
    { date: "2018", portfolio: 1200000, benchmark: 11000, invested: 1200000, returns: 0, percent: 0.00 },
    { date: "2020", portfolio: 1800000, benchmark: 14500, invested: 1600000, returns: 200000, percent: 12.50 },
    { date: "2022", portfolio: 2400000, benchmark: 17800, invested: 2100000, returns: 300000, percent: 14.28 },
    { date: "2023", portfolio: 2950000, benchmark: 21500, invested: 2600000, returns: 350000, percent: 13.46 },
    { date: "Current", portfolio: 3480000, benchmark: 24852, invested: 2956000, returns: 524000, percent: 17.72 },
  ],
};

export function InteractivePortfolioChart() {
  const [timeframe, setTimeframe] = useState<Timeframe>("1Y");
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

  const dataset = TIMEFRAME_DATA[timeframe];
  const activeDataPoint = hoveredPoint || dataset[dataset.length - 1];
  const isPositive = activeDataPoint.returns >= 0;

  const timeframes: Timeframe[] = ["1D", "1W", "1M", "1Y", "3Y", "5Y", "ALL"];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-6 text-foreground">
      
      {/* Top Header with Live Scrubbed Value */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              PORTFOLIO GROWTH ENGINE
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {hoveredPoint ? `Scrubbing: ${hoveredPoint.date}` : "Current Portfolio NAV"}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-3 mt-2">
            <h3 className="text-3xl sm:text-4xl metric-hero text-foreground tracking-tight tabular-nums">
              ₹{activeDataPoint.portfolio.toLocaleString("en-IN")}
            </h3>
            
            <div className={cn(
              "flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg font-finance border",
              isPositive 
                ? "text-[var(--positive)] bg-[var(--positive-soft)] border-[var(--positive)]/30" 
                : "text-[var(--negative)] bg-[var(--negative-soft)] border-[var(--negative)]/30"
            )}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>
                {isPositive ? "+" : ""}₹{activeDataPoint.returns.toLocaleString("en-IN")} ({isPositive ? "+" : ""}{activeDataPoint.percent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* High-Impact Stat Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-accent border border-border text-xs">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">XIRR Return</span>
            <span className="font-bold text-[var(--positive)] font-finance text-sm tabular-nums">+19.42%</span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-accent border border-border text-xs">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Alpha vs Nifty</span>
            <span className="font-bold text-foreground font-finance text-sm tabular-nums">+3.18%</span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-accent border border-border text-xs">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Max Drawdown</span>
            <span className="font-bold text-[var(--negative)] font-finance text-sm tabular-nums">-8.4%</span>
          </div>
        </div>
      </div>

      {/* Timeframe Buttons & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5 bg-accent/70 p-1 rounded-xl border border-border">
          {timeframes.map((tf) => {
            const isActive = timeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {tf}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBenchmark(!showBenchmark)}
            className={cn(
              "px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
              showBenchmark
                ? "bg-[var(--nse-gold-soft)] border-[var(--nse-gold)]/40 text-[var(--nse-gold)]"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>NIFTY 50 TRI Overlay</span>
          </button>
        </div>
      </div>

      {/* Interactive Recharts Graph */}
      <div className="h-[290px] w-full pt-2" role="img" aria-label={`Portfolio value chart over ${timeframe}, ranging from ${dataset[0]?.date} to ${dataset[dataset.length - 1]?.date}. Full data available in the table below for screen readers.`}>
        {/* Recharts renders to canvas/SVG with no accessible text, so this
            hidden table gives screen-reader users the same underlying data. */}
        <table className="sr-only">
          <caption>Portfolio value vs NIFTY 50 benchmark, {timeframe} view</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Portfolio value</th>
              <th scope="col">Benchmark</th>
              <th scope="col">Gain/Loss %</th>
            </tr>
          </thead>
          <tbody>
            {dataset.map((d) => (
              <tr key={d.date}>
                <td>{d.date}</td>
                <td>₹{d.portfolio.toLocaleString("en-IN")}</td>
                <td>{d.benchmark.toLocaleString("en-IN")}</td>
                <td>{d.percent.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
          <AreaChart
            data={dataset}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            onMouseMove={(state: any) => {
              if (state && state.activePayload && state.activePayload.length) {
                setHoveredPoint(state.activePayload[0].payload as ChartDataPoint);
              }
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="glowBlueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="niftyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.10} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={8}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
              domain={["dataMin - 80000", "dataMax + 80000"]}
              dx={-8}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as ChartDataPoint;
                  return (
                    <div className="bg-[#12131a] border border-[#1f2330] p-3.5 rounded-xl shadow-2xl space-y-2 text-xs min-w-[200px]">
                      <div className="flex items-center justify-between text-muted-foreground pb-1.5 border-b border-border">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-primary" /> {label}
                        </span>
                        <span className="text-[10px] font-mono text-primary font-bold">X-RAY LIVE</span>
                      </div>
                      <div className="space-y-1 font-mono">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-sans">Net Worth:</span>
                          <span className="font-bold text-foreground">₹{pt.portfolio.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-sans">Invested:</span>
                          <span className="text-muted-foreground">₹{pt.invested.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-border">
                          <span className="text-muted-foreground font-sans">Gain:</span>
                          <span className="font-bold text-[var(--positive)]">+₹{pt.returns.toLocaleString("en-IN")} ({pt.percent}%)</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="portfolio"
              name="Portfolio Value"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#glowBlueGradient)"
              activeDot={{ r: 6, fill: "#3b82f6", stroke: "#090a0e", strokeWidth: 2.5 }}
            />

            {showBenchmark && (
              <Area
                type="monotone"
                dataKey="invested"
                name="Nifty 50 Benchmark"
                stroke="#f59e0b"
                strokeWidth={1.75}
                strokeDasharray="4 4"
                fill="url(#niftyGradient)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border text-xs relative z-10 font-mono">
        <div className="p-3 rounded-xl bg-accent/40 border border-border">
          <span className="text-muted-foreground block text-[10.5px] font-sans">Deployed Capital</span>
          <span className="font-bold text-foreground text-sm tabular-nums">₹29,56,000</span>
        </div>
        <div className="p-3 rounded-xl bg-accent/40 border border-border">
          <span className="text-muted-foreground block text-[10.5px] font-sans">Unrealized Profit</span>
          <span className="font-bold text-[var(--positive)] text-sm tabular-nums">+₹5,24,000</span>
        </div>
        <div className="p-3 rounded-xl bg-accent/40 border border-border">
          <span className="text-muted-foreground block text-[10.5px] font-sans">1D Day's Gain</span>
          <span className="font-bold text-[var(--positive)] text-sm tabular-nums">+₹18,500 (+0.53%)</span>
        </div>
        <div className="p-3 rounded-xl bg-accent/40 border border-border">
          <span className="text-muted-foreground block text-[10.5px] font-sans">Audit Confidence</span>
          <span className="font-bold text-primary text-sm tabular-nums">100% AMFI Match</span>
        </div>
      </div>

    </div>
  );
}
