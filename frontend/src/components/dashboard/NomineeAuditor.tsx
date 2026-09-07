"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { Button } from "@/components/ui/Button";
import { InsightFlag } from "@/components/ui/InsightFlag";
import { EmptyState } from "@/components/ui/EmptyState";
import { DiagnosticsResponse } from "@/types";

type RelationshipType = "Spouse" | "Child" | "Parent" | "Sibling";

export function NomineeAuditor() {
  const { nominees, updateNominee, openSyncModal } = usePortfolioStore();
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResponse | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempNomineeName, setTempNomineeName] = useState("");
  const [tempRelation, setTempRelation] = useState<RelationshipType>("Spouse");
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDiagnostics = async () => {
      const activeId = typeof window !== "undefined" ? localStorage.getItem("nivesh_active_portfolio_id") : null;
      if (!activeId) return;
      try {
        const res = await fetch(`/api/portfolio/portfolios/${activeId}/diagnostics`);
        if (res.ok) {
          const data = await res.json();
          setDiagnostics(data);
        }
      } catch (err) {
        console.error("Failed to fetch diagnostics for nominee auditor:", err);
      }
    };

    fetchDiagnostics();
    const handleUpdate = () => { fetchDiagnostics(); };
    window.addEventListener("nivesh_portfolio_updated", handleUpdate);
    return () => window.removeEventListener("nivesh_portfolio_updated", handleUpdate);
  }, []);

  const audit = diagnostics?.nominee_audit;
  const missingCount = audit ? audit.accounts_missing : nominees.filter(n => n.status === "Action Required").length;
  const unknownCount = audit ? audit.accounts_unknown : 0;

  const handleFix = (id: string) => {
    updateNominee(id, {
      nomineeName: tempNomineeName || "Registered Nominee",
      relationship: tempRelation,
      allocation: 100,
      status: "Verified",
      verificationMethod: "DigiLocker e-Sign",
      lastUpdated: "Updated"
    });
    setEditingId(null);
  };

  const displayAccounts = audit && audit.accounts.length > 0
    ? audit.accounts.map((acc, idx) => ({
        id: acc.account_id || `audit_${idx}`,
        accountName: acc.account_name,
        folioNumber: acc.masked_account_number,
        accountType: acc.account_type,
        nomineeName: acc.nominee_name || (acc.nominee_status === "CONFIRMED" ? "Registered" : acc.nominee_status === "MISSING" ? "Unassigned" : "Undisclosed"),
        relationship: acc.relationship || (acc.nominee_status === "CONFIRMED" ? "Registered" : "—"),
        allocation: 100,
        status: acc.nominee_status === "CONFIRMED" ? "Verified" : acc.nominee_status === "MISSING" ? "Action Required" : "Information Pending",
        lastUpdated: "CAS Audit",
      }))
    : nominees;

  if (displayAccounts.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No accounts found for nominee audit"
        description="Upload your CAS statement or connect your account to scan Demat folios, mutual funds, and bank accounts for SEBI nominee compliance."
        actionLabel="Connect Portfolio"
        onAction={() => openSyncModal("CAS")}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Nominee & Unclaimed Wealth Audit</h3>
            <p className="text-xs text-muted-foreground">Legal compliance audit across Demat accounts, Mutual Funds, Bank FDs & EPF</p>
          </div>
        </div>

        {missingCount > 0 ? (
          <div className="px-3 py-1.5 rounded-xl border border-[var(--negative)]/20 bg-[var(--negative)]/10 text-[var(--negative)] text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto">
            <AlertTriangle className="w-4 h-4" strokeWidth={1.75} />
            <span>{missingCount} Accounts Missing Nominee</span>
          </div>
        ) : (
          <div className="px-3 py-1.5 rounded-xl border border-[var(--positive)]/20 bg-[var(--positive)]/10 text-[var(--positive)] text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto">
            <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
            <span>{unknownCount > 0 ? `${audit?.accounts_confirmed ?? 0} Confirmed (${unknownCount} Undisclosed)` : "100% Nominee Compliant"}</span>
          </div>
        )}
      </div>

      {missingCount > 0 && (
        <div className="mt-5">
          <InsightFlag
            severity="danger"
            headline={`${missingCount} account${missingCount > 1 ? "s" : ""} missing a valid nominee`}
            why="Without a registered nominee, your family may need a succession certificate or probate to claim these holdings — a process that can take months and legal fees, even when the money is rightfully theirs."
            fixLabel="Fix the accounts flagged below"
            onFix={() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
        </div>
      )}

      {/* Nominee Table */}
      <div ref={tableRef} className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--background-elevated)] text-[10px] uppercase font-bold text-muted-foreground border-y border-border/70 font-sans tracking-wider">
            <tr>
              <th className="py-3 px-4">Account / Folio</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Nominee Name</th>
              <th className="py-3 px-3">Relationship</th>
              <th className="py-3 px-3 text-right">Allocation</th>
              <th className="py-3 px-3 text-center">Compliance Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {displayAccounts.map((item) => {
              const isActionReq = item.status === "Action Required";
              const isPending = item.status === "Information Pending";
              return (
                <tr key={item.id} className={`transition-colors ${isActionReq ? "bg-[var(--negative)]/[0.03] hover:bg-[var(--negative)]/[0.06]" : "hover:bg-accent"}`}>
                  <td className="py-3.5 px-4 font-sans font-bold text-foreground">
                    <div>{item.accountName}</div>
                    <span className="text-[10px] text-muted-foreground font-mono">{item.folioNumber}</span>
                  </td>
                  <td className="py-3.5 px-3 font-sans text-muted-foreground">
                    {item.accountType}
                  </td>
                  <td className="py-3.5 px-3 font-sans">
                    {editingId === item.id ? (
                      <input 
                        type="text" 
                        placeholder="Enter nominee name" 
                        value={tempNomineeName}
                        onChange={(e) => setTempNomineeName(e.target.value)}
                        className="h-7 px-2 bg-[var(--background)] border border-primary/60 rounded-lg text-xs text-foreground outline-none"
                      />
                    ) : (
                      <span className={item.nomineeName === "Unassigned" ? "text-[var(--negative)] font-bold" : "text-foreground font-semibold"}>
                        {item.nomineeName}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 font-sans text-muted-foreground">
                    {editingId === item.id ? (
                      <select 
                        value={tempRelation} 
                        onChange={(e) => setTempRelation(e.target.value as RelationshipType)}
                        className="h-7 px-2 bg-[var(--background)] border border-primary/60 rounded-lg text-xs text-foreground outline-none"
                      >
                        <option value="Spouse">Spouse</option>
                        <option value="Child">Child</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                      </select>
                    ) : (
                      item.relationship
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right font-semibold font-mono text-foreground tabular-nums">
                    {item.allocation}%
                  </td>
                  <td className="py-3.5 px-3 text-center font-sans">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border inline-flex items-center gap-1 ${
                      isActionReq 
                        ? "bg-[var(--negative)]/10 text-[var(--negative)] border-[var(--negative)]/20" 
                        : isPending
                        ? "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20"
                        : "bg-[var(--positive)]/10 text-[var(--positive)] border-[var(--positive)]/20"
                    }`}>
                      {isActionReq ? <AlertTriangle className="w-3 h-3" strokeWidth={1.75} /> : isPending ? <HelpCircle className="w-3 h-3" strokeWidth={1.75} /> : <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />}
                      <span>{item.status}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-sans text-right">
                    {editingId === item.id ? (
                      <Button size="sm" onClick={() => handleFix(item.id)} className="text-xs h-7">
                        Save
                      </Button>
                    ) : isActionReq ? (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => { setEditingId(item.id); setTempNomineeName(""); }}
                        className="text-xs h-7 border-[var(--negative)]/30 text-[var(--negative)] hover:bg-[var(--negative)]/10"
                      >
                        Add Nominee
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-mono">{item.lastUpdated}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
