"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingDown, 
  Sparkles, 
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Percent,
  Sliders,
  RefreshCw,
  Gauge,
  Briefcase
} from "lucide-react";
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { usePortfolioStore } from "@/store/portfolioStore";
import { cn, formatINR, formatINRCompact, formatPercent } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { 
  MOCK_CRASH_SCENARIOS, 
  MOCK_PEER_BENCHMARKS 
} from "@/data/mock/portfolioData";

type SimulatorTab = "crash" | "whatif" | "macro" | "peer";

export default function SimulatorPage() {
  const { 
    holdings, 
    whatIfHoldings, 
    isWhatIfActive, 
    swapHolding, 
    resetWhatIf, 
    getPortfolioValue, 
    getWhatIfValue,
    getAverageExpenseRatio,
    getWhatIfExpenseRatio,
    getDiversificationScore,
    getWhatIfDiversificationScore
  } = usePortfolioStore();

  const [activeTab, setActiveTab] = useState<SimulatorTab>("crash");
  const [selectedCrash, setSelectedCrash] = useState("c2"); // Default 2020 Covid
  const [mounted, setMounted] = useState(false);

  // Macro risk sliders states
  const [oilPrice, setOilPrice] = useState(75); // $/barrel
  const [interestRate, setInterestRate] = useState(6.5); // %
  const [inflation, setInflation] = useState(5.2); // %
  const [usdInr, setUsdInr] = useState(83.5); // ₹

  useEffect(() => {
    setMounted(true);
  }, []);

  const originalValue = getPortfolioValue();
  const simulatedValue = getWhatIfValue();
  const originalFee = getAverageExpenseRatio();
  const simulatedFee = getWhatIfExpenseRatio();
  const originalScore = getDiversificationScore();
  const simulatedScore = getWhatIfDiversificationScore();

  // Find active crash
  const activeCrash = MOCK_CRASH_SCENARIOS.find(c => c.id === selectedCrash) || MOCK_CRASH_SCENARIOS[0];

  // Calculate simulated macro impact dynamically
  const calculateMacroImpact = () => {
    // Basic calculation model
    const oilDiff = oilPrice - 75; // baseline $75
    const rateDiff = interestRate - 6.5; // baseline 6.5%
    const infDiff = inflation - 5.2; // baseline 5.2%
    const usdDiff = usdInr - 83.5; // baseline 83.5

    // Financials & IT react differently
    const oilImpact = -0.15 * oilDiff; 
    const rateImpact = -1.2 * rateDiff;
    const inflationImpact = -0.8 * infDiff;
    const usdImpact = 0.25 * usdDiff; // IT benefits from weak rupee

    const totalImpactPercent = oilImpact + rateImpact + inflationImpact + usdImpact;
    const finalSimValue = originalValue * (1 + totalImpactPercent / 100);

    return {
      percentage: totalImpactPercent,
      value: finalSimValue,
      delta: finalSimValue - originalValue
    };
  };

  const macroImpact = calculateMacroImpact();

  // 5x5 NAV Correlation matrix data
  const correlationMatrix = [
    { name: "RELIANCE", RELIANCE: 1.0, TCS: 0.25, INFY: 0.18, HDFCBANK: 0.42, PPFCF: 0.65 },
    { name: "TCS", RELIANCE: 0.25, TCS: 1.0, INFY: 0.82, HDFCBANK: 0.15, PPFCF: 0.52 },
    { name: "INFY", RELIANCE: 0.18, TCS: 0.82, INFY: 1.0, HDFCBANK: 0.12, PPFCF: 0.48 },
    { name: "HDFCBANK", RELIANCE: 0.42, TCS: 0.15, INFY: 0.12, HDFCBANK: 1.0, PPFCF: 0.72 },
    { name: "PPFCF", RELIANCE: 0.65, TCS: 0.52, INFY: 0.48, HDFCBANK: 0.72, PPFCF: 1.0 }
  ];

  // Mock crash curve data points based on scenario selected
  const getCrashCurveData = () => {
    const baseline = originalValue;
    const drop = activeCrash.portfolioImpact / 100;
    
    return [
      { month: "Month 1", Value: baseline },
      { month: "Month 2", Value: baseline * (1 + drop * 0.3) },
      { month: "Month 3", Value: baseline * (1 + drop * 0.6) },
      { month: "Month 4", Value: baseline * (1 + drop * 0.8) },
      { month: "Month 5", Value: baseline * (1 + drop) }, // peak drop
      { month: "Month 6", Value: baseline * (1 + drop * 0.8) },
      { month: "Month 7", Value: baseline * (1 + drop * 0.6) },
      { month: "Month 8", Value: baseline * (1 + drop * 0.4) },
      { month: "Month 9", Value: baseline * (1 + drop * 0.2) },
      { month: "Month 10", Value: baseline } // recovered
    ];
  };

  const crashCurve = getCrashCurveData();

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Stress Simulators</h1>
        <p className="text-sm text-muted-foreground">Test portfolio integrity under macro shocks, historical crashes, and drag-and-drop switches.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/60 gap-8">
        {[
          { id: "crash", label: "Historical Crashes" },
          { id: "whatif", label: "What-If Fund Swap" },
          { id: "macro", label: "Macro Factors Sliders" },
          { id: "peer", label: "Peer Benchmarks" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as SimulatorTab)}
            className={cn(
              "pb-4 text-xs font-semibold tracking-wider uppercase border-b-2 cursor-pointer transition-all",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: HISTORICAL CRASHES */}
      {activeTab === "crash" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Select Crash Event</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {MOCK_CRASH_SCENARIOS.map((crash) => (
                  <button
                    key={crash.id}
                    onClick={() => setSelectedCrash(crash.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center",
                      selectedCrash === crash.id 
                        ? "border-primary bg-primary/5 text-foreground" 
                        : "border-border/60 bg-card hover:bg-accent/40"
                    )}
                  >
                    <div>
                      <h4 className="text-xs font-bold">{crash.name}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{crash.dateRange}</p>
                    </div>
                    <Badge variant="danger" className="text-[9px] font-black">{crash.marketDrop}%</Badge>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-1.5 text-red-500">
                  <AlertTriangle className="h-4.5 w-4.5" /> Simulation Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-normal">{activeCrash.description}</p>
                <div className="h-px bg-border/60" />
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-accent/25 rounded-lg border border-border/20">
                    <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Portfolio Drop</span>
                    <span className="text-base font-extrabold text-red-500 mt-1 block">{activeCrash.portfolioImpact}%</span>
                  </div>
                  <div className="p-3 bg-accent/25 rounded-lg border border-border/20">
                    <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Recovery Time</span>
                    <span className="text-base font-extrabold text-primary mt-1 block">{activeCrash.recoveryMonths} Months</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/60 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Simulated Portfolio Drop Curve</CardTitle>
              <CardDescription>Estimated drawdown of your current net worth (Peak drop: {formatINRCompact(originalValue * (1 + activeCrash.portfolioImpact / 100))})</CardDescription>
            </CardHeader>
            <CardContent className="h-80 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={crashCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCrash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DC2626" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "#94A3B8" }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "#94A3B8" }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={(v) => [formatINRCompact(Number(v ?? 0)), "Value"]} />
                  <Area type="monotone" dataKey="Value" stroke="#DC2626" strokeWidth={2} fillOpacity={1} fill="url(#colorCrash)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: WHAT-IF FUND SWAP & CORRELATION */}
      {activeTab === "whatif" && (
        <div className="space-y-8">
          {/* Simulation Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Portfolio Value</span>
                <h4 className="text-xl font-extrabold">{formatINRCompact(simulatedValue)}</h4>
                {isWhatIfActive && <span className="text-[10px] text-green-500 font-bold">Simulated State Active</span>}
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Expense Ratio</span>
                <h4 className={cn("text-xl font-extrabold", isWhatIfActive && simulatedFee < originalFee ? "text-green-500" : "text-foreground")}>
                  {(simulatedFee * 100).toFixed(2)}%
                </h4>
                {isWhatIfActive && <span className="text-[10px] text-muted-foreground">Before: {(originalFee * 100).toFixed(2)}%</span>}
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Diversification Score</span>
                <h4 className={cn("text-xl font-extrabold", isWhatIfActive && simulatedScore > originalScore ? "text-green-500" : "text-foreground")}>
                  {simulatedScore}
                </h4>
                {isWhatIfActive && <span className="text-[10px] text-muted-foreground">Before: {originalScore}</span>}
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow flex items-center justify-center p-4">
              {isWhatIfActive ? (
                <Button variant="danger" size="sm" onClick={resetWhatIf} className="w-full flex items-center justify-center gap-1.5 h-10 font-bold">
                  Reset What-If Simulator
                </Button>
              ) : (
                <div className="text-xs text-muted-foreground italic text-center">
                  Swap high-cost assets below to simulate savings & diversification.
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* List of Swaps available */}
            <Card className="border-border/60 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-primary" /> Drag & Drop Fund Replacements
                </CardTitle>
                <CardDescription>Click to simulate replacing high-cost regular plans with low-cost direct alternatives</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border/60 p-0">
                {whatIfHoldings.filter(h => h.type === "Mutual Fund" && h.expenseRatio && h.expenseRatio > 0.007).map((fund) => (
                  <div key={fund.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-accent/10 transition-colors text-xs font-semibold">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{fund.name}</h4>
                      <div className="flex gap-2 text-[10px] text-muted-foreground mt-1">
                        <span>Current Expense Ratio: <span className="text-red-500">{(fund.expenseRatio! * 100).toFixed(2)}%</span></span>
                        <span>•</span>
                        <span>Value: {formatINRCompact(fund.currentValue)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[9px] text-muted-foreground block uppercase font-bold">Suggested Replacement</span>
                        <span className="text-green-500 text-xs font-extrabold">{fund.ticker === "ICICIBLUE" ? "ICICI Bluechip Direct (0.42%)" : "PPFCF Direct (0.35%)"}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          const name = fund.ticker === "ICICIBLUE" ? "ICICI Prudential Bluechip Direct" : "Parag Parikh Flexi Cap Direct";
                          const ticker = fund.ticker === "ICICIBLUE" ? "ICICIBLUE_DIR" : "PPFCF_DIR";
                          const fee = fund.ticker === "ICICIBLUE" ? 0.0042 : 0.0035;
                          swapHolding(fund.id, name, ticker, fee);
                        }}
                        className="h-8 text-[11px] font-bold"
                      >
                        Simulate
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* NAV Correlation Heatmap Matrix */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base">NAV Correlation Matrix</CardTitle>
                <CardDescription>Correlation matrix between key holdings (Higher correlation implies higher duplicate risk)</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-6 gap-1 text-[9px] font-bold text-center uppercase tracking-wider text-muted-foreground">
                  <div />
                  <div>RELI</div>
                  <div>TCS</div>
                  <div>INFY</div>
                  <div>HDFC</div>
                  <div>PPFC</div>
                  
                  {correlationMatrix.map((row) => (
                    <React.Fragment key={row.name}>
                      <div className="text-left flex items-center pr-1 truncate font-bold text-foreground">{row.name.slice(0, 4)}</div>
                      <div className={cn("p-2 rounded text-foreground font-black", row.RELIANCE > 0.8 ? "bg-red-500/20 text-red-500" : row.RELIANCE > 0.5 ? "bg-amber-500/20 text-amber-500" : "bg-green-500/10 text-green-500")}>{row.RELIANCE.toFixed(2)}</div>
                      <div className={cn("p-2 rounded text-foreground font-black", row.TCS > 0.8 ? "bg-red-500/20 text-red-500" : row.TCS > 0.5 ? "bg-amber-500/20 text-amber-500" : "bg-green-500/10 text-green-500")}>{row.TCS.toFixed(2)}</div>
                      <div className={cn("p-2 rounded text-foreground font-black", row.INFY > 0.8 ? "bg-red-500/20 text-red-500" : row.INFY > 0.5 ? "bg-amber-500/20 text-amber-500" : "bg-green-500/10 text-green-500")}>{row.INFY.toFixed(2)}</div>
                      <div className={cn("p-2 rounded text-foreground font-black", row.HDFCBANK > 0.8 ? "bg-red-500/20 text-red-500" : row.HDFCBANK > 0.5 ? "bg-amber-500/20 text-amber-500" : "bg-green-500/10 text-green-500")}>{row.HDFCBANK.toFixed(2)}</div>
                      <div className={cn("p-2 rounded text-foreground font-black", row.PPFCF > 0.8 ? "bg-red-500/20 text-red-500" : row.PPFCF > 0.5 ? "bg-amber-500/20 text-amber-500" : "bg-green-500/10 text-green-500")}>{row.PPFCF.toFixed(2)}</div>
                    </React.Fragment>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: MACRO FACTOR SLIDERS */}
      {activeTab === "macro" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Sliders panel */}
          <Card className="border-border/60 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-1.5">
                <Sliders className="h-5 w-5 text-primary" /> Macro Risk Sim
              </CardTitle>
              <CardDescription>Adjust global economic variables and model direct impacts on your net worth.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Slider 1: Brent Crude Oil */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Brent Crude Oil</span>
                  <span className="text-foreground">${oilPrice} / bbl</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={130}
                  step={1}
                  value={oilPrice}
                  onChange={(e) => setOilPrice(Number(e.target.value))}
                  className="w-full accent-primary h-1 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Slider 2: Interest Rates */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">RBI Repo Interest Rate</span>
                  <span className="text-foreground">{interestRate}%</span>
                </div>
                <input
                  type="range"
                  min={4.5}
                  max={9.0}
                  step={0.1}
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full accent-primary h-1 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Slider 3: Inflation */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">CPI Retail Inflation</span>
                  <span className="text-foreground">{inflation}%</span>
                </div>
                <input
                  type="range"
                  min={2.0}
                  max={10.0}
                  step={0.1}
                  value={inflation}
                  onChange={(e) => setInflation(Number(e.target.value))}
                  className="w-full accent-primary h-1 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Slider 4: USDINR */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">USD / INR Exchange Rate</span>
                  <span className="text-foreground">₹{usdInr}</span>
                </div>
                <input
                  type="range"
                  min={78.0}
                  max={92.0}
                  step={0.1}
                  value={usdInr}
                  onChange={(e) => setUsdInr(Number(e.target.value))}
                  className="w-full accent-primary h-1 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>

            </CardContent>
          </Card>

          {/* Results graph */}
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-base">Modeled Portfolio Impact</CardTitle>
                <CardDescription>Simulated portfolio value adjustment based on macro stress calculations</CardDescription>
              </div>
              <Badge 
                variant={macroImpact.percentage >= 0 ? "success" : "danger"} 
                className="text-xs font-extrabold"
              >
                {macroImpact.percentage >= 0 ? "+" : ""}{macroImpact.percentage.toFixed(2)}%
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                <div className="p-4 rounded-xl border border-border bg-accent/20">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Simulated Net Worth</span>
                  <span className="text-2xl font-black text-foreground mt-1 block">{formatINR(macroImpact.value, 0)}</span>
                </div>
                <div className="p-4 rounded-xl border border-border bg-accent/20">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Estimated Delta</span>
                  <span className={cn(
                    "text-2xl font-black mt-1 block",
                    macroImpact.delta >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {macroImpact.delta >= 0 ? "+" : ""}{formatINR(macroImpact.delta, 0)}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-accent/20 border border-border/40 p-4 text-xs text-muted-foreground leading-relaxed">
                <h6 className="font-bold text-foreground mb-1">Impact Summary:</h6>
                {macroImpact.percentage < -2 ? (
                  <span>⚠️ Macro factor configurations suggest a **downside projection**. High crude oil prices and interest rate levels put heavy compression on banking sectors and consumer spending. Consider hedging.</span>
                ) : macroImpact.percentage > 1 ? (
                  <span>✅ Macro variables predict a **net positive shock**. Moderate inflation coupled with favorable exchange rates benefits export-oriented IT sectors and boosts financial equity multipliers.</span>
                ) : (
                  <span>⚖️ Macro conditions remain **neutral**. Portfolio value will hold steady with minimal capital volatility.</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: PEER BENCHMARKS */}
      {activeTab === "peer" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Benchmark radar chart */}
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Radar Peer Benchmark Matrix</CardTitle>
              <CardDescription>Comparison of your portfolio parameters against Indian retail investors averages (Top 10% vs average)</CardDescription>
            </CardHeader>
            <CardContent className="h-96 flex items-center justify-center pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={MOCK_PEER_BENCHMARKS}>
                  <PolarGrid stroke="#E2E8F0" className="dark:stroke-slate-800" />
                  <PolarAngleAxis dataKey="category" style={{ fontSize: 9, fill: "#94A3B8" }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} style={{ fontSize: 8 }} />
                  <Radar name="My Portfolio" dataKey="portfolio" stroke="#2563EB" fill="#2563EB" fillOpacity={0.25} />
                  <Radar name="Indian Retail Avg" dataKey="average" stroke="#94A3B8" fill="#94A3B8" fillOpacity={0.05} />
                  <Radar name="Top 10% Investors" dataKey="top10Percent" stroke="#10B981" fill="#10B981" fillOpacity={0.1} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Metric cards explaining percentiles */}
          <Card className="border-border/60 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Percentiles Summary</CardTitle>
              <CardDescription>How you score across different key portfolio metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 text-xs font-semibold">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Diversification Percentile</span>
                    <span className="text-green-500 font-bold">88th percentile</span>
                  </div>
                  <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: "88%" }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee Minimization (Expense)</span>
                    <span className="text-amber-500 font-bold">62nd percentile</span>
                  </div>
                  <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: "62%" }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">HHI Score Concentration</span>
                    <span className="text-green-500 font-bold">84th percentile</span>
                  </div>
                  <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: "84%" }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Returns Risk Ratio (Sharpe)</span>
                    <span className="text-primary font-bold">78th percentile</span>
                  </div>
                  <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "78%" }} />
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-accent/25 border border-border/40 p-4 mt-4 text-[11px] text-muted-foreground leading-normal space-y-1.5">
                <h6 className="font-bold text-foreground">Benchmark takeaways:</h6>
                <p>Your strong HHI rating suggests a well-hedged stock selection, but high regular plan fee ratios drag down returns relative to top-tier portfolios. Address this to enter the top 10% tier.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
