"use client";

import React, { useState } from "react";
import { 
  FileCheck2, 
  Printer, 
  Palette,
  Download
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ClientProfile } from "@/types";

export function AdvisorWhiteLabelPDF() {
  const { 
    advisorSettings, 
    updateAdvisorSettings, 
    advisorClients, 
    selectedClientId, 
    setSelectedClient,
    companyExposures,
    holdings,
    openSyncModal
  } = usePortfolioStore();

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (holdings.length === 0 && advisorClients.length === 0) {
    return (
      <EmptyState
        icon={FileCheck2}
        title="No client portfolio loaded"
        description="Upload a client CAS statement or connect a portfolio to generate co-branded white-label audit reports with your firm logo and ARN."
        actionLabel="Connect Portfolio"
        onAction={() => openSyncModal("CAS")}
      />
    );
  }

  const selectedClient: ClientProfile = advisorClients.find(c => c.id === selectedClientId) || advisorClients[0] || {
    id: "active_client",
    name: "Active Portfolio",
    panMasked: "CAS-VERIFIED",
    portfolioValue: holdings.reduce((s, h) => s + (Number(h.currentValue) || 0), 0),
    healthScore: 780,
    topHolding: holdings[0]?.name || "N/A",
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const portfolioId = typeof window !== "undefined" ? localStorage.getItem("nivesh_active_portfolio_id") : null;
    if (!portfolioId) {
      window.print();
      return;
    }
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/portfolio/portfolios/${portfolioId}/pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nivesh_lens_audit_${portfolioId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-semibold">
            <FileCheck2 className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">1-Click White-Labeled PDF Audit Generator</h3>
            <p className="text-xs text-muted-foreground">Generate co-branded client diagnostic reports with custom IFA logo, ARN & colors</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="text-xs gap-1.5"
          >
            <Palette className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>{isCustomizing ? "Close Branding" : "Customize Branding"}</span>
          </Button>

          <Button 
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Print View</span>
          </Button>

          <Button 
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="text-xs gap-1.5 font-semibold"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>{isDownloading ? "Generating PDF..." : "Download Audit PDF"}</span>
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-2">
        Opens your browser's print dialog — choose <span className="text-foreground font-medium">"Save as PDF"</span> as the destination. Only the report below is included, not the app UI.
      </p>

      {/* Advisor Customization Drawer */}
      {isCustomizing && (
        <div className="mt-5 p-5 rounded-2xl bg-[var(--background-elevated)] border border-border/70 space-y-4 animate-in fade-in">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Advisor Firm Branding Settings</h4>
          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-muted-foreground mb-1 font-medium">Advisor Firm Name</label>
              <input 
                type="text" 
                value={advisorSettings.firmName}
                onChange={(e) => updateAdvisorSettings({ firmName: e.target.value })}
                className="w-full h-9 px-3 bg-[var(--background)] border border-border rounded-xl text-foreground font-semibold outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <label className="block text-muted-foreground mb-1 font-medium">Principal Advisor</label>
              <input 
                type="text" 
                value={advisorSettings.advisorName}
                onChange={(e) => updateAdvisorSettings({ advisorName: e.target.value })}
                className="w-full h-9 px-3 bg-[var(--background)] border border-border rounded-xl text-foreground outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <label className="block text-muted-foreground mb-1 font-medium">ARN / SEBI Reg. No.</label>
              <input 
                type="text" 
                value={advisorSettings.arnNumber}
                onChange={(e) => updateAdvisorSettings({ arnNumber: e.target.value })}
                className="w-full h-9 px-3 bg-[var(--background)] border border-border rounded-xl font-mono text-foreground outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <label className="block text-muted-foreground mb-1 font-medium">Advisor Email</label>
              <input 
                type="text" 
                value={advisorSettings.email}
                onChange={(e) => updateAdvisorSettings({ email: e.target.value })}
                className="w-full h-9 px-3 bg-[var(--background)] border border-border rounded-xl text-foreground outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <label className="block text-muted-foreground mb-1 font-medium">Advisor Phone</label>
              <input 
                type="text" 
                value={advisorSettings.phone}
                onChange={(e) => updateAdvisorSettings({ phone: e.target.value })}
                className="w-full h-9 px-3 bg-[var(--background)] border border-border rounded-xl text-foreground font-mono outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <label className="block text-muted-foreground mb-1 font-medium">Brand Accent Color</label>
              <input 
                type="text" 
                value={advisorSettings.brandPrimaryColor}
                onChange={(e) => updateAdvisorSettings({ brandPrimaryColor: e.target.value })}
                className="w-full h-9 px-3 bg-[var(--background)] border border-border rounded-xl text-foreground font-mono outline-none focus:border-primary/60"
              />
            </div>
          </div>
        </div>
      )}

      {/* Client Switcher Tabs */}
      {advisorClients.length > 1 && (
        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-muted-foreground shrink-0">Client Portfolio:</span>
          {advisorClients.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClient(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                selectedClientId === c.id 
                  ? "bg-primary text-white font-semibold shadow-sm" 
                  : "bg-accent text-muted-foreground hover:text-foreground border border-border/70"
              }`}
            >
              {c.name} (₹{Math.round(c.portfolioValue / 100000)}L)
            </button>
          ))}
        </div>
      )}

      {/* Printable Co-Branded Audit Document Preview (A4 styled) */}
      <div id="printable-audit-report" className="mt-6 p-8 rounded-2xl border border-border bg-[var(--background)] text-white shadow-2xl space-y-6 font-sans">
        
        {/* Document Header */}
        <div className="flex justify-between items-start pb-6 border-b border-border print-invert-border">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-primary uppercase font-semibold">PORTFOLIO DIAGNOSTIC REPORT</span>
            <h1 className="text-2xl font-semibold tracking-tight text-white mt-1">{advisorSettings.firmName}</h1>
            <p className="text-xs text-muted-foreground print-keep-muted font-mono mt-0.5">{advisorSettings.arnNumber} · {advisorSettings.sebiReg}</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold text-white">Client: {selectedClient.name}</p>
            <p className="text-muted-foreground print-keep-muted">{selectedClient.email}</p>
            <p className="text-muted-foreground print-keep-muted font-mono text-[10px] mt-1">Audit Date: {selectedClient.lastAuditDate}</p>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
          <div className="p-4 rounded-xl bg-[var(--card)] border border-border/70 print-invert-card">
            <span className="text-[10px] uppercase font-sans text-muted-foreground print-keep-muted block">Total Portfolio Value</span>
            <span className="text-xl font-semibold text-white mt-1 block tabular-nums">₹{selectedClient.portfolioValue.toLocaleString("en-IN")}</span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--card)] border border-border/70 print-invert-card">
            <span className="text-[10px] uppercase font-sans text-muted-foreground print-keep-muted block">Health Rating</span>
            <span className="text-xl font-semibold text-[var(--positive)] print-keep-positive mt-1 block tabular-nums">{selectedClient.riskScore} / 900</span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--card)] border border-border/70 print-invert-card">
            <span className="text-[10px] uppercase font-sans text-muted-foreground print-keep-muted block">HHI Concentration</span>
            <span className="text-xl font-semibold text-[var(--warning)] print-keep-warning mt-1 block tabular-nums">{selectedClient.hhiScore}</span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--card)] border border-border/70 print-invert-card">
            <span className="text-[10px] uppercase font-sans text-muted-foreground print-keep-muted block">Annual Fee Bleed</span>
            <span className="text-xl font-semibold text-[var(--negative)] print-keep-negative mt-1 block tabular-nums">₹{selectedClient.feeBleedAnnually.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Top Concentrated Company Look-Through */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground print-keep-muted font-sans">True Company Exposure & AMFI Look-Through</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--card)] print-invert-card text-[10px] text-muted-foreground print-keep-muted uppercase font-sans border-y border-border/70 print-invert-border">
                <tr>
                  <th className="p-3">Company</th>
                  <th className="p-3 text-right">Direct Stock</th>
                  <th className="p-3 text-right">MF Look-Through</th>
                  <th className="p-3 text-right">True Total Exposure</th>
                  <th className="p-3 text-center">Advisor Risk Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70 text-slate-300">
                {companyExposures.slice(0, 4).map((c) => (
                  <tr key={c.id}>
                    <td className="p-3 font-sans font-semibold text-white">{c.companyName}</td>
                    <td className="p-3 text-right font-mono tabular-nums">₹{c.directValue.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-right font-mono tabular-nums">₹{Math.round(c.indirectValue).toLocaleString("en-IN")}</td>
                    <td className="p-3 text-right font-mono font-semibold text-white tabular-nums">{c.totalTruePercent.toFixed(1)}%</td>
                    <td className="p-3 font-sans text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                        c.totalTruePercent >= 14 ? "bg-[var(--negative)]/10 text-[var(--negative)] border-[var(--negative)]/20" : "bg-[var(--positive)]/10 text-[var(--positive)] border-[var(--positive)]/20"
                      }`}>
                        {c.riskCategory}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Advisor Sign-off & Disclaimer Footer */}
        <div className="pt-6 border-t border-border print-invert-border flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-[11px] text-muted-foreground print-keep-muted">
          <div>
            <p className="font-semibold text-foreground">{advisorSettings.advisorName}</p>
            <p>{advisorSettings.firmName} · {advisorSettings.email} · {advisorSettings.phone}</p>
            <p className="text-[10px] text-muted-foreground/80 mt-2 max-w-xl leading-relaxed">{advisorSettings.disclaimer}</p>
          </div>
          <div className="text-right font-mono text-[10px] text-muted-foreground print-keep-muted">
            <span>Powered by Nivesh Lens X-Ray Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
