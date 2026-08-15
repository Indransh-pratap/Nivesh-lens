"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronRight, CircleAlert, Landmark, ShieldCheck, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn, formatINR } from "@/lib/utils";

const metrics = [
  ["Total portfolio", "₹12,48,320", "Across stocks, mutual funds, FDs & EPF", "neutral"],
  ["Invested", "₹10,82,000", "Cost basis", "neutral"],
  ["Overall returns", "+₹1,66,320", "+15.37% since inception", "positive"],
  ["Today’s change", "+₹8,420", "+0.68% today", "positive"],
  ["Risk level", "Moderate", "Financial services exposure elevated", "warning"],
] as const;

const alerts = [
  { severity: "HIGH", title: "Reliance exposure is 26.4%", detail: "Direct holdings plus mutual-fund look-through create high single-company concentration.", impact: "₹3,29,560 exposed", action: "Review exposure", href: "/portfolio-xray", tone: "danger" },
  { severity: "MEDIUM", title: "3 mutual funds have significant overlap", detail: "Common underlying companies may be creating duplicate large-cap exposure.", impact: "₹48,200 duplicate exposure", action: "Analyze overlap", href: "/portfolio-xray", tone: "warning" },
  { severity: "LOW", title: "2 accounts have missing nominee details", detail: "Review account nominations to keep your records complete.", impact: "2 accounts pending", action: "Fix nominees", href: "/audit", tone: "info" },
] as const;

const companies = [
  ["Reliance Industries", 26.4, "bg-blue-400", "Direct + fund look-through"],
  ["HDFC Group", 18.7, "bg-sky-500", "Direct + fund look-through"],
  ["Tata Group", 15.3, "bg-indigo-400", "Fund look-through"],
  ["ICICI Group", 9.8, "bg-cyan-500", "Fund look-through"],
  ["Infosys", 5.2, "bg-slate-500", "Direct + fund look-through"],
] as const;

function MetricCard({ metric }: { metric: (typeof metrics)[number] }) {
  const [label, value, description, tone] = metric;
  return <Card className="rounded-lg border-border/80 shadow-none"><CardContent className="p-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    <p className={cn("mt-2 font-mono text-xl font-semibold tabular-nums", tone === "positive" && "text-success", tone === "warning" && "text-warning")}>{value}</p>
    <p className="mt-1 text-xs text-muted">{description}</p>
  </CardContent></Card>;
}

