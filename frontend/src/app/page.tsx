"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  ScanSearch,
  ShieldAlert,
  Coins,
  Activity,
  Building2,
  Smartphone,
  FileText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Zap,
  Layers,
  ChevronRight,
  BarChart3,
  CheckCircle2,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SyncModal } from "@/components/dashboard/SyncModal";
import { usePortfolioStore } from "@/store/portfolioStore";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/ui/CountUp";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

const CORE_FEATURES = [
  {
    title: "AMFI Stock Look-Through",
    desc: "We open every mutual fund scheme you hold and read its underlying stocks, uncovering what you actually own beyond the fund label.",
    icon: ScanSearch,
    badge: "SEBI Mandated"
  },
  {
    title: "True Concentration Score",
    desc: "Direct equities and indirect fund holdings are rolled into one exact weight using regulatory HHI concentration analytics.",
    icon: Activity,
    badge: "Risk Meter"
  },
  {
    title: "Duplicate Fee & Commission Bleed",
    desc: "Flags Regular-plan commissions and overlapping expense ratios quietly compounding against your 10-year wealth.",
    icon: Coins,
    badge: "Save ₹4.35L"
  },
  {
    title: "Conglomerate Exposure Rollup",
    desc: "Aggregates holdings into parent business groups — Tata, Reliance, HDFC, Adani — so systemic risk doesn't hide across five tickers.",
    icon: Building2,
    badge: "Group Risk"
  },
  {
    title: "Crash & Drawdown Stress-Tester",
    desc: "Replays your current holdings against 2020 Covid (-38%), 2008 GFC, and 2022 rate hike scenarios in real-time.",
    icon: TrendingDown,
    badge: "Simulation"
  },
  {
    title: "Nominee & Compliance Audit",
    desc: "Flags demat folios and fixed deposits with missing or outdated digital nominee allocation under latest SEBI circulars.",
    icon: ShieldAlert,
    badge: "Compliance"
  },
];

const STEPS = [
  {
    step: "01",
    title: "1-OTP Instant Sync",
    desc: "Link your holdings securely through the RBI Account Aggregator framework with a single mobile OTP, or upload a CAS statement.",
    icon: Smartphone,
  },
  {
    step: "02",
    title: "AMFI Deep Reconciliation",
    desc: "Nivesh Lens scans every underlying equity disclosed by your fund houses and combines it with your direct broker holdings.",
    icon: FileText,
  },
  {
    step: "03",
    title: "Actionable Wealth Diagnostics",
    desc: "Get an institutional diagnostic score, fee bleed calculation, and one-click rebalance suggestions.",
    icon: RefreshCw,
  },
];

const STATS = [
  { label: "Portfolios Diagnosed", value: 12480, suffix: "+", icon: BarChart3 },
  { label: "AUM Analyzed", value: 940, prefix: "₹", suffix: " Cr+", icon: Coins },
  { label: "Avg. Fee Bleed Found / User", value: 18400, prefix: "₹", icon: TrendingDown },
  { label: "Concentration Alerts Flagged", value: 3260, suffix: "+", icon: ShieldAlert },
];

const FAQS = [
  {
    q: "Is my data safe? Do you get access to place trades?",
    a: "No. Nivesh Lens connects through the RBI Account Aggregator framework or a CAS statement upload — both are strictly read-only. We can never place a trade, move funds, or make any change to your holdings on your behalf.",
  },
  {
    q: "How is this different from what my broker app already shows?",
    a: "Broker apps show you fund-level holdings only. Nivesh Lens opens every mutual fund scheme and reads its underlying stocks, then combines that with your direct equity to show your true, combined exposure to any single company — something no broker dashboard calculates today.",
  },
  {
    q: "Do you take commissions from mutual funds or brokers?",
    a: "No. Nivesh Lens has zero broker or AMC affiliation. Our diagnostics are built to flag Regular-plan commissions and duplicate fees that work against you — the opposite incentive of a platform that earns from those fees.",
  },
  {
    q: "How long does the first diagnostic take?",
    a: "About two minutes. Connect via a single mobile OTP through the Account Aggregator flow, or upload your CAS statement — either way, your full look-through diagnostic is ready almost instantly.",
  },
];

