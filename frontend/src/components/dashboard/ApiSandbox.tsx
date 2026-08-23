"use client";

import React, { useState } from "react";
import { 
  Code2, 
  Key, 
  Copy, 
  Check
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ApiSandbox() {
  const apiKey = "nl_live_938ksndiuwh9283hsdiu71928";
  const [copied, setCopied] = useState(false);
  const [selectedLang, setSelectedLang] = useState<"curl" | "python" | "react">("react");
  const responseJson = `{
  "status": "success",
  "data": {
    "health_score": 742,
    "hhi_index": 1420,
    "total_true_exposure": {
      "RELIANCE": { "direct_pct": 11.36, "indirect_pct": 3.28, "total_pct": 14.64 },
      "HDFCBANK": { "direct_pct": 11.81, "indirect_pct": 4.06, "total_pct": 15.87 }
    },
    "duplicate_ter_bleed_annual": 24800,
    "nominee_status": "Action Required (2 Folios Unassigned)"
  }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeSnippets = {
    react: `import { NiveshLensWidget } from "@nivesh-lens/react-sdk";

export function ClientWealthPage() {
  return (
    <NiveshLensWidget
      apiKey="nl_live_938ksndiuwh9283hsdiu71928"
      theme="dark"
      enableLookThrough={true}
      onDiagnosticCalculated={(data) => console.log("Score:", data.health_score)}
    />
  );
}`,
    python: `import nivesh_lens

client = nivesh_lens.Client(api_key="nl_live_938ksndiuwh9283hsdiu71928")
report = client.portfolio.xray(cas_file_path="client_statement.pdf", password="PAN")

print(f"Health Rating: {report.health_score}")
print(f"Duplicate TER Bleed: ₹{report.duplicate_ter_annual}")`,
    curl: `curl -X POST https://api.niveshlens.com/v1/portfolio/xray \\
  -H "Authorization: Bearer nl_live_938ksndiuwh9283hsdiu71928" \\
  -H "Content-Type: application/json" \\
  -d '{"user_id": "usr_94820", "look_through": true}'`
  };

  return (
    <div className="rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <Code2 className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">B2B API & SDK Widget Licensing Portal</h3>
            <p className="text-xs text-muted-foreground">Embed Portfolio X-Ray diagnostic engines into your own Wealthtech apps, Brokers & IFAs</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[var(--positive)] bg-[var(--positive)]/10 px-2.5 py-1 rounded-lg border border-[var(--positive)]/20">
          <span className="w-2 h-2 rounded-full bg-[var(--positive)] animate-pulse" />
          <span>Gateway Live</span>
        </div>
      </div>

      {/* API Key Box */}
      <div className="mt-5 p-4 rounded-xl bg-[var(--background-elevated)] border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Key className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
          <span className="text-muted-foreground">Live Secret API Key:</span>
          <code className="font-mono bg-[var(--background)] px-2.5 py-1 rounded-lg border border-border text-foreground font-semibold text-[11px] tabular-nums">
            {apiKey}
          </code>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs gap-1.5 self-start sm:self-auto">
          {copied ? <Check className="w-3.5 h-3.5 text-[var(--positive)]" strokeWidth={1.75} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />}
          <span>{copied ? "Copied!" : "Copy Key"}</span>
        </Button>
      </div>

      {/* Interactive API Playground */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        
        {/* Code Snippets & Language Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">Integration SDK Snippet</span>
            <div className="flex rounded-xl bg-[var(--background-elevated)] p-1 border border-border/70">
              {(["react", "python", "curl"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                    selectedLang === lang ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-[var(--background)] p-5 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
            <pre>{codeSnippets[selectedLang]}</pre>
          </div>
        </div>

        {/* Live Response Payload Sandbox */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">Live JSON Endpoint Response</span>
            <span className="text-[10px] font-mono text-[var(--positive)] font-bold tabular-nums">HTTP 200 OK (38ms)</span>
          </div>

          <div className="rounded-2xl border border-border/70 bg-[var(--background)] p-5 font-mono text-xs text-[var(--positive)] overflow-x-auto leading-relaxed">
            <pre>{responseJson}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
