"use client";

import React, { useState } from "react";
import { 
  ShieldAlert, 
  Upload, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  TrendingDown,
  DollarSign,
  AlertCircle,
  HelpCircle,
  FileText,
  UserCheck,
  Check,
  ChevronRight,
  RefreshCw,
  Info
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { usePortfolioStore } from "@/store/portfolioStore";
import { cn, formatINR, formatINRCompact, formatPercent, getScoreColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type DiagnosticTab = "sync" | "overlap" | "fees" | "nominee";

export default function DiagnosticsPage() {
  const { 
    holdings, 
    nominees, 
    startSync, 
    syncProgress, 
    syncStep, 
    syncMethod, 
    isSynced, 
    updateNominee,
    addNominee,
    getAverageExpenseRatio
  } = usePortfolioStore();

  const [activeTab, setActiveTab] = useState<DiagnosticTab>("sync");

  // CAS File Upload states
  const [casPassword, setCasPassword] = useState("");
  const [casFile, setCasFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Nominee form states
  const [newNomineeName, setNewNomineeName] = useState("");
  const [newNomineeRelation, setNewNomineeRelation] = useState<"Spouse" | "Child" | "Parent" | "Sibling" | "Other">("Spouse");
  const [newNomineeAlloc, setNewNomineeAlloc] = useState(100);

  // Overlap simulation states
  const [overlapSelection, setOverlapSelection] = useState<[string, string]>(["PPFCF", "ICICIBLUE"]);

  const averageFee = getAverageExpenseRatio();

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setCasFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCasFile(e.target.files[0]);
    }
  };

  const triggerCasUpload = () => {
    if (!casFile) return;
    startSync("CAS");
  };

  // Calculate overlaps dynamically between any two mutual funds
  const getFundOverlap = (tickerA: string, tickerB: string) => {
    const fundA = holdings.find(h => h.ticker === tickerA);
    const fundB = holdings.find(h => h.ticker === tickerB);
    
    if (!fundA?.underlyingHoldings || !fundB?.underlyingHoldings) return { overlapPct: 0, sharedStocks: [] };

    const sharedStocks: Array<{ name: string; allocationInA: number; allocationInB: number; sharedWeight: number }> = [];
    let totalOverlap = 0;

    fundA.underlyingHoldings.forEach(stockA => {
      const stockB = fundB.underlyingHoldings?.find(s => s.name === stockA.name);
      if (stockB) {
        const overlap = Math.min(stockA.allocation, stockB.allocation);
        totalOverlap += overlap;
        sharedStocks.push({
          name: stockA.name,
          allocationInA: stockA.allocation,
          allocationInB: stockB.allocation,
          sharedWeight: overlap
        });
      }
    });

    return {
      overlapPct: totalOverlap,
      sharedStocks: sharedStocks.sort((a, b) => b.sharedWeight - a.sharedWeight)
    };
  };

  const overlapData = getFundOverlap(overlapSelection[0], overlapSelection[1]);

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Diagnostics Hub</h1>
        <p className="text-sm text-muted-foreground">Peel back fee bleed layers, check nominees, and uncover fund overlaps.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border/60 gap-8">
        {[
          { id: "sync", label: "Depository Sync" },
          { id: "overlap", label: "Overlap Look-Through" },
          { id: "fees", label: "Fee Bleed Audit" },
          { id: "nominee", label: "Nominee Checklist" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as DiagnosticTab)}
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

      {/* TAB 1: DEPOSITORY SYNC (OTP & CAS) */}
      {activeTab === "sync" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Method A: CAS File Upload */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Consolidated Account Statement (CAS)
              </CardTitle>
              <CardDescription>Upload depository PDF statement from NSDL/CDSL for client-side diagnostic audit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Uploader Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition-all flex flex-col items-center justify-center min-h-[180px] cursor-pointer",
                  isDragging ? "border-primary bg-primary/5" : "border-border/80 bg-accent/10 hover:border-border"
                )}
              >
                <input
                  type="file"
                  id="cas-file-input"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="cas-file-input" className="cursor-pointer space-y-3 flex flex-col items-center">
                  <Upload className="h-8 w-8 text-muted" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold">
                      {casFile ? casFile.name : "Drag & drop your CAS PDF statement here"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Supported format: Secure NSDL / CDSL PDF statements</p>
                  </div>
                </label>
              </div>

              {/* Password Input */}
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" /> PDF Passphrase / Password
                </label>
                <input
                  type="password"
                  placeholder="Enter PDF password (usually PAN Card or Email prefix)"
                  value={casPassword}
                  onChange={(e) => setCasPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary px-3 transition-all"
                />
              </div>

              <Button 
                onClick={triggerCasUpload}
                disabled={!casFile || !casPassword}
                className="w-full h-11 text-xs font-bold"
              >
                Start CAS Audit Process
              </Button>
            </CardContent>
          </Card>

          {/* Sync Progress Timeline status */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" /> Sync Timeline Progress
              </CardTitle>
              <CardDescription>Audit timeline details for background depository syncing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {syncMethod && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-primary uppercase tracking-widest">{syncMethod} Parsing Method</span>
                    <span>{syncProgress}%</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${syncProgress}%` }}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground italic flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" /> {syncStep}
                  </p>
                </div>
              )}

              {!syncMethod && (
                <div className="text-center py-10 space-y-4">
                  <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
                  <div>
                    <h5 className="text-xs font-bold">Depository Connection Fully Synchronised</h5>
                    <p className="text-[10px] text-muted-foreground mt-1">Nivesh Lens is connected to depository registries. All holdings are live.</p>
                  </div>
                  <Button 
                    onClick={() => startSync("OTP")} 
                    size="sm" 
                    variant="outline"
                  >
                    Force Sync Registry Re-fetch
                  </Button>
                </div>
              )}

              <div className="rounded-lg bg-accent/20 border border-border/40 p-4 text-[11px] text-muted-foreground leading-normal space-y-2">
                <h6 className="font-bold text-foreground">Why verify via depository registry?</h6>
                <p>Registry fetches use secure tokenized OTPs directly from NSDL, CDSL or KFintech. This compiles fractional mutual fund shares, purchase costs, and equity quantities in 20 seconds without storing passwords.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: OVERLAP LOOK-THROUGH */}
      {activeTab === "overlap" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Overlap configuration panel */}
          <Card className="border-border/60 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Compare Mutual Funds</CardTitle>
              <CardDescription>Select two mutual funds to audit stock overlapping concentrations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Primary Mutual Fund</label>
                <select
                  value={overlapSelection[0]}
                  onChange={(e) => setOverlapSelection([e.target.value, overlapSelection[1]])}
                  className="h-10 w-full rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 px-3 cursor-pointer"
                >
                  {holdings.filter(h => h.type === "Mutual Fund").map(f => (
                    <option key={f.ticker} value={f.ticker}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Secondary Mutual Fund</label>
                <select
                  value={overlapSelection[1]}
                  onChange={(e) => setOverlapSelection([overlapSelection[0], e.target.value])}
                  className="h-10 w-full rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 px-3 cursor-pointer"
                >
                  {holdings.filter(h => h.type === "Mutual Fund" && h.ticker !== overlapSelection[0]).map(f => (
                    <option key={f.ticker} value={f.ticker}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* Aggregated score indicator */}
              <div className="p-4 rounded-xl border border-border bg-accent/25 text-center space-y-2 mt-6">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">AGGREGATE OVERLAP RATING</span>
                <div className="text-3xl font-black text-amber-500">
                  {overlapData.overlapPct.toFixed(1)}%
                </div>
                <Badge variant={overlapData.overlapPct > 30 ? "warning" : "success"} className="text-[9px]">
                  {overlapData.overlapPct > 30 ? "High Redundancy" : "Healthy Spread"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Overlapping list details */}
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" /> Overlapping stock positions
              </CardTitle>
              <CardDescription>These companies are owned in both mutual funds under the hood.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {overlapData.sharedStocks.map((stock, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 hover:bg-accent/10 transition-colors text-xs font-semibold">
                    <div className="space-y-0.5">
                      <h5 className="text-sm font-bold text-foreground">{stock.name}</h5>
                      <span className="text-[10px] text-muted-foreground">Overlap Weight: {stock.sharedWeight}%</span>
                    </div>
                    
                    <div className="flex gap-10 text-right">
                      <div>
                        <span className="text-[10px] text-muted block">{overlapSelection[0]} Alloc</span>
                        <span className="text-foreground">{stock.allocationInA}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted block">{overlapSelection[1]} Alloc</span>
                        <span className="text-foreground">{stock.allocationInB}%</span>
                      </div>
                    </div>
                  </div>
                ))}

                {overlapData.sharedStocks.length === 0 && (
                  <div className="text-center py-12 space-y-2">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
                    <h5 className="text-xs font-bold">Zero Exposure Overlap</h5>
                    <p className="text-[10px] text-muted-foreground">No overlapping underlying shares found in selected portfolios.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: FEE BLEED AUDIT */}
      {activeTab === "fees" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Fee savings stats */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-border/60">
              <CardContent className="p-6 text-center space-y-4">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">POTENTIAL FEE SAVINGS</span>
                <h3 className="text-4xl font-extrabold text-green-500">₹18,520</h3>
                <p className="text-xs text-muted-foreground">Annually saved by switching Regular mutual fund plans to Direct plans</p>
                <div className="h-px bg-border/80 my-4" />
                <div className="flex justify-between text-xs text-muted-foreground font-semibold px-2">
                  <span>Current Fees:</span>
                  <span className="text-foreground">₹24,800/yr</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground font-semibold px-2">
                  <span>Direct Plan Fees:</span>
                  <span className="text-green-500">₹6,280/yr</span>
                </div>
                <Button className="w-full flex items-center justify-center gap-1.5 mt-2 h-10 text-xs">
                  Switch to Direct Mutual Funds <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-4 space-y-2 text-xs leading-normal">
                <h5 className="font-bold flex items-center gap-1 text-primary">
                  <Info className="h-4 w-4" /> What is the regular plan fee bleed?
                </h5>
                <p className="text-muted-foreground text-[11px]">
                  Regular mutual fund plans bundle distributor commission (brokerage) of **0.50% - 1.25%** annually inside the Expense Ratio. Over 15 years, this commission compounding can bleed up to **20% of your total net worth gains**.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Expense Ratio charts */}
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Mutual Fund Expense Ratio Audits</CardTitle>
              <CardDescription>Comparison of current fund expense ratios against Direct options</CardDescription>
            </CardHeader>
            <CardContent className="h-72 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={holdings.filter(h => h.type === "Mutual Fund")}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="ticker" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "#94A3B8" }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "#94A3B8" }} tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} />
                  <Tooltip formatter={(v) => [`${(Number(v ?? 0) * 100).toFixed(2)}%`, "Expense Ratio"]} />
                  <Bar dataKey="expenseRatio" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: NOMINEE CHECKLIST AUDIT */}
      {activeTab === "nominee" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Nominees designation list */}
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" /> Designated Nominee Records
                </CardTitle>
                <CardDescription>Audited status of succession nominee registry matching SEBI mandates.</CardDescription>
              </div>
              <Badge variant="warning" className="text-[10px] font-black uppercase">2 Actions Required</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {nominees.map((nominee) => (
                  <div key={nominee.id} className="flex justify-between items-center p-4 hover:bg-accent/10 transition-colors text-xs font-semibold">
                    <div>
                      <h5 className="text-sm font-bold text-foreground">{nominee.name}</h5>
                      <div className="flex gap-2 text-[10px] text-muted-foreground mt-1">
                        <span>Relationship: {nominee.relationship}</span>
                        {nominee.verificationMethod && (
                          <>
                            <span>•</span>
                            <span className="text-green-500 font-bold">{nominee.verificationMethod}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      {nominee.allocation > 0 && (
                        <span className="text-xs font-bold text-foreground bg-accent px-2 py-1 rounded-lg">
                          Allocated: {nominee.allocation}%
                        </span>
                      )}
                      
                      <Badge 
                        variant={
                          nominee.status === "Verified" ? "success" : 
                          nominee.status === "Pending" ? "warning" : "danger"
                        }
                        className="px-2.5 py-0.5 font-bold uppercase tracking-wider"
                      >
                        {nominee.status === "Action Required" ? "Missing" : nominee.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Add nominee prompt form card */}
          <Card className="border-border/60 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Quick Add Nominee</CardTitle>
              <CardDescription>Upload nominee to missing portfolios securely.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter nominee name"
                  value={newNomineeName}
                  onChange={(e) => setNewNomineeName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 px-3 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold text-muted-foreground">Relationship</label>
                  <select
                    value={newNomineeRelation}
                    onChange={(e) => setNewNomineeRelation(e.target.value as any)}
                    className="h-10 w-full rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 px-3 cursor-pointer"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold text-muted-foreground">Alloc %</label>
                  <input
                    type="number"
                    max={100}
                    value={newNomineeAlloc}
                    onChange={(e) => setNewNomineeAlloc(Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-border bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 px-3 transition-all"
                  />
                </div>
              </div>

              <Button
                disabled={!newNomineeName}
                onClick={() => {
                  addNominee({
                    name: newNomineeName,
                    relationship: newNomineeRelation,
                    allocation: newNomineeAlloc,
                    status: "Verified",
                    verificationMethod: "Aadhar upload via e-KYC"
                  });
                  setNewNomineeName("");
                }}
                className="w-full text-xs font-bold"
              >
                Register Nominee Record
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
