"use client";

import React, { useState } from "react";
import { 
  Key, 
  Plus, 
  Copy, 
  Trash2, 
  Check, 
  Code, 
  Terminal, 
  Globe, 
  Activity, 
  Cpu, 
  HelpCircle,
  FileText,
  RefreshCw
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from "recharts";
import { usePortfolioStore } from "@/store/portfolioStore";
import { cn, formatINRCompact } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MOCK_API_KEYS, MOCK_WEBHOOKS } from "@/data/mock/portfolioData";

type DocLang = "curl" | "node" | "python";

export default function DeveloperPage() {
  const [apiKeys, setApiKeys] = useState(MOCK_API_KEYS);
  const [webhooks, setWebhooks] = useState(MOCK_WEBHOOKS);
  const [activeLang, setActiveLang] = useState<DocLang>("curl");
  
  // UI states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddKey = () => {
    if (!newKeyName) return;
    const newKey = {
      id: `k_${Date.now()}`,
      name: newKeyName,
      key: `nl_live_${Math.random().toString(36).substring(2, 20)}`,
      created: new Date().toISOString().split("T")[0],
      status: "Active"
    };
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName("");
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
  };

  const handleAddWebhook = () => {
    if (!webhookUrl) return;
    const newWh = {
      id: `w_${Date.now()}`,
      url: webhookUrl,
      events: ["portfolio.synced", "risk.alert"],
      created: new Date().toISOString().split("T")[0],
      status: "Active"
    };
    setWebhooks([...webhooks, newWh]);
    setWebhookUrl("");
  };

  // Mock API usage graph (Last 7 Days)
  const usageData = [
    { day: "Mon", requests: 1240 },
    { day: "Tue", requests: 1850 },
    { day: "Wed", requests: 2200 },
    { day: "Thu", requests: 1650 },
    { day: "Fri", requests: 2900 },
    { day: "Sat", requests: 1100 },
    { day: "Sun", requests: 1450 }
  ];

  const codeSnippets = {
    curl: `curl -X POST "https://api.niveshlens.com/v1/portfolios/sync" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "depository": "NSDL",
    "pan_hash": "a823fksd...",
    "phone": "+919876543210"
  }'`,
    node: `const axios = require('axios');

axios.post('https://api.niveshlens.com/v1/portfolios/sync', {
  depository: 'NSDL',
  pan_hash: 'a823fksd...',
  phone: '+919876543210'
}, {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
.then(res => console.log(res.data))
.catch(err => console.error(err));`,
    python: `import requests

url = "https://api.niveshlens.com/v1/portfolios/sync"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
data = {
    "depository": "NSDL",
    "pan_hash": "a823fksd...",
    "phone": "+919876543210"
}

response = requests.post(url, json=data, headers=headers)
print(response.json())`
  };

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Developer SDK & Portal</h1>
        <p className="text-sm text-muted-foreground">Integrate portfolio X-ray diagnostics directly inside your advisory system or mobile apps.</p>
      </div>

      {/* Top Usage KPI and Limits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> API Request Usage (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-44 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usageData} margin={{ left: -25, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "#94A3B8" }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "#94A3B8" }} />
                <Tooltip />
                <Bar dataKey="requests" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-4">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">RATE LIMIT METRICS</span>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Current Tier Limit:</span>
                <span className="text-foreground">10,000 reqs / mo</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Active Usage:</span>
                <span className="text-foreground">2,390 (23.9%)</span>
              </div>
            </div>
            <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "23.9%" }} />
            </div>
            <p className="text-[10px] text-muted-foreground leading-normal">Upgrade to Advisor Enterprise plan to access unlimited request rate boundaries and sandbox SDK clusters.</p>
          </CardContent>
        </Card>
      </div>

      {/* Keys and Webhooks configurations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Keys & Webhooks */}
        <div className="lg:col-span-2 space-y-6">
          {/* API Keys Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-2 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-1.5">
                  <Key className="h-5 w-5 text-primary" /> Active API Access Keys
                </CardTitle>
                <CardDescription>Authentication bearer tokens. Keep them confidential.</CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Key name (e.g. Mobile App)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 px-3 transition-all flex-1 sm:flex-none"
                />
                <Button size="sm" onClick={handleAddKey} disabled={!newKeyName} className="h-9">
                  <Plus className="h-4 w-4" /> Generate
                </Button>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 p-0">
              {apiKeys.map((keyRecord) => (
                <div key={keyRecord.id} className="p-4 flex justify-between items-center text-xs font-semibold">
                  <div>
                    <h5 className="text-sm font-bold text-foreground">{keyRecord.name}</h5>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1 font-mono">
                      <span>{keyRecord.key.slice(0, 12)}••••••••</span>
                      <button 
                        onClick={() => handleCopy(keyRecord.id, keyRecord.key)}
                        className="hover:text-foreground p-0.5 cursor-pointer"
                        title="Copy Key"
                      >
                        {copiedId === keyRecord.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge variant="primary" className="text-[9px] font-bold uppercase tracking-wider">{keyRecord.status}</Badge>
                    <button 
                      onClick={() => handleDeleteKey(keyRecord.id)}
                      className="p-2 text-muted hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Webhooks Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-2 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-1.5">
                  <Globe className="h-5 w-5 text-primary" /> Webhook Events callbacks
                </CardTitle>
                <CardDescription>Receive real-time callback triggers when a client portfolio is synced.</CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="https://yourdomain.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 px-3 transition-all flex-1 sm:flex-none"
                />
                <Button size="sm" onClick={handleAddWebhook} disabled={!webhookUrl} className="h-9">
                  <Plus className="h-4 w-4" /> Add Webhook
                </Button>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 p-0">
              {webhooks.map((wh) => (
                <div key={wh.id} className="p-4 flex justify-between items-center text-xs font-semibold">
                  <div>
                    <h5 className="text-sm font-bold text-foreground truncate max-w-xs">{wh.url}</h5>
                    <div className="flex gap-2 text-[10px] text-muted-foreground mt-1">
                      <span>Events: {wh.events.join(", ")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="success" className="text-[9px] font-bold uppercase tracking-wider">{wh.status}</Badge>
                    <button 
                      onClick={() => setWebhooks(webhooks.filter(w => w.id !== wh.id))}
                      className="p-2 text-muted hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Code Snippets & docs */}
        <Card className="border-border/60 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" /> Integration Docs
            </CardTitle>
            <CardDescription>Code templates to initialize client diagnostic syncs via API callbacks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="flex bg-accent/40 p-0.5 rounded-lg border border-border/40 text-[10px] font-bold uppercase">
              {(["curl", "node", "python"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={cn(
                    "flex-1 py-1.5 rounded-md cursor-pointer transition-colors text-center",
                    activeLang === lang 
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  {lang === "node" ? "Node.js" : lang === "python" ? "Python" : "cURL"}
                </button>
              ))}
            </div>

            <div className="relative">
              <pre className="bg-black text-[11px] font-mono p-4 rounded-lg overflow-x-auto text-green-400 max-h-56 leading-normal border border-slate-900">
                <code>{codeSnippets[activeLang]}</code>
              </pre>
              <button 
                onClick={() => handleCopy("code", codeSnippets[activeLang])}
                className="absolute top-2.5 right-2.5 p-1 rounded bg-slate-800 text-white hover:bg-slate-700 transition-colors cursor-pointer"
                title="Copy Code"
              >
                {copiedId === "code" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>

            <div className="rounded-lg bg-accent/20 border border-border/40 p-4 text-[10px] text-muted-foreground leading-normal space-y-1">
              <h6 className="font-bold text-foreground">API specifications:</h6>
              <p>Depository registries responses compile structural assets aggregates. Pan hashes match encrypted SEBI portfolios identifiers directly.</p>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