export default function DashboardPage() {
  return <div className="space-y-5 pb-8">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Portfolio overview <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px]">SAMPLE DATA</span></p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Good morning, Anubhav</h1>
        <p className="mt-1 text-sm text-muted">Your portfolio is moderately diversified, but has elevated exposure to Financial Services.</p>
      </div>
      <div className="flex gap-2"><Link href="/portfolio-xray"><Button size="sm">View full X-Ray <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Button></Link><Link href="/portfolio"><Button size="sm" variant="outline">View holdings</Button></Link></div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{metrics.map((metric) => <MetricCard key={metric[0]} metric={metric} />)}</section>

    <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <Card className="rounded-lg border-border/80 shadow-none"><CardContent className="p-5">
        <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Portfolio health</p><div className="mt-2 flex items-end gap-2"><span className="font-mono text-4xl font-semibold tabular-nums">742</span><span className="mb-1 text-sm text-muted">/ 900</span><span className="mb-1 rounded bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">Healthy</span></div></div><div className="grid h-24 w-24 place-items-center rounded-full border-[9px] border-primary border-r-success border-b-success"><span className="font-mono text-lg font-semibold">82%</span></div></div>
        <p className="mt-3 text-sm text-muted">2 issues need attention. Review your concentration and overlap before adding to existing positions.</p>
        <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">{[["Diversification",78],["Concentration",64],["Fund overlap",82],["Fee efficiency",71],["Risk exposure",69],["Tax efficiency",88]].map(([label, score]) => <div key={String(label)}><div className="flex justify-between text-xs"><span className="text-muted">{label}</span><span className="font-mono text-foreground">{score}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded bg-accent"><div className={cn("h-full rounded", Number(score) < 70 ? "bg-warning" : "bg-primary")} style={{ width: `${score}%` }} /></div></div>)}</div>
      </CardContent></Card>
      <Card className="rounded-lg border-border/80 shadow-none"><CardContent className="p-5"><div className="flex items-center gap-2"><Landmark className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Asset allocation</p></div><div className="mt-5 space-y-4">{[["Direct stocks",38.4,"bg-blue-400"],["Mutual funds",41.2,"bg-indigo-500"],["FDs",12.6,"bg-slate-500"],["EPF",7.8,"bg-cyan-500"]].map(([name, amount, color]) => <div key={String(name)}><div className="flex justify-between text-sm"><span>{name}</span><span className="font-mono tabular-nums text-muted">{amount}%</span></div><div className="mt-2 h-2 rounded bg-accent"><div className={cn("h-full rounded", String(color))} style={{width:`${amount}%`}} /></div></div>)}</div></CardContent></Card>
    </section>

    <section><div className="mb-3 flex items-center justify-between"><div><h2 className="text-base font-semibold">Attention required</h2><p className="mt-0.5 text-xs text-muted">Portfolio observations requiring a closer look.</p></div><Link href="/alerts" className="text-xs font-medium text-primary">View all alerts</Link></div><div className="grid gap-3 lg:grid-cols-3">{alerts.map((alert) => <Card key={alert.title} className="rounded-lg border-border/80 shadow-none"><CardContent className="p-4"><p className={cn("text-[10px] font-bold tracking-[0.14em]", alert.tone === "danger" ? "text-danger" : alert.tone === "warning" ? "text-warning" : "text-primary")}>{alert.severity}</p><h3 className="mt-2 text-sm font-semibold">{alert.title}</h3><p className="mt-2 min-h-10 text-xs leading-5 text-muted">{alert.detail}</p><div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3"><span className="font-mono text-xs tabular-nums text-foreground">{alert.impact}</span><Link href={alert.href} className="text-xs font-medium text-primary">{alert.action} <ChevronRight className="inline h-3 w-3" /></Link></div></CardContent></Card>)}</div></section>

    <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="rounded-lg border-border/80 shadow-none"><CardContent className="p-5"><div className="flex items-start justify-between"><div><h2 className="text-base font-semibold">Where your money is actually invested</h2><p className="mt-1 text-xs text-muted">Company-level exposure includes direct holdings and mutual fund look-through.</p></div><Link href="/exposure" className="text-xs font-medium text-primary">Exposure map</Link></div><div className="mt-5 space-y-4">{companies.map(([company, exposure, color, note]) => <div key={company}><div className="flex items-baseline justify-between"><div><span className="text-sm">{company}</span><span className="ml-2 text-[10px] text-muted">{note}</span></div><span className="font-mono text-sm tabular-nums">{exposure}%</span></div><div className="mt-2 h-2 rounded bg-accent"><div className={cn("h-full rounded", color)} style={{width:`${exposure * 3}%`}} /></div></div>)}</div></CardContent></Card>
      <div className="space-y-5"><Card className="rounded-lg border-border/80 shadow-none"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Concentration score</p><p className="mt-2 font-mono text-3xl tabular-nums">0.182</p></div><span className="rounded bg-warning/15 px-2 py-1 text-xs font-semibold text-warning">Moderate</span></div><div className="mt-4 h-2 rounded bg-gradient-to-r from-success via-warning to-danger" /><div className="mt-1 flex justify-between text-[10px] text-muted"><span>Diversified</span><span>Moderate</span><span>Concentrated</span></div><p className="mt-4 text-xs leading-5 text-muted">Your portfolio is diversified across investments, but a meaningful portion is indirectly concentrated in a few companies.</p></CardContent></Card>
      <Card className="rounded-lg border-border/80 shadow-none"><CardContent className="p-5"><div className="flex justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Wasted fees</p><p className="mt-2 font-mono text-2xl text-danger tabular-nums">₹18,420 <span className="text-sm text-muted">/ year</span></p></div><Wallet className="h-5 w-5 text-danger" /></div><p className="mt-2 text-xs text-muted">Potential duplicate TER cost across overlapping funds.</p><Link href="/portfolio-xray" className="mt-4 inline-block text-xs font-medium text-primary">Find fee savings <ChevronRight className="inline h-3 w-3" /></Link></CardContent></Card></div>
    </section>
    <p className="flex items-center gap-2 text-[11px] text-muted"><CircleAlert className="h-3.5 w-3.5" /> Sample portfolio data is for product demonstration only. Observations and simulations are not investment advice.</p>
  </div>;
}
