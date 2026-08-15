"use client";

import { FormEvent, useEffect, useState } from "react";

import { createPortfolio, getPortfolios, type Portfolio } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

export function PortfolioDashboard() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { getPortfolios().then(setPortfolios).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load portfolios")).finally(() => setLoading(false)); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) { setError("Please enter a portfolio name."); return; }
    setSaving(true); setError(""); setSuccess("");
    try { const portfolio = await createPortfolio(trimmedName); setPortfolios((current) => [portfolio, ...current]); setName(""); setSuccess("Portfolio created successfully."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create portfolio"); }
    finally { setSaving(false); }
  }

  if (loading) return <p className="text-sm text-muted">Loading portfolio…</p>;
  const portfolio = portfolios[0];
  return <div className="mx-auto max-w-2xl space-y-5 py-6">
    {error && <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
    {success && <p role="status" className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-500">{success}</p>}
    {!portfolio ? <Card><CardContent className="p-6"><h1 className="text-2xl font-semibold">Welcome</h1><p className="mt-2 text-sm text-muted">You don&apos;t have a portfolio yet.</p><form className="mt-5 flex max-w-md gap-2" onSubmit={submit}><input aria-label="Portfolio name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="My Portfolio" className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm" disabled={saving} /><Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create Portfolio"}</Button></form></CardContent></Card> : <Card><CardContent className="p-6"><h1 className="text-2xl font-semibold">{portfolio.name}</h1><div className="mt-6 grid gap-4 sm:grid-cols-3"><div><p className="text-xs uppercase text-muted">Total Value</p><p className="mt-1 text-2xl font-semibold">₹0</p></div><div><p className="text-xs uppercase text-muted">Holdings</p><p className="mt-1 text-2xl font-semibold">0</p></div><div><p className="text-xs uppercase text-muted">Transactions</p><p className="mt-1 text-2xl font-semibold">0</p></div></div><Button className="mt-6" disabled>Import CAS <span className="ml-1 text-xs">Coming soon</span></Button></CardContent></Card>}
  </div>;
}
