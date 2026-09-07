"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, Building2, Compass, CornerDownLeft } from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";

interface ResultItem {
  id: string;
  label: string;
  meta: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  href: string;
}

interface PageEntry {
  label: string;
  href: string;
  keywords?: string;
  section?: string;
}

const PAGE_INDEX: PageEntry[] = [
  { label: "Executive Terminal", href: "/dashboard", keywords: "overview net worth portfolio pnl summary live terminal", section: "Intelligence" },
  { label: "Portfolio X-Ray", href: "/portfolio-xray", keywords: "asset allocation overlap hhi health lookthrough", section: "Intelligence" },
  { label: "Direct Holdings & CAS", href: "/holdings", keywords: "equities mutual funds folios stocks units", section: "Intelligence" },
  { label: "True Company Exposure", href: "/exposure", keywords: "amfi lookthrough direct indirect company holdings", section: "Intelligence" },
  { label: "Parent Conglomerate & Group Exposure", href: "/exposure", keywords: "group exposure conglomerate alert adani tata reliance birla bajaj l&t hdfc mahindra", section: "Risk" },
  { label: "Risk & NAV Correlation Matrix", href: "/risk", keywords: "hhi concentration correlation matrix heatmap pairwise risk", section: "Risk" },
  { label: "Peer Baseline Benchmarking", href: "/risk", keywords: "benchmark peer baseline retail aggressive growth conservative hybrid hhi returns compare", section: "Risk" },
  { label: "Historical Crash Stress Tester", href: "/stress-tester", keywords: "crash test covid 2020 lehman 2008 gfc correction rate hike shock replay drawdown", section: "Risk" },
  { label: "Smart SIP Health & Auto-Switch", href: "/sip-health", keywords: "sip health grade auto switch ter expense ratio underperformance simulation folios", section: "Risk" },
  { label: "What-If Fund Swap Engine", href: "/simulator", keywords: "fund swap simulator what if switch replacement overlap reduction friction", section: "Strategy" },
  { label: "Simulation Studio", href: "/phase2", keywords: "simulation studio scenario lab stress test swap benchmark", section: "Strategy" },
  { label: "Tax-Aware Rebalancer", href: "/tax", keywords: "tax harvesting capital gains ltcg stcg loss offset", section: "Strategy" },
  { label: "Nominee Audit & SEBI Compliance", href: "/audit", keywords: "nomination audit compliance sebi 100% legal folios", section: "Governance" },
  { label: "Advisor PDF Reports", href: "/advisor", keywords: "pdf export report advisor download client presentation", section: "Governance" },
  { label: "Family Aggregator", href: "/family", keywords: "pan household members aggregate family wealth", section: "Governance" },
  { label: "Dividend Calendar", href: "/dividends", keywords: "dividends yield income cashflow schedule", section: "Governance" },
  { label: "System Alerts", href: "/alerts", keywords: "notifications alerts warnings rebalance threshold", section: "Governance" },
  { label: "API & Developer SDK", href: "/api-sdk", keywords: "api docs endpoints rest sdk openapi schema", section: "System" },
  { label: "Settings", href: "/settings", keywords: "preferences configuration profile dark mode security", section: "System" },
];

export function GlobalSearch() {
  const router = useRouter();
  const { holdings, companyExposures } = usePortfolioStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const results: ResultItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const holdingMatches: ResultItem[] = holdings
      .filter((h) => h.name.toLowerCase().includes(q) || h.ticker.toLowerCase().includes(q))
      .slice(0, 4)
      .map((h) => ({
        id: `holding-${h.id}`,
        label: h.name,
        meta: `${h.type} · ₹${h.currentValue.toLocaleString("en-IN")}`,
        icon: TrendingUp,
        href: "/holdings",
      }));

    const companyMatches: ResultItem[] = companyExposures
      .filter((c) => c.companyName.toLowerCase().includes(q))
      .slice(0, 4)
      .map((c) => ({
        id: `company-${c.id}`,
        label: c.companyName,
        meta: `True exposure ${c.totalTruePercent.toFixed(1)}% · direct + fund look-through`,
        icon: Building2,
        href: "/exposure",
      }));

    const pageMatches: ResultItem[] = PAGE_INDEX
      .filter((p) => p.label.toLowerCase().includes(q) || (p.keywords && p.keywords.toLowerCase().includes(q)))
      .slice(0, 5)
      .map((p) => ({
        id: `page-${p.href}-${p.label}`,
        label: p.label,
        meta: p.section ? `${p.section} · Jump to module` : "Go to module",
        icon: Compass,
        href: p.href,
      }));

    return [...companyMatches, ...holdingMatches, ...pageMatches].slice(0, 8);
  }, [query, holdings, companyExposures]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const go = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[activeIndex].href);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
        <input
          ref={inputRef}
          aria-label="Search portfolio"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search stocks, mutual funds, corporate houses..."
          className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-background pl-9 pr-12 text-[13px] outline-none focus:border-primary/50 transition-colors text-foreground placeholder:text-muted-foreground/70"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-accent px-1.5 py-0.5 rounded-[var(--radius-sm)] border border-border">
          ⌘K
        </span>
      </div>

      {open && query.trim().length > 0 && (
        <div className="absolute top-full mt-2 w-full rounded-[var(--radius-lg)] border border-border bg-card shadow-[0_8px_30px_rgba(0,0,0,0.4)] overflow-hidden z-50">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
              No matches for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1.5">
              {results.map((r, i) => {
                const Icon = r.icon;
                const isActive = i === activeIndex;
                return (
                  <li key={r.id}>
                    <button
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => go(r.href)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                        isActive ? "bg-accent" : ""
                      }`}
                    >
                      <Icon className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground truncate">{r.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{r.meta}</p>
                      </div>
                      {isActive && <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.75} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
