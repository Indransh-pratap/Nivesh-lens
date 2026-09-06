"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Sparkles, ArrowRight, Smartphone } from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { SyncModal } from "@/components/dashboard/SyncModal";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openSyncModal } = usePortfolioStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("reason") === "session_expired") {
      setError("Your session has expired. Please sign in again to continue.");
    }
  }, [searchParams]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); 
    setError(""); 
    setLoading(true);
    try {
      const { error: signInError } = await authClient.signIn.email({ 
        email: email.trim().toLowerCase(), 
        password 
      });
      if (signInError) {
        setError(signInError.message || "Invalid email or password. Please check your credentials.");
        return;
      }
      const next = searchParams.get("next");
      const target = next && next.startsWith("/") && !next.startsWith("/login") ? next : "/dashboard";
      router.push(target);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleDemoAccess = () => {
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground relative overflow-hidden">
      <SyncModal />

      {/* Decorative Glow */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-[var(--info)]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-8 shadow-2xl shadow-black/50 space-y-6 relative">
        
        {/* Header */}
        <div className="space-y-2 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mx-auto">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-semibold text-sm shadow-md shadow-black/40">
              N
            </div>
            <span className="font-semibold text-base tracking-tight text-foreground">Nivesh Lens</span>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground pt-2">Sign in to Diagnostic Hub</h1>
          <p className="text-xs text-muted-foreground">Access your AMFI Look-Through, HHI & Portfolio X-Ray</p>
        </div>

        {error && (
          <p role="alert" className="p-3 rounded-xl border border-[var(--negative)]/30 bg-[var(--negative)]/10 text-xs text-[var(--negative)]">
            {error}
          </p>
        )}

        <form onSubmit={submit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-muted-foreground mb-1.5 font-semibold">Email Address</label>
            <input 
              required 
              type="email" 
              value={email} 
              onChange={(event) => setEmail(event.target.value)} 
              placeholder="you@example.com" 
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary transition-colors" 
            />
          </div>

          <div>
            <label className="block text-muted-foreground mb-1.5 font-semibold">Password</label>
            <input 
              required 
              type="password" 
              value={password} 
              onChange={(event) => setPassword(event.target.value)} 
              placeholder="Password" 
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary transition-colors" 
            />
          </div>

          <Button type="submit" className="w-full h-11 text-xs font-bold gap-2 mt-1" disabled={loading}>
            <span>{loading ? "Authenticating…" : "Sign in to Workspace"}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-border/60 w-full" />
          <span className="bg-card px-3 text-[10px] font-mono text-muted-foreground uppercase shrink-0">OR QUICK ACCESS</span>
        </div>

        {/* 1-Click Demo Sandbox & OTP Connect */}
        <div className="space-y-2">
          <Button 
            variant="outline" 
            onClick={handleDemoAccess}
            className="w-full h-11 text-xs font-bold gap-2 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Live Demo Diagnostic</span>
          </Button>

          <button
            onClick={() => openSyncModal("OTP")}
            className="w-full py-2.5 text-center text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-[var(--positive)]" />
            <span>Connect with 1-OTP (Account Aggregator)</span>
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-2 border-t border-border/40">
          New to Nivesh Lens? <Link href="/signup" className="text-primary font-bold hover:underline">Create account</Link>
        </p>
      </div>
    </main>
  );
}
