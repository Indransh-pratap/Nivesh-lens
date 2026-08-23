"use client";

import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  ShieldCheck, 
  CheckCheck,
  TrendingDown,
  Coins,
  Layers,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  badges?: string[];
  metrics?: { label: string; value: string; color?: string }[];
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg_1",
    sender: "bot",
    text: "Namaste Anubhav! 👋 I'm your Nivesh Lens AI Diagnostic Assistant. I've reconciled your 8 mutual fund folios and 6 direct equities.",
    timestamp: "10:42 AM"
  },
  {
    id: "msg_2",
    sender: "bot",
    text: "⚠️ Top Flag: Your true exposure to HDFC Bank is ₹5,52,354 (15.87% of your net worth) because you hold it both directly and inside 4 of your mutual funds.",
    timestamp: "10:42 AM",
    metrics: [
      { label: "Direct Stock", value: "₹3.54L (10.18%)" },
      { label: "Inside Funds", value: "₹1.98L (5.69%)" },
      { label: "Total Tied", value: "₹5.52L (15.87%)", color: "text-[var(--negative)]" }
    ]
  }
];

const PROMPT_SUGGESTIONS = [
  "How much am I losing in Regular plan fees?",
  "What happens if NIFTY 50 drops 15%?",
  "Check my SEBI Nominee compliance status",
  "Which 3 stocks are in my top overlap?"
];

export function InteractiveWhatsAppAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (textToSend?: string) => {
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

    // Simulate smart AI response
    setTimeout(() => {
      let botResponse: ChatMessage;

      if (text.toLowerCase().includes("fee") || text.toLowerCase().includes("regular")) {
        botResponse = {
          id: `bot_${Date.now()}`,
          sender: "bot",
          text: "💡 You hold 3 Regular plan mutual funds paying ~1.25% in distributor commissions. Switching them to Direct plans saves ₹16,600/year, compounding to ₹4,35,200 extra wealth over 10 years!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          metrics: [
            { label: "Annual Bleed", value: "₹24,800/yr", color: "text-[var(--negative)]" },
            { label: "10Y Compounded", value: "+₹4.35 Lakhs", color: "text-[var(--positive)]" }
          ]
        };
      } else if (text.toLowerCase().includes("drop") || text.toLowerCase().includes("crash") || text.toLowerCase().includes("15%")) {
        botResponse = {
          id: `bot_${Date.now()}`,
          sender: "bot",
          text: "📉 In a 15% broad market correction, your portfolio is projected to drawdown by ~12.8% (₹4.45 Lakhs). Your 13.8% liquid debt and corporate bonds provide strong shock absorption.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          metrics: [
            { label: "Drawdown", value: "-₹4.45L (-12.8%)", color: "text-[var(--negative)]" },
            { label: "Bond Buffer", value: "₹4.80L Safe", color: "text-[var(--positive)]" }
          ]
        };
      } else if (text.toLowerCase().includes("nominee")) {
        botResponse = {
          id: `bot_${Date.now()}`,
          sender: "bot",
          text: "🛡️ 6 out of 8 folios have verified nominees. 2 folios (HDFC Flexi Cap and Mirae Asset Large Cap) are missing updated nominee details as required by recent SEBI circulars.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      } else {
        botResponse = {
          id: `bot_${Date.now()}`,
          sender: "bot",
          text: `📊 Analyzed! Your overall Diagnostic Health Score is 748/900 (Healthy - Top 16% Retail). Your portfolio has 88% asset diversity, with moderate banking concentration.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          metrics: [
            { label: "Health Score", value: "748 / 900", color: "text-[var(--positive)]" },
            { label: "Retail Rank", value: "Top 16%" }
          ]
        };
      }

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1100);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-5 text-foreground relative overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">Nivesh Lens AI Diagnostic Assistant</h3>
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>
            <p className="text-xs text-muted-foreground font-mono">Real-time WhatsApp & Telegram wealth advisor</p>
          </div>
        </div>

        <span className="text-[11px] font-mono px-2.5 py-1 rounded-xl bg-accent/40 border border-border text-muted-foreground hidden sm:inline">
          AMFI + SEBI Connected
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
            <Sparkles className="w-3 h-3 text-primary" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Message Chat Container */}
      <div className="h-[280px] overflow-y-auto space-y-3.5 p-4 rounded-xl bg-background border border-border no-scrollbar">
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
            <p className="leading-relaxed text-[12.5px]">{m.text}</p>

            {m.metrics && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-border font-mono text-[11px]">
                {m.metrics.map((met) => (
                  <div key={met.label} className="p-2 rounded-lg bg-accent/40 border border-border">
                    <span className="text-muted-foreground block text-[9.5px] font-sans">{met.label}</span>
                    <span className={cn("font-bold text-xs", met.color || "text-foreground")}>{met.value}</span>
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
            <span className="text-[11px] font-mono ml-1">Analyzing portfolio look-through...</span>
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
          placeholder="Ask anything about your stocks, funds, overlap, or tax harvesting..."
          className="flex-1 h-11 px-4 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary outline-none transition-colors"
        />
        <button
          onClick={() => handleSend()}
          aria-label="Send message"
          className="h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      </div>

    </div>
  );
}
