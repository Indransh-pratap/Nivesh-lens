"use client";

import React, { useState } from "react";
import { 
  MessageSquare, 
  Play, 
  Pause, 
  FileText, 
  CheckCheck, 
  Volume2
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { EmptyState } from "@/components/ui/EmptyState";

export function WhatsAppAgentMockup() {
  const { holdings, companyExposures, getDiversificationScore, getWastedFeeAnnually, openSyncModal } = usePortfolioStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<"Hinglish" | "English">("Hinglish");

  if (holdings.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="WhatsApp Assistant Preview Unavailable"
        description="Upload your CAS statement or connect your broker to see how Nivesh Lens AI sends voice notes, infographics, and diagnostics directly to WhatsApp."
        actionLabel="Connect Portfolio"
        onAction={openSyncModal}
      />
    );
  }

  const score = getDiversificationScore();
  const wastedFee = getWastedFeeAnnually();
  const topExposure = companyExposures.length > 0 ? companyExposures[0] : null;

  return (
    <div className="rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--positive)]/10 text-[var(--positive)] border border-[var(--positive)]/20 flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">WhatsApp Native AI Agent (&ldquo;No-App Experience&rdquo;)</h3>
            <p className="text-xs text-muted-foreground">User forwards password-protected CAS PDF on WhatsApp → AI sends Voice Note & Infographic</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Language:</span>
          <div className="flex rounded-xl bg-[var(--background-elevated)] p-1 border border-border/70">
            <button 
              onClick={() => setActiveLanguage("Hinglish")}
              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeLanguage === "Hinglish" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Hinglish
            </button>
            <button 
              onClick={() => setActiveLanguage("English")}
              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeLanguage === "English" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              English
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Smartphone Mockup */}
      <div className="max-w-lg mx-auto mt-6 rounded-3xl border border-border-strong bg-[var(--background)] p-4 shadow-2xl relative overflow-hidden">
        {/* Smartphone top notch */}
        <div className="w-28 h-3.5 bg-white/[0.06] rounded-full mx-auto mb-3" />

        {/* WhatsApp Top Bar */}
        <div className="flex items-center gap-3 pb-3 border-b border-border/70 text-xs">
          <div className="w-8 h-8 rounded-full bg-[var(--positive)]/20 border border-[var(--positive)]/30 text-[var(--positive)] flex items-center justify-center font-bold">
            N
          </div>
          <div>
            <p className="font-bold text-white flex items-center gap-1.5">
              <span>Nivesh Lens AI Diagnostic</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">Verified WealthTech Agent · Online</p>
          </div>
        </div>

        {/* Chat Stream */}
        <div className="py-4 space-y-4 text-xs font-sans">
          
          {/* User incoming CAS file message */}
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-emerald-950/40 border border-emerald-800/40 p-3 text-white space-y-2">
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-900/30 border border-emerald-700/30">
                <FileText className="w-5 h-5 text-[var(--positive)] shrink-0" strokeWidth={1.75} />
                <div className="overflow-hidden">
                  <p className="font-bold text-[11px] truncate">CAS_Consolidated_Statement.pdf</p>
                  <p className="text-[9px] text-emerald-300/80 font-mono">Encrypted · Analyzed</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-200">Hi Nivesh Lens, please check my portfolio and tell me where I am losing money.</p>
              <div className="flex justify-end items-center gap-1 text-[9px] text-[var(--positive)] font-mono">
                <span>04:15 PM</span>
                <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
              </div>
            </div>
          </div>

          {/* AI Response: Voice Note Message */}
          <div className="flex justify-start">
            <div className="max-w-[88%] rounded-2xl rounded-tl-none bg-[var(--card)] border border-border p-3.5 text-white space-y-2.5">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--background-elevated)] border border-border/50">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  aria-label={isPlaying ? "Pause preview" : "Play preview"}
                  className="w-8 h-8 rounded-full bg-[var(--positive)] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-md active:scale-95 transition-transform"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="flex-1 space-y-1">
                  {/* Waveform visual */}
                  <div className="flex items-center gap-0.5 h-4">
                    {[3, 6, 12, 8, 14, 10, 16, 6, 12, 18, 10, 14, 8, 4, 10, 6].map((h, i) => (
                      <span 
                        key={i} 
                        className={`w-1 rounded-full ${isPlaying ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`}
                        style={{ height: `${h}px` }} 
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                    <span className="tabular-nums">{isPlaying ? "0:18" : "0:00"}</span>
                    <span className="tabular-nums">0:48</span>
                  </div>
                </div>
              </div>

              {/* Transcription */}
              <div className="p-3 rounded-xl bg-[var(--background-elevated)] border border-border/50 text-[11px] leading-relaxed text-slate-300">
                <div className="flex items-center gap-1 text-[var(--positive)] font-bold mb-1">
                  <Volume2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>AI Voice Note Summary ({activeLanguage}):</span>
                </div>
                {activeLanguage === "Hinglish" ? (
                  <p>
                    &ldquo;Namaste! Humne aapka portfolio analyze kar liya hai. Aapka <strong className="text-white font-mono tabular-nums">Health Score {score}/900</strong> hai.{topExposure ? <> Sabse bada exposure <strong className="text-white font-mono tabular-nums">{topExposure.totalTruePercent.toFixed(1)}% {topExposure.companyName}</strong> me hai.</> : ""} Sath hi, aap <strong className="text-white font-mono tabular-nums">₹{wastedFee.toLocaleString("en-IN")} har saal duplicate fees</strong> me bacha sakte hain.&rdquo;
                  </p>
                ) : (
                  <p>
                    &ldquo;Hello! We analyzed your portfolio. Your <strong className="text-white font-mono tabular-nums">Health Score is {score}/900</strong>.{topExposure ? <> Top exposure: <strong className="text-white font-mono tabular-nums">{topExposure.totalTruePercent.toFixed(1)}% in {topExposure.companyName}</strong>.</> : ""} Also, you can save <strong className="text-white font-mono tabular-nums">₹{wastedFee.toLocaleString("en-IN")}/yr in duplicate fees</strong>.&rdquo;
                  </p>
                )}
              </div>

              {/* Infographic Summary Card inside WhatsApp */}
              <div className="rounded-xl border border-border/70 bg-[var(--background-elevated)] p-3 space-y-1.5">
                <div className="flex justify-between items-center text-xs pb-1.5 border-b border-border/70">
                  <span className="font-bold text-[var(--positive)]">Nivesh Lens Diagnostic</span>
                  <span className="font-mono font-bold text-white tabular-nums">Score: {score}/900</span>
                </div>
                <div className="text-[10px] space-y-1 text-muted-foreground font-sans">
                  {topExposure && <p>• <strong className="text-slate-200">Top Exposure:</strong> {topExposure.companyName} ({topExposure.totalTruePercent.toFixed(1)}%)</p>}
                  <p>• <strong className="text-slate-200">Annual Wasted Fees:</strong> ₹{wastedFee.toLocaleString("en-IN")} / year</p>
                  <p>• <strong className="text-slate-200">Instruments Monitored:</strong> {holdings.length} holdings</p>
                </div>
              </div>

              <div className="flex justify-end items-center gap-1 text-[9px] text-muted-foreground font-mono">
                <span>04:16 PM</span>
              </div>
            </div>
          </div>

          {/* Quick reply interactive chips */}
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="px-3 py-1 rounded-xl bg-[var(--card)] border border-border text-foreground text-[10px] font-medium cursor-pointer hover:border-border-strong transition-colors">
              📄 Download PDF Audit
            </span>
            <span className="px-3 py-1 rounded-xl bg-[var(--card)] border border-border text-foreground text-[10px] font-medium cursor-pointer hover:border-border-strong transition-colors">
              ⚡ Fix Nominees (1-Click)
            </span>
            <span className="px-3 py-1 rounded-xl bg-[var(--card)] border border-border text-foreground text-[10px] font-medium cursor-pointer hover:border-border-strong transition-colors">
              🔄 Switch to Direct Plans
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
