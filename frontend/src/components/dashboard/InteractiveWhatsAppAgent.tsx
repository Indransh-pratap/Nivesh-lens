"use client";

import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  CheckCheck,
  ArrowRight
} from "lucide-react";
import { cn, formatINRCompact } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { usePortfolioStore } from "@/store/portfolioStore";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  badges?: string[];
  metrics?: { label: string; value: string; color?: string }[];
}

const PROMPT_SUGGESTIONS = [
  "How much HDFC Bank do I hold directly and indirectly?",
  "What is my total portfolio value and health score?",
  "What happens if NIFTY drops 15%?",
  "Do I hold any duplicate mutual funds?",
  "Check my SEBI Nominee compliance status"
];

export function InteractiveWhatsAppAgent() {
  const { data: session } = authClient.useSession();
  const { holdings, companyExposures } = usePortfolioStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Initialize messages dynamically based on live authenticated user & real portfolio
  useEffect(() => {
    const userName = session?.user?.name ? session.user.name.split(" ")[0] : "Investor";
    const totalVal = holdings.reduce((sum, h) => sum + (Number(h.currentValue) || 0), 0);
    const topExp = companyExposures && companyExposures.length > 0 ? companyExposures[0] : null;

    if (holdings.length > 0) {
      const msgs: ChatMessage[] = [
        {
          id: "msg_init_1",
          sender: "bot",
          text: `Namaste ${userName}! 👋 I'm your Nivesh Lens AI Diagnostic Assistant. I've analyzed your live portfolio of ${holdings.length} assets valued at ${formatINRCompact(totalVal)}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];

      if (topExp && topExp.totalTruePercent > 0) {
        msgs.push({
          id: "msg_init_2",
          sender: "bot",
          text: `⚠️ Top Concentration: Your true exposure to ${topExp.companyName} is ${formatINRCompact(topExp.totalTrueValue)} (${topExp.totalTruePercent.toFixed(1)}% of your net worth) across direct and mutual fund holdings.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          metrics: [
            { label: "Direct Stock", value: `${topExp.directPercent.toFixed(1)}%` },
            { label: "Inside Funds", value: `${topExp.indirectPercent.toFixed(1)}%` },
            { label: "Total Concentration", value: `${topExp.totalTruePercent.toFixed(1)}%`, color: "text-[var(--negative)]" }
          ]
        });
      }

      setMessages(msgs);
    } else {
      setMessages([
        {
          id: "msg_init_empty",
          sender: "bot",
          text: `Namaste ${userName}! 👋 I'm your Nivesh Lens AI Assistant. Upload your CAS statement or ask me any question regarding your investment analytics, look-through exposure, or SEBI compliance.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [session?.user?.name, holdings.length, companyExposures]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      // 1. Resolve active portfolio ID from localStorage or live API
      let activePortfolioId = typeof window !== "undefined"
        ? localStorage.getItem("nivesh_active_portfolio_id")
        : null;

      if (!activePortfolioId) {
        const portfoliosRes = await fetch("/api/portfolio/portfolios", { cache: "no-store" });
        if (portfoliosRes.ok) {
          const portfolios = await portfoliosRes.json();
          if (Array.isArray(portfolios) && portfolios.length > 0) {
            const active = portfolios.find((p: any) => p.holdings_count > 0 || p.total_value > 0) || portfolios[0];
            activePortfolioId = active.id;
            if (typeof window !== "undefined") {
              localStorage.setItem("nivesh_active_portfolio_id", active.id);
            }
          }
        }
      }

      if (!activePortfolioId) {
        throw new Error("No portfolio connected yet. Please upload your CAS statement or connect a broker.");
      }

      // 2. Call the live Ask My Portfolio AI endpoint
      const chatRes = await fetch(`/api/portfolio/portfolios/${activePortfolioId}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      if (chatRes.ok) {
        const chatData = await chatRes.json();
        const metrics = chatData.supporting_facts?.slice(0, 3).map((fact: string, idx: number) => ({
          label: idx === 0 ? "Fact 1" : idx === 1 ? "Fact 2" : "Fact 3",
          value: fact.length > 50 ? fact.slice(0, 47) + "..." : fact,
          color: "text-foreground",
        }));

        const botResponse: ChatMessage = {
          id: `bot_${Date.now()}`,
          sender: "bot",
          text: chatData.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          metrics: metrics && metrics.length > 0 ? metrics : undefined,
        };

        setMessages(prev => [...prev, botResponse]);
        setIsTyping(false);
        return;
      } else {
        const errData = await chatRes.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error?.message || "AI service returned an unexpected response.");
      }
    } catch (e: any) {
      console.error("AI chat error:", e);
      const errorResponse: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: "bot",
        text: `⚠️ ${e?.message || "Unable to query portfolio analytics. Please verify your connection."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorResponse]);
      setIsTyping(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-5 text-foreground relative overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">Portfolio Diagnostic Assistant</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs text-muted-foreground font-mono">Live Gemini AI grounded in verified AMFI & SEBI deterministic analytics</p>
          </div>
        </div>

        <span className="text-[11px] font-mono px-2.5 py-1 rounded-xl bg-accent/40 border border-border text-muted-foreground hidden sm:inline">
          Deterministic Tools Active
        </span>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {PROMPT_SUGGESTIONS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSend(prompt)}
            className="px-3 py-1.5 rounded-xl bg-accent/40 hover:bg-accent border border-border hover:border-primary/50 text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer whitespace-nowrap active:scale-95 flex items-center gap-1.5"
          >
            <ArrowRight className="w-3 h-3 text-primary" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Message Chat Container */}
      <div className="h-[300px] overflow-y-auto space-y-3.5 p-4 rounded-xl bg-background border border-border no-scrollbar">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex flex-col max-w-[85%] rounded-2xl p-3.5 text-xs space-y-2 animate-fade-in-up",
              m.sender === "user"
                ? "ml-auto bg-primary text-primary-foreground font-medium rounded-br-none shadow-sm"
                : "mr-auto bg-card border border-border text-foreground rounded-bl-none"
            )}
          >
            <p className="leading-relaxed text-[12.5px] whitespace-pre-wrap">{m.text}</p>

            {m.metrics && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border font-mono text-[11px]">
                {m.metrics.map((met, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-accent/40 border border-border">
                    <span className="text-muted-foreground block text-[9.5px] font-sans">{met.label}</span>
                    <span className={cn("font-bold text-xs break-words", met.color || "text-foreground")}>{met.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className={cn(
              "flex items-center justify-end gap-1 text-[9.5px] font-mono",
              m.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              <span>{m.timestamp}</span>
              {m.sender === "user" && <CheckCheck className="w-3 h-3" />}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="mr-auto bg-card border border-border p-3 rounded-2xl rounded-bl-none flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
            <span className="text-[11px] font-mono ml-1">Consulting portfolio engines & Gemini 3.5...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask anything about your stocks, mutual funds, true overlap, or stress test..."
          className="flex-1 h-11 px-4 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary outline-none transition-colors"
        />
        <button
          onClick={() => handleSend()}
          disabled={isTyping}
          aria-label="Send message"
          className="h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      </div>

    </div>
  );
}
