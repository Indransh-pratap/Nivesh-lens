"use client";

import React, { useState } from "react";
import { 
  Users, 
  Search, 
  ArrowUpRight, 
  Download, 
  Plus, 
  SlidersHorizontal,
  Mail,
  UserCheck,
  Briefcase,
  TrendingUp,
  Settings,
  HelpCircle,
  FileText,
  BadgeAlert
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { cn, formatINR, formatINRCompact, formatPercent } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MOCK_ADVISOR_CLIENTS } from "@/data/mock/portfolioData";

export default function AdvisorPage() {
  const [clients, setClients] = useState(MOCK_ADVISOR_CLIENTS);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Brand setting states
  const [brandName, setBrandName] = useState("Alpha Wealth Management");
  const [customDomain, setCustomDomain] = useState("portal.alphawealth.in");
  const [primaryColor, setPrimaryColor] = useState("#2563EB");

  // PDF reports mock list
  const mockReports = [
    { id: "rep1", client: "Anubhav Thakur", type: "Full Portfolio X-Ray", date: "2026-08-01", status: "Generated" },
    { id: "rep2", client: "Ramesh Sharma", type: "Fee Bleed Audit", date: "2026-07-28", status: "Generated" },
    { id: "rep3", client: "Sneha Patel", type: "Nominee Compliance", date: "2026-07-15", status: "Archived" }
  ];

  // Aggregates
  const totalClientAUM = clients.reduce((sum, c) => sum + c.portfolioValue, 0);
  const totalFeeCollected = clients.reduce((sum, c) => sum + c.feeBleedAnnually, 0);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Advisor Workspace</h1>
          <p className="text-sm text-muted-foreground">Manage client assets, generate PDF diagnostics, and configure advisory white-label skins.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="flex items-center gap-1">
            <Plus className="h-4 w-4" /> Add New Client
          </Button>
        </div>
      </div>

      {/* Advisory Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-2">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">TOTAL CLIENT AUM</span>
            <h3 className="text-2xl font-black">{formatINRCompact(totalClientAUM)}</h3>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              Across <span className="text-foreground font-bold">{clients.length} active clients</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-2">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">ANNUAL ADVISORY FEES UNDER MGMT</span>
            <h3 className="text-2xl font-black text-green-500">{formatINRCompact(totalFeeCollected)}</h3>
            <p className="text-xs text-muted-foreground mt-1">Average fee weight: <span className="font-bold text-foreground">0.75% AUM</span></p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-2">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">CLIENT DIAGNOSTICS STATS</span>
            <h3 className="text-2xl font-black text-amber-500">3 Alerts</h3>
            <p className="text-xs text-muted-foreground mt-1">2 clients with nominee registration holes</p>
          </CardContent>
        </Card>
      </div>

      {/* Main client grid & configurations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Client List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60 overflow-hidden">
            <CardHeader className="pb-2 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="text-base">Client Directories</CardTitle>
                <CardDescription>Click client to access detailed look-through metrics</CardDescription>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-muted" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 w-full rounded-lg border border-border bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-semibold">
                  <thead>
                    <tr className="border-b border-border/60 bg-accent/20 text-muted uppercase font-bold tracking-wider">
                      <th className="py-4 px-6">Client Details</th>
                      <th className="py-4 px-4 text-right">Portfolio value</th>
                      <th className="py-4 px-4 text-right">Total returns</th>
                      <th className="py-4 px-4">Diversification</th>
                      <th className="py-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-accent/10 transition-colors">
                        <td className="py-4 px-6 font-bold">
                          <div className="flex flex-col">
                            <span className="text-sm text-foreground">{client.name}</span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 font-normal">{client.email}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-extrabold text-foreground">
                          {formatINR(client.portfolioValue, 0)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={cn("font-bold", client.gainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                            {client.gainLoss >= 0 ? "▲" : "▼"} {formatPercent(client.gainLossPercent)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <Badge 
                            variant={
                              client.diversificationGrade === "Excellent" ? "success" : 
                              client.diversificationGrade === "Good" ? "primary" : "danger"
                            }
                            className="px-2"
                          >
                            {client.diversificationGrade}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button size="sm" variant="ghost" className="h-8 px-2">
                            <ArrowUpRight className="h-4.5 w-4.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Audit reports PDF history */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">White-Label PDF Reports History</CardTitle>
              <CardDescription>PDF logs generated for client portfolio audits</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 p-0">
              {mockReports.map((report) => (
                <div key={report.id} className="p-4 flex justify-between items-center text-xs font-semibold">
                  <div>
                    <h5 className="text-sm font-bold text-foreground">{report.client}</h5>
                    <div className="flex gap-2 text-[10px] text-muted-foreground mt-1">
                      <span>{report.type}</span>
                      <span>•</span>
                      <span>Date: {report.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="success" className="text-[9px] uppercase font-black tracking-wide">{report.status}</Badge>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 flex items-center justify-center">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Brand Settings */}
        <Card className="border-border/60 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" /> White-Label Settings
            </CardTitle>
            <CardDescription>Configure branding options for client portals and diagnostic PDFs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-muted-foreground">Advisory Firm Name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 px-3 transition-all font-bold"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-muted-foreground">Custom Access Domain</label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 px-3 transition-all font-bold"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-muted-foreground">Primary Accent Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-12 rounded border border-border bg-card cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 flex-1 rounded-lg border border-border bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 px-3 transition-all font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button className="w-full text-xs font-bold h-10">
                Save Branding Settings
              </Button>
            </div>

            <div className="rounded-lg bg-accent/20 border border-border/40 p-4 text-[10px] text-muted-foreground leading-normal space-y-1">
              <h6 className="font-bold text-foreground">White-labeling rules:</h6>
              <p>Clients accessing their diagnostics portal from your custom domain see your brand name, logo headers, and accent colors. Downloadable PDF audits reflect identical brand signatures.</p>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