export default function LandingPage() {
  const { openSyncModal } = usePortfolioStore();
  const [activePreviewTab, setActivePreviewTab] = useState<"exposure" | "fee" | "crash">("exposure");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <SyncModal />

      {/* Top Live Ticker Ribbon */}
      <div className="bg-[var(--background-elevated)] border-b border-border/80 text-[11px] py-1.5 px-4 font-mono select-none">
        <div className="max-w-6xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-6">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[var(--positive)] animate-pulse" />
            <span className="font-sans font-bold text-foreground">NSE / BSE LIVE</span>
          </div>

          <div className="flex items-center gap-5 shrink-0 text-muted-foreground">
            <span>NIFTY 50: <strong className="text-foreground">24,852.15</strong> <span className="text-[var(--positive)] font-bold">+0.45%</span></span>
            <span>SENSEX: <strong className="text-foreground">81,385.60</strong> <span className="text-[var(--positive)] font-bold">+0.52%</span></span>
            <span>BANK NIFTY: <strong className="text-foreground">53,210.80</strong> <span className="text-[var(--negative)] font-bold">-0.15%</span></span>
            <span>INDIA VIX: <strong className="text-foreground">13.15</strong> <span className="text-[var(--positive)] font-bold">-2.59%</span></span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-primary shrink-0 font-sans font-semibold text-[10.5px]">
            <Sparkles className="w-3 h-3" />
            <span>AMFI Daily NAV Feed Synchronized</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className={cn(
        "sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md transition-shadow duration-300",
        isScrolled ? "border-border shadow-sm shadow-black/5" : "border-transparent"
      )}>
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-sm">
              NL
            </div>
            <div>
              <span className="font-display text-[16.5px] font-bold tracking-tight text-foreground block leading-tight">
                Nivesh Lens
              </span>
              <span className="text-[9.5px] text-muted-foreground block font-mono tracking-wider -mt-0.5">
                WEALTHTECH DIAGNOSTICS
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-9 text-[13px] text-muted-foreground font-medium">
            <a href="#features" className="hover:text-foreground transition-colors">Diagnostics</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#advisors" className="hover:text-foreground transition-colors">For IFAs & Advisors</a>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => openSyncModal("OTP")}
              className="hidden sm:inline-flex h-9 px-4 rounded-xl text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              Connect Portfolio
            </button>
            <Link href="/dashboard">
              <Button size="sm" className="gap-1.5 font-semibold">
                <span className="hidden sm:inline">Launch Terminal</span>
                <span className="sm:hidden">Launch</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </Button>
            </Link>
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileNavOpen}
              className="md:hidden p-2 -mr-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              {mobileNavOpen ? <X className="w-5 h-5" strokeWidth={1.75} /> : <Menu className="w-5 h-5" strokeWidth={1.75} />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer — the desktop links + Connect Portfolio are
            hidden below md, so this is the only way to reach them on phones. */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-border bg-background px-6 py-4 space-y-1 animate-fade-in-up motion-reduce:animate-none">
            <a href="#features" onClick={() => setMobileNavOpen(false)} className="block px-2 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Diagnostics</a>
            <a href="#how-it-works" onClick={() => setMobileNavOpen(false)} className="block px-2 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">How It Works</a>
            <a href="#advisors" onClick={() => setMobileNavOpen(false)} className="block px-2 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">For IFAs & Advisors</a>
            <button
              onClick={() => { setMobileNavOpen(false); openSyncModal("OTP"); }}
              className="w-full text-left px-2 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              Connect Portfolio
            </button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative brand-vignette overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-20 lg:pt-28 lg:pb-28 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" className="px-3 py-1 text-xs font-bold">
                AMFI Look-Through · RBI Account Aggregator
              </Badge>
              <span className="text-xs text-[var(--positive)] font-semibold flex items-center gap-1 font-mono">
                <Zap className="w-3 h-3" /> Live Mutual Fund Recon
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-[52px] font-bold tracking-tight leading-[1.1] text-foreground">
              Know exactly what your money is exposed to.
            </h1>

            <p className="text-[15px] sm:text-base leading-relaxed text-muted-foreground max-w-lg">
              Your mutual funds hide direct-stock-sized bets inside them. Nivesh Lens reconciles what you hold directly with what's hidden inside every fund, giving you one institutional diagnostic score — not another basic chart dashboard.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/dashboard">
                <Button size="lg" className="gap-2 shadow-sm shadow-black/10 font-bold">
                  <span>Open Wealth Terminal</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </Button>
              </Link>
              <button
                onClick={() => openSyncModal("OTP")}
                className="h-12 px-5 rounded-xl border border-border bg-[var(--card)] hover:bg-accent text-[13px] font-bold text-foreground flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Smartphone className="w-4 h-4 text-primary" strokeWidth={2} />
                <span>Connect via 1-OTP</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5 text-foreground">
                <ShieldCheck className="w-4 h-4 text-primary" strokeWidth={2} /> RBI AA Compliant
              </span>
              <span className="flex items-center gap-1.5 text-foreground">
                <ScanSearch className="w-4 h-4 text-primary" strokeWidth={2} /> Read-Only Encryption
              </span>
              <span className="flex items-center gap-1.5 text-foreground">
                <Sparkles className="w-4 h-4 text-primary" strokeWidth={2} /> Zero Trade Execution Risk
              </span>
            </div>
          </div>

          {/* Interactive Live Preview Card */}
          <div className="rounded-3xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/20 space-y-5 relative">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--positive)] animate-pulse" />
                <span className="text-sm font-bold text-foreground">Diagnostic Live Terminal</span>
              </div>
              <span className="text-xs font-mono font-bold text-[var(--positive)] bg-[var(--positive-soft)] border border-[var(--positive)]/30 px-2.5 py-1 rounded-lg tabular-nums">
                748 / 900 HEALTHY
              </span>
            </div>

            {/* Quick Preview Tabs */}
            <div className="flex items-center gap-1 bg-[var(--background-elevated)] p-1 rounded-xl border border-border text-xs">
              <button
                onClick={() => setActivePreviewTab("exposure")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                  activePreviewTab === "exposure" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                True Exposure
              </button>
              <button
                onClick={() => setActivePreviewTab("fee")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                  activePreviewTab === "fee" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Fee Bleed
              </button>
              <button
                onClick={() => setActivePreviewTab("crash")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                  activePreviewTab === "crash" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Crash Sim
              </button>
            </div>

            {activePreviewTab === "exposure" && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-[var(--background-elevated)] border border-border">
                    <span className="text-[11px] text-muted-foreground block">Portfolio Value</span>
                    <span className="text-xl font-bold font-mono text-foreground mt-1 block tabular-nums">
                      <CountUp value={3480000} prefix="₹" duration={1100} />
                    </span>
                    <span className="text-[11px] font-mono text-[var(--positive)] tabular-nums">+17.72% · 1Y Return</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--background-elevated)] border border-border">
                    <span className="text-[11px] text-muted-foreground block">Top Single Weight</span>
                    <span className="text-xl font-bold font-mono text-[var(--negative)] mt-1 block tabular-nums">
                      <CountUp value={15.87} decimals={2} suffix="%" duration={1100} />
                    </span>
                    <span className="text-[11px] text-muted-foreground">HDFC Bank Direct + MFs</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[var(--negative)]/25 bg-[var(--negative-soft)] space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold text-[var(--negative)]">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" /> Concentration Alert
                    </span>
                    <span className="font-mono">₹5.52L in 1 Company</span>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    HDFC Bank: ₹3.54L direct equity + ₹1.98L held inside 4 mutual funds.
                  </p>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  {[
                    { name: "HDFC Bank", pct: 15.87, color: "bg-[var(--negative)]" },
                    { name: "Reliance Industries", pct: 14.64, color: "bg-[var(--warning)]" },
                    { name: "Tata Group Rollup", pct: 9.60, color: "bg-primary" },
                  ].map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-sans font-medium text-foreground">{item.name}</span>
                        <span className="text-muted-foreground tabular-nums">{item.pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[var(--background-elevated)] rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct * 5}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activePreviewTab === "fee" && (
              <div className="space-y-4 animate-fade-in-up font-mono text-xs">
                <div className="p-4 rounded-xl bg-[var(--background-elevated)] border border-border space-y-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span className="font-sans">Distributor Commission</span>
                    <span className="text-foreground font-bold">₹16,600 / yr</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span className="font-sans">Duplicate Scheme Overlap</span>
                    <span className="text-foreground font-bold">₹8,200 / yr</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-sans font-bold text-foreground">Total Annual Bleed</span>
                    <span className="font-bold text-[var(--negative)]">₹24,800 / yr</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--positive-soft)] border border-[var(--positive)]/30 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--positive)] shrink-0" />
                  <span className="text-foreground font-sans text-xs">
                    Switching to Direct Plans adds <strong className="font-mono text-foreground">₹4.35L</strong> to your 10-year compounding portfolio.
                  </span>
                </div>
              </div>
            )}

            {activePreviewTab === "crash" && (
              <div className="space-y-4 animate-fade-in-up font-mono text-xs">
                <div className="p-4 rounded-xl bg-[var(--background-elevated)] border border-border space-y-2">
                  <div className="flex justify-between">
                    <span className="font-sans text-muted-foreground">2020 Covid Crash (-38%)</span>
                    <span className="text-[var(--negative)] font-bold">-₹11.24L (-32.3%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-muted-foreground">2008 Subprime GFC (-52%)</span>
                    <span className="text-[var(--negative)] font-bold">-₹15.80L (-45.4%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-muted-foreground">2022 Tech Selloff (-25%)</span>
                    <span className="text-[var(--warning)] font-bold">-₹6.15L (-17.6%)</span>
                  </div>
                </div>

                <div className="text-[11px] font-sans text-muted-foreground text-center">
                  Protected by 13.8% liquid debt & corporate bond buffer.
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Free 2-minute diagnostic</span>
              <Link href="/dashboard" className="text-primary font-bold hover:underline flex items-center gap-1">
                <span>View Full Analysis</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust / Stats Band */}
      <section className="border-t border-border bg-[var(--background-elevated)] py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {STATS.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <RevealOnScroll key={stat.label} delay={i * 100}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-bold font-mono text-foreground tabular-nums">
                        <CountUp value={stat.value} prefix={stat.prefix} suffix={stat.suffix} duration={1400} />
                      </div>
                      <div className="text-[11.5px] text-muted-foreground font-medium leading-snug mt-0.5">{stat.label}</div>
                    </div>
                  </div>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="border-t border-border py-20 bg-[var(--background-elevated)]">
        <div className="mx-auto max-w-6xl px-6">
          <RevealOnScroll>
            <div className="max-w-xl mb-12 space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">INSTITUTIONAL DIAGNOSTICS</span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Six analytics your broker app never reveals
              </h2>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Engineered for seasoned retail investors, family offices, and IFAs who manage real wealth across multiple funds and stocks.
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CORE_FEATURES.map((item, i) => {
              const Icon = item.icon;
              return (
                <RevealOnScroll key={item.title} delay={(i % 3) * 90}>
                  <div
                    className="h-full p-6 rounded-2xl border border-border bg-[var(--card)] hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 space-y-3 shadow-sm hover:shadow-lg hover:shadow-black/5 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <Badge variant="primary">{item.badge}</Badge>
                    </div>

                    <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="border-t border-border py-20">
        <div className="mx-auto max-w-6xl px-6">
          <RevealOnScroll>
            <div className="max-w-xl mb-12 space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">SEAMLESS INTEGRATION</span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Three steps, zero manual spreadsheet entry
              </h2>
            </div>
          </RevealOnScroll>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <RevealOnScroll key={s.step} delay={i * 120}>
                  <div className="h-full p-6 rounded-2xl border border-border bg-[var(--card)] space-y-4 hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
                        <Icon className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <span className="text-2xl font-bold font-mono text-muted-foreground/40">{s.step}</span>
                    </div>
                    <h3 className="text-base font-bold text-foreground">{s.title}</h3>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border py-20 bg-[var(--background-elevated)]">
        <div className="mx-auto max-w-3xl px-6">
          <RevealOnScroll>
            <div className="text-center mb-10 space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">COMMON QUESTIONS</span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Frequently asked questions
              </h2>
            </div>
          </RevealOnScroll>

          <div className="space-y-3">
            {FAQS.map((faq, i) => {
              const isOpen = openFaqIndex === i;
              return (
                <RevealOnScroll key={faq.q} delay={i * 60}>
                  <div className={cn("rounded-2xl border bg-[var(--card)] overflow-hidden transition-colors", isOpen ? "border-primary/30" : "border-border")}>
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-4 p-5 text-left cursor-pointer"
                    >
                      <span className="text-sm font-bold text-foreground">{faq.q}</span>
                      <ChevronRight className={cn("w-4 h-4 shrink-0 text-primary transition-transform", isOpen && "rotate-90")} strokeWidth={2.5} />
                    </button>
                    <div className={cn("grid transition-all duration-300 ease-out motion-reduce:transition-none", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                      <div className="overflow-hidden">
                        <p className="px-5 pb-5 text-[13.5px] text-muted-foreground leading-relaxed">{faq.a}</p>
                      </div>
                    </div>
                  </div>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-20 brand-vignette">
        <RevealOnScroll>
          <div className="mx-auto max-w-3xl px-6 text-center space-y-6">
            <Badge variant="primary" className="px-3 py-1 text-xs font-bold">
              Zero Broker Affiliation · 100% Objective
            </Badge>

            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Run the diagnostic on your own wealth portfolio
            </h2>
            <p className="text-[14px] text-muted-foreground max-w-md mx-auto leading-relaxed">
              Takes two minutes with 1-OTP. Discover hidden double-dipping, duplicate fees, and your true SEBI concentration rating today.
            </p>

            <div className="pt-2">
              <Link href="/dashboard">
                <Button size="lg" className="gap-2 shadow-md shadow-black/20 font-bold px-8">
                  <span>Launch Diagnostic Dashboard</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </Button>
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      <footer className="border-t border-border bg-[var(--background-elevated)]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
            <div className="lg:col-span-2 space-y-3">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-xs">
                  NL
                </div>
                <span className="font-display text-[15px] font-bold tracking-tight text-foreground">Nivesh Lens</span>
              </Link>
              <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xs">
                Institutional-grade portfolio diagnostics for Indian investors — built on AMFI look-through data and the RBI Account Aggregator framework.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">Product</p>
              <div className="flex flex-col gap-2.5 text-[13px] text-muted-foreground">
                <a href="#features" className="hover:text-foreground transition-colors w-fit">Diagnostics</a>
                <a href="#how-it-works" className="hover:text-foreground transition-colors w-fit">How It Works</a>
                <Link href="/dashboard" className="hover:text-foreground transition-colors w-fit">Launch Terminal</Link>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">Company</p>
              <div className="flex flex-col gap-2.5 text-[13px] text-muted-foreground">
                <a href="#advisors" className="hover:text-foreground transition-colors w-fit">For IFAs & Advisors</a>
                <span className="w-fit">About</span>
                <span className="w-fit">Contact</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">Legal</p>
              <div className="flex flex-col gap-2.5 text-[13px] text-muted-foreground">
                <span className="w-fit">Privacy Policy</span>
                <span className="w-fit">Terms of Service</span>
                <span className="w-fit">SEBI & AMFI Disclosures</span>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Nivesh Lens Technologies Pvt. Ltd.</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
              AMFI & RBI Account Aggregator Compliant Wealth Diagnostics
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
