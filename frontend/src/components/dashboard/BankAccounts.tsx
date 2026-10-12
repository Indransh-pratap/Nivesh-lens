"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Account={id:string;bank_name?:string|null;masked_account_number?:string|null;balance?:number|null;currency?:string|null;balance_at?:string|null;last_synced_at?:string|null};
export function BankAccounts(){
 const [accounts,setAccounts]=useState<Account[]>([]); const [state,setState]=useState<"loading"|"error"|"ready">("loading");
 useEffect(()=>{fetch("/api/portfolio/aa/accounts",{credentials:"include",cache:"no-store"}).then(async r=>{if(!r.ok)throw Error();return r.json()}).then(setAccounts).then(()=>setState("ready")).catch(()=>setState("error"))},[]);
 return <section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Bank Accounts</h2><p className="text-xs text-muted-foreground">Separate from your CAS investment portfolio</p></div><Link className="text-xs font-semibold text-primary" href="/dashboard/bank-transactions">View Transactions</Link></div>
 {state==="loading"&&<p className="mt-4 text-sm text-muted-foreground">Loading bank accounts…</p>}{state==="error"&&<p className="mt-4 text-sm text-muted-foreground">Bank account status is unavailable.</p>}{state==="ready"&&!accounts.length&&<p className="mt-4 text-sm text-muted-foreground">Not synced yet. Use 1-OTP Sync to connect a bank account.</p>}
 <div className="mt-4 grid gap-3 md:grid-cols-2">{accounts.map(a=><div className="rounded-xl border border-border p-4" key={a.id}><p className="font-medium text-sm">{a.bank_name||"Linked bank account"}</p><p className="text-xs text-muted-foreground">{a.masked_account_number||"Safe account identifier"}</p>{a.balance!=null&&<p className="mt-2 text-lg font-semibold">{a.currency||"INR"} {Number(a.balance).toLocaleString("en-IN")}</p>}<p className="mt-1 text-xs text-muted-foreground">{a.last_synced_at?`Synced ${new Date(a.last_synced_at).toLocaleString()}`:"Pending sync"}</p></div>)}</div></section>
}
