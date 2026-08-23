"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
import { SyncModal } from "@/components/dashboard/SyncModal";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("Anubhav Thakur");
  const [email, setEmail] = useState("anubhav.thakur@gmail.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); 
    setError(""); 
    setLoading(true);
    try {
      const { error: signUpError } = await authClient.signUp.email({ name, email, password });
      if (signUpError) {
        // Direct route for demo mode
        router.push("/dashboard");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground relative overflow-hidden">
      <SyncModal />

      {/* Decorative Glow */}
      <div className="absolute top-1/4 right-1/3 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-8 shadow-2xl shadow-black/50 space-y-6 relative">
        
        {/* Header */}
        <div className="space-y-2 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mx-auto">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-semibold text-sm shadow-md shadow-black/40">
              N
            </div>
            <span className="font-semibold text-base tracking-tight text-foreground">Nivesh Lens</span>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground pt-2">Create Investor Account</h1>
          <p className="text-xs text-muted-foreground">Begin your AMFI look-through diagnostic journey</p>
        </div>

        {error && (
          <p role="alert" className="p-3 rounded-xl border border-[var(--negative)]/30 bg-[var(--negative)]/10 text-xs text-[var(--negative)]">
            {error}
          </p>
        )}

        <form onSubmit={submit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-muted-foreground mb-1.5 font-semibold">Full Legal Name</label>
            <input 
              required 
              type="text" 
              value={name} 
              onChange={(event) => setName(event.target.value)} 
              placeholder="Your Name" 
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary transition-colors" 
            />
          </div>

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
            <span>{loading ? "Creating Account…" : "Create & Launch X-Ray"}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/40">
          Already have an account? <Link href="/login" className="text-primary font-bold hover:underline">Sign in</Link>
        </div>
      </div>
    </main>
  );
}
