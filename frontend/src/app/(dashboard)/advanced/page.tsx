"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Send, 
  Mic, 
  ShieldAlert, 
  HelpCircle,
  TrendingDown,
  TrendingUp,
  Percent,
  Calculator,
  UserPlus,
  Plus,
  Users,
  AlertCircle,
  MessageSquare,
  Volume2,
  Lock,
  ExternalLink,
  ChevronRight,
  TrendingUp as IconTrendUp,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { usePortfolioStore } from "@/store/portfolioStore";
import { cn, formatINR, formatINRCompact, formatPercent } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type AdvancedTab = "tax" | "whatsapp" | "conglomerate" | "family" | "behavioral";

export default function AdvancedPage() {
  const { taxGains, holdings, getPortfolioValue } = usePortfolioStore();
  const [activeTab, setActiveTab] = useState<AdvancedTab>("tax");
  const [mounted, setMounted] = useState(false);

  // WhatsApp states
  const [messages, setMessages] = useState([
    { sender: "ai", text: "Hello! I am your Nivesh Lens WhatsApp companion. Ask me any question about your holdings, overlaps, or fee bleeding.", time: "10:32 AM" },
    { sender: "user", text: "Show me my top duplicate exposure warning.", time: "10:34 AM" },
    { sender: "ai", text: "Your top concentration issue is in HDFC Bank Ltd. You own it directly and indirectly via 3 mutual funds (Parag Parikh Flexi Cap, ICICI Bluechip, Nippon Small Cap). Aggregate exposure is 20.1% (₹6,03,600).", time: "10:34 AM" }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  // Family Portfolio States
  const [familyMembers, setFamilyMembers] = useState([
    { id: "f1", name: "Anubhav Thakur", relationship: "Self", value: 3000000, color: "#2563EB", active: true },
    { id: "f2", name: "Indransh Pratap", relationship: "Spouse", value: 1850000, color: "#10B981", active: true },
    { id: "f3", name: "Aarav Pratap", relationship: "Child", value: 450000, color: "#8B5CF6", active: false }
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tax calculations
  const totalTaxOwed = taxGains.reduce((sum, item) => sum + item.taxOwed, 0);

  // Conglomerate data
  const conglomerateData = [
    { name: "Tata Group", value: 12.5, color: "#2563EB" },
    { name: "Reliance Group", value: 18.5, color: "#10B981" },
    { name: "HDFC Group", value: 20.1, color: "#F59E0B" },
    { name: "Adani Group", value: 3.4, color: "#EC4899" },
    { name: "Others", value: 45.5, color: "#6B7280" }
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue) return;

    const newMsgs = [...messages, { sender: "user", text: inputValue, time: "Just now" }];
    setMessages(newMsgs);
    setInputValue("");

    // Simulate AI response
    setTimeout(() => {
      let aiText = "I have scanned your portfolio. You have ₹18,520 of fee savings opportunities in mutual funds. Let me know if you would like me to draft a switch recommendation.";
      if (inputValue.toLowerCase().includes("tax")) {
        aiText = "Based on your short-term losses in Infosys (₹12,400), you can harvest this loss to save ₹1,860 in short-term capital gains taxes.";
      }
      setMessages([...newMsgs, { sender: "ai", text: aiText, time: "Just now" }]);
    }, 1000);
  };

  const toggleFamilyMember = (id: string) => {
    setFamilyMembers(familyMembers.map(m => m.id === id ? { ...m, active: !m.active } : m));
  };

  // Get total family value
  const aggregateFamilyValue = familyMembers
    .filter(m => m.active)
    .reduce((sum, m) => sum + m.value, 0);

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Advanced Portals</h1>
        <p className="text-sm text-muted-foreground">AI Tax harvesting, WhatsApp query assistant, and family wealth consolidation hubs.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/60 gap-8 overflow-x-auto scrollbar-none">
        {[
          { id: "tax", label: "Tax Rebalancing" },
          { id: "whatsapp", label: "WhatsApp AI Chat" },
          { id: "conglomerate", label: "Conglomerate Exposure" },
          { id: "family", label: "Family Portfolios" },
          { id: "behavioral", label: "Behavioral AI Warnings" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AdvancedTab)}
            className={cn(
              "pb-4 text-xs font-semibold tracking-wider uppercase border-b-2 cursor-pointer transition-all shrink-0",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: TAX REBALANCING */}
      {activeTab === "tax" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Tax summary metrics */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-border/60">
              <CardContent className="p-6 text-center space-y-4">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">NET TAX LIABILITY</span>
                <h3 className={cn("text-3xl font-extrabold", totalTaxOwed >= 0 ? "text-amber-500" : "text-green-500")}>
                  {totalTaxOwed >= 0 ? "+" : ""}{formatINR(totalTaxOwed, 0)}
                </h3>
                <p className="text-xs text-muted-foreground">Estimated tax liabilities matching LTCG/STCG regimes for FY 2026-27</p>
                <div className="h-px bg-border/60 my-4" />
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Unrealized Losses (Harvestable):</span>
                  <span className="text-green-500">₹12,400</span>
                </div>
                <div className="flex justify-between text-xs font-semibold mt-2">
                  <span className="text-muted-foreground">Tax Savings Opportunity:</span>
                  <span className="text-green-500 font-extrabold">₹1,860</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-primary">
                  <Sparkles className="h-4.5 w-4.5" /> AI Tax Harvest Recs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-accent/25 border border-border/20 rounded-lg text-xs leading-normal">
                  <h6 className="font-bold text-foreground">Harvest Infosys STCG Loss</h6>
                  <p className="text-[11px] text-muted-foreground mt-1">Sell Infosys shares worth ₹1,84,811 to book ₹12,400 of short-term capital loss. Re-invest immediately into Nifty 50 Index ETF to maintain market exposure.</p>
                  <Button size="sm" className="mt-3 text-[10px] font-bold h-8">Execute Tax Harvest</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Capital gains list */}
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Realized Capital Gains Ledger</CardTitle>
              <CardDescription>Estimated transaction cost gains/losses compiled across depositories</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60 text-xs font-semibold">
                <div className="grid grid-cols-4 p-4 bg-accent/10 text-muted uppercase font-bold tracking-wider">
                  <span>Asset</span>
                  <span>Gain Type</span>
                  <span className="text-right">Capital Gain</span>
                  <span className="text-right">Tax Owed</span>
                </div>
                {taxGains.map((item) => (
                  <div key={item.id} className="grid grid-cols-4 p-4 hover:bg-accent/5 transition-colors">
                    <span className="text-foreground font-bold">{item.assetName}</span>
                    <span>
                      <Badge variant={item.gainType === "LTCG" ? "secondary" : "primary"} className="text-[9px] px-1 py-0 scale-90">
                        {item.gainType}
                      </Badge>
                    </span>
                    <span className={cn("text-right font-extrabold", item.gainAmount >= 0 ? "text-foreground" : "text-green-500")}>
                      {item.gainAmount >= 0 ? "+" : ""}{formatINRCompact(item.gainAmount)}
                    </span>
                    <span className={cn("text-right font-extrabold", item.taxOwed >= 0 ? "text-amber-500" : "text-green-500")}>
                      {item.taxOwed >= 0 ? "+" : ""}{formatINRCompact(item.taxOwed)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: WHATSAPP AI CHAT */}
      {activeTab === "whatsapp" && (
        <Card className="border-border/60 max-w-3xl mx-auto overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-border/40 p-4 flex flex-row justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center font-bold text-sm">
                💬
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Nivesh Lens AI Chatbot</CardTitle>
                <CardDescription className="text-[10px] text-green-500 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" /> Online • WhatsApp Companion API
                </CardDescription>
              </div>
            </div>
            <Badge variant="primary" className="text-[9px] font-black uppercase">Enforce Read-Only</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {/* Message area */}
            <div className="h-96 overflow-y-auto p-6 space-y-4 bg-accent/5 dark:bg-black/10">
              {messages.map((msg, index) => (
                <div 
                  key={index}
                  className={cn(
                    "flex flex-col max-w-[80%] rounded-xl p-3.5 shadow-sm text-xs font-semibold leading-normal animate-in fade-in duration-200",
                    msg.sender === "user" 
                      ? "bg-primary text-primary-foreground ml-auto rounded-tr-none"
                      : "bg-card text-foreground mr-auto border border-border/60 rounded-tl-none"
                  )}
                >
                  <p>{msg.text}</p>
                  <span className="text-[9px] text-muted-foreground/60 text-right mt-1.5 block">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* Input area */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-border/60 flex gap-3 bg-card">
              <input
                type="text"
                placeholder="Ask about overlaps, expense ratios, or tax rebalancing..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="h-11 flex-1 rounded-lg border border-border bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 px-4 transition-all"
              />
              <button
                type="button"
                onClick={() => {
                  setIsRecording(!isRecording);
                  if (!isRecording) {
                    setTimeout(() => {
                      setIsRecording(false);
                      setInputValue("Analyze my capital gains tax liability.");
                    }, 2500);
                  }
                }}
                className={cn(
                  "p-3 rounded-lg flex items-center justify-center cursor-pointer transition-colors border border-border",
                  isRecording 
                    ? "bg-red-500/10 text-red-500 border-red-500/30" 
                    : "bg-accent/60 text-muted hover:text-foreground hover:bg-accent"
                )}
                title="Simulate Voice Message"
              >
                <Mic className={cn("h-5 w-5", isRecording && "animate-pulse")} />
              </button>
              <Button type="submit" className="h-11 px-4 cursor-pointer">
                <Send className="h-4.5 w-4.5" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: CONGLOMERATE EXPOSURE */}
      {activeTab === "conglomerate" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Conglomerate Pie chart */}
          <Card className="border-border/60 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Conglomerate Share</CardTitle>
              <CardDescription>Portfolio split by major business conglomerates in India</CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex flex-col justify-between items-center">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={conglomerateData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {conglomerateData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-3 flex-wrap justify-center text-[10px] font-bold text-muted-foreground uppercase">
                {conglomerateData.map(c => (
                  <span key={c.name} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} /> {c.name.split(" ")[0]}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conglomerate hierarchies list */}
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-1.5">
                <AlertTriangle className="h-5 w-5 text-amber-500" /> Group Concentration Audits
              </CardTitle>
              <CardDescription>Indirect business group concentrations that elevate corporate group risk</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60 text-xs font-semibold">
                <div className="grid grid-cols-3 p-4 bg-accent/10 text-muted uppercase font-bold tracking-wider">
                  <span>Group Conglomerate</span>
                  <span>Indirect Weight</span>
                  <span className="text-right">Risk Assessment</span>
                </div>
                
                <div className="grid grid-cols-3 p-4 hover:bg-accent/5 transition-colors">
                  <div>
                    <h5 className="font-bold text-foreground">HDFC Financial Group</h5>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-normal">HDFC Bank + AMC + Life Insurance</p>
                  </div>
                  <span className="text-red-500 font-extrabold text-sm">20.1%</span>
                  <span className="text-right"><Badge variant="danger" className="text-[8px] py-0">High Exposure</Badge></span>
                </div>

                <div className="grid grid-cols-3 p-4 hover:bg-accent/5 transition-colors">
                  <div>
                    <h5 className="font-bold text-foreground">Reliance Industries Group</h5>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-normal">Petrochemicals + Retail + Telecom</p>
                  </div>
                  <span className="text-amber-500 font-extrabold text-sm">18.5%</span>
                  <span className="text-right"><Badge variant="warning" className="text-[8px] py-0">Moderate Risk</Badge></span>
                </div>

                <div className="grid grid-cols-3 p-4 hover:bg-accent/5 transition-colors">
                  <div>
                    <h5 className="font-bold text-foreground">Tata Business Group</h5>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-normal">TCS + Tata Motors + Titan + Consumer</p>
                  </div>
                  <span className="text-foreground text-sm">12.5%</span>
                  <span className="text-right"><Badge variant="success" className="text-[8px] py-0">Well Hedged</Badge></span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: FAMILY PORTFOLIOS */}
      {activeTab === "family" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Invites & Members list */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-border/60">
              <CardHeader className="flex flex-row justify-between items-center pb-2">
                <div>
                  <CardTitle className="text-base">Family Members</CardTitle>
                  <CardDescription>Aggregate or toggle individual diagnostics</CardDescription>
                </div>
                <Users className="h-5 w-5 text-muted" />
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex justify-between items-center text-xs font-semibold">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={member.active}
                        onChange={() => toggleFamilyMember(member.id)}
                        className="h-4.5 w-4.5 rounded border-border text-primary cursor-pointer focus:ring-primary/10"
                      />
                      <div>
                        <h5 className="text-sm font-bold text-foreground">{member.name}</h5>
                        <span className="text-[10px] text-muted">{member.relationship}</span>
                      </div>
                    </div>
                    <div className="text-right font-extrabold text-foreground">
                      {formatINRCompact(member.value)}
                    </div>
                  </div>
                ))}

                <div className="h-px bg-border/60 my-4" />

                <div className="flex justify-between items-center font-bold text-xs">
                  <span>AGGREGATED NET WORTH:</span>
                  <span className="text-primary text-base font-extrabold">{formatINRCompact(aggregateFamilyValue)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base">Invite Member</CardTitle>
                <CardDescription>Send invite link to merge depository scans securely</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  type="email"
                  placeholder="family@domain.com"
                  className="h-10 w-full rounded-lg border border-border bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 px-3 transition-all"
                />
                <Button className="w-full flex items-center justify-center gap-1.5 h-10 text-xs font-bold">
                  <UserPlus className="h-4 w-4" /> Share Invite Link
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Aggregate analysis graph */}
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Aggregated Portfolio Distribution</CardTitle>
              <CardDescription>Visual split of family net worth across members</CardDescription>
            </CardHeader>
            <CardContent className="h-80 pt-4 flex items-center justify-between gap-6">
              <div className="w-[50%] h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={familyMembers.filter(m => m.active)}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {familyMembers.filter(m => m.active).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatINRCompact(Number(v ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-[50%] space-y-4">
                {familyMembers.filter(m => m.active).map((member) => (
                  <div key={member.id} className="text-xs font-semibold flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2 text-muted-foreground truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: member.color }} />
                        {member.name}
                      </span>
                      <span className="text-foreground">{((member.value / aggregateFamilyValue) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: BEHAVIORAL AI WARNINGS */}
      {activeTab === "behavioral" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Timeline of panic warnings */}
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" /> Emotional Trading Warnings log
              </CardTitle>
              <CardDescription>Depository transactions matching panic-selling signatures or FOMO buying</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="relative border-l-2 border-border/80 pl-6 space-y-6 ml-2">
                {/* Log item 1 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-red-500 border border-card flex items-center justify-center text-[9px] font-black text-white" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-foreground">FOMO Purchase Flagged</h5>
                      <span className="text-[10px] text-muted-foreground">July 2026</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal font-medium">
                      You purchased Nippon Small Cap after it shot up **18% in 3 weeks**. AI registers this as FOMO buying behavior. Historically, buying at near-term peaks drags down 3-year CAGRs.
                    </p>
                  </div>
                </div>

                {/* Log item 2 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-amber-500 border border-card flex items-center justify-center text-[9px] font-black text-white" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-foreground">Frequent Portfolio Checking Nudge</h5>
                      <span className="text-[10px] text-muted-foreground">June 2026</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal font-medium">
                      Platform accesses logged **45 login checks** in a single volatile market week. Increased monitoring correlates directly with panic liquidation decisions. Weekly email digests recommended.
                    </p>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Behavioral scoring metrics */}
          <Card className="border-border/60 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Investor Temperament Rating</CardTitle>
              <CardDescription>AI evaluation of emotional trade biases</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="p-6 rounded-2xl border border-border bg-accent/25 space-y-2">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">BEHAVIORAL GRADE</span>
                <div className="text-4xl font-black text-amber-500">
                  Moderate
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal pt-2 font-medium">
                  Moderate temperament. Emotional trades reduced. Flagged once for FOMO.
                </p>
              </div>

              <div className="text-xs text-muted-foreground text-left leading-normal p-3 rounded-lg bg-accent/25 border border-border/40">
                <h6 className="font-bold text-foreground mb-1">AI Improvement Advice:</h6>
                <p className="text-[11px]">
                  Setting up automated monthly SIP transfers directly from depository accounts reduces manual trigger choices, minimizing impulse buying peaks.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
