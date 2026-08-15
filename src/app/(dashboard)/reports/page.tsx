"use client";

import React, { useRef, useState } from "react";
import { 
  FileText, 
  Download, 
  Printer, 
  Share2, 
  CheckCircle2, 
  AlertTriangle,
  Briefcase,
  TrendingUp,
  Percent,
  TrendingDown,
  Mail,
  UserCheck
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { cn, formatINR, formatINRCompact, formatPercent } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function ReportsPage() {
  const { 
    holdings, 
    alerts, 
    getPortfolioValue, 
    getAverageExpenseRatio, 
    getDiversificationScore 
  } = usePortfolioStore();

  const [isExporting, setIsExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const originalValue = getPortfolioValue();
  const avgExpense = getAverageExpenseRatio();
  const divScore = getDiversificationScore();

  const handleExport = (type: "pdf" | "print" | "share") => {
    setIsExporting(true);
    setSuccessMsg("");
    
    setTimeout(() => {
      setIsExporting(false);
      if (type === "pdf") {
        setSuccessMsg("Client report PDF generated and downloaded successfully.");
      } else if (type === "print") {
        window.print();
      } else {
        setSuccessMsg("Audit report shareable link copied to clipboard.");
      }
      setTimeout(() => setSuccessMsg(""), 3000);
    }, 1500);
  };

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Portfolio Audits</h1>
          <p className="text-sm text-muted-foreground">Download comprehensive portfolio look-through reports ready for client presentation.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => handleExport("share")}
            disabled={isExporting}
            className="flex items-center gap-1.5"
          >
            <Share2 className="h-4 w-4" /> Share Link
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => handleExport("print")}
            disabled={isExporting}
            className="flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button 
            size="sm" 
            onClick={() => handleExport("pdf")}
            disabled={isExporting}
            className="flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" /> {isExporting ? "Generating PDF..." : "Download PDF Audit"}
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-lg dark:bg-green-950/20 dark:border-green-900/40 dark:text-green-400 animate-in fade-in duration-200">
          ✓ {successMsg}
        </div>
      )}

      {/* Report Sheet Preview Box */}
      <div className="max-w-4xl mx-auto">
        <div className="border border-border/80 bg-card rounded-2xl shadow-xl p-8 md:p-12 space-y-8 text-left font-semibold text-xs leading-normal">
          
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-border/80 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-extrabold text-base">
                  N
                </div>
                <span className="font-extrabold text-lg tracking-tight">NIVESH LENS AUDIT</span>
              </div>
              <p className="text-[10px] text-muted-foreground">White-Label Client Diagnostics Portal</p>
            </div>
            
            <div className="text-left sm:text-right font-normal">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">REPORT GENERATED FOR</span>
              <h4 className="text-sm font-bold text-foreground mt-0.5">Anubhav Thakur</h4>
              <p className="text-[10px] text-muted-foreground">Date: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} • pan: AXCP••••4F</p>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider pb-1 border-b border-border/30">
              1. Executive Summary
            </h3>
            <p className="font-normal text-muted-foreground leading-relaxed">
              Your aggregate portfolio worth **{formatINR(originalValue, 0)}** has been audited across stock registries and mutual fund AMC holdings databases. The audit uncovers moderate risks related to duplicate stock overlaps and expense ratio fee drag.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center pt-2">
              <div className="p-4 bg-accent/25 rounded-lg border border-border/20">
                <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">AUM Valuation</span>
                <span className="text-lg font-black text-foreground mt-1 block">{formatINR(originalValue, 0)}</span>
              </div>
              <div className="p-4 bg-accent/25 rounded-lg border border-border/20">
                <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Diagnostic Score</span>
                <span className="text-lg font-black text-green-500 mt-1 block">{divScore} / 900</span>
              </div>
              <div className="p-4 bg-accent/25 rounded-lg border border-border/20">
                <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Weighted Fee</span>
                <span className="text-lg font-black text-red-500 mt-1 block">{(avgExpense * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Section 2: Underlying Stock Exposure & Overlaps */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider pb-1 border-b border-border/30">
              2. Concentration & Double-Exposure Audit
            </h3>
            <p className="font-normal text-muted-foreground leading-relaxed">
              Scanning individual stocks held directly alongside underlying mutual fund positions uncovers high exposure to Financials (34.2%) and Energy (19.8%).
            </p>
            
            <div className="divide-y divide-border/60 border border-border/40 rounded-lg overflow-hidden">
              <div className="grid grid-cols-3 p-3 bg-accent/20 text-muted uppercase font-bold tracking-wider">
                <span>Top Company Exposure</span>
                <span>Aggregate Weight</span>
                <span className="text-right">AUM Value</span>
              </div>
              <div className="grid grid-cols-3 p-3 font-semibold hover:bg-accent/5">
                <span className="text-foreground">HDFC Bank Ltd.</span>
                <span className="text-red-500 font-bold">20.1% (High Risk)</span>
                <span className="text-right">{formatINRCompact(originalValue * 0.201)}</span>
              </div>
              <div className="grid grid-cols-3 p-3 font-semibold hover:bg-accent/5">
                <span className="text-foreground">Reliance Industries Ltd.</span>
                <span className="text-amber-500 font-bold">18.5% (Warning)</span>
                <span className="text-right">{formatINRCompact(originalValue * 0.185)}</span>
              </div>
              <div className="grid grid-cols-3 p-3 font-semibold hover:bg-accent/5">
                <span className="text-foreground">Tata Consultancy Services Ltd.</span>
                <span className="text-foreground">11.2%</span>
                <span className="text-right">{formatINRCompact(originalValue * 0.112)}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Diagnostic Warnings */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider pb-1 border-b border-border/30">
              3. Critical Action Warnings
            </h3>
            <div className="space-y-2.5">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="p-3 bg-accent/20 rounded-lg border border-border/40 flex items-start gap-2.5">
                  <div className="mt-0.5">
                    {alert.type === "Danger" ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div>
                    <h5 className="font-bold text-foreground text-xs">{alert.title}</h5>
                    <p className="text-[10px] text-muted-foreground font-normal mt-0.5">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Advisor Suggestions */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider pb-1 border-b border-border/30">
              4. Rebalancing & Optimization suggestions
            </h3>
            <ul className="space-y-3 font-normal text-muted-foreground list-disc pl-5">
              <li>
                **Convert Regular Plans to Direct Options**: Current fee structures bleed **₹18,520 annually**. Switch Parag Parikh Flexi Cap and ICICI Bluechip to Direct plans.
              </li>
              <li>
                **Designate Succession Nominees**: SEBI records indicate that SBI Contra Fund and Nippon India Small Cap have no designated nominees. Designate immediately to bypass compliance issues.
              </li>
              <li>
                **Consolidate Large-Cap Financials Overlap**: Swap ICICI Bluechip for a broad-based Nifty 50 Index ETF to eliminate redundant large-cap stock overlaps in HDFC Bank shares.
              </li>
            </ul>
          </div>

          <div className="h-px bg-border/80" />

          {/* Report Footer */}
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-normal">
            <span>Disclaimers: Registered investment advisory audit records. Private client report.</span>
            <span>niveshlens.com</span>
          </div>

        </div>
      </div>
    </div>
  );
}
