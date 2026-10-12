
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, Suspense } from "react";
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
    const reason = searchParams.get("reason");

    if (reason === "session_expired") {
      setError(
        "Your session has expired. Please sign in again to continue."
      );
    }
  }, [searchParams]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !password) {
        setError("Please enter your email and password.");
        return;
      }

      const { error: signInError } = await authClient.signIn.email({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setError(
          signInError.message ||
            "Invalid email or password. Please check your credentials."
        );
        return;
      }

      /*
       * Login succeeded.
       *
       * Better Auth should have created the session and
       * set the session cookie before this promise resolves.
       */
      const next = searchParams.get("next");

      const target =
        next &&
        next.startsWith("/") &&
        !next.startsWith("/login")
          ? next
          : "/dashboard";

      router.push(target);
    } catch (err) {
      console.error("Login error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again.";

      const lowerMessage = message.toLowerCase();

      if (
        lowerMessage.includes("fetch") ||
        lowerMessage.includes("network") ||
        lowerMessage.includes("failed to fetch")
      ) {
        setError(
          "Cannot reach the authentication server. Please check your connection and try again."
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDemoAccess() {
    router.push("/dashboard");
  }

  function handleOtpAccess() {
    openSyncModal("OTP");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground relative overflow-hidden">
      <SyncModal />

      {/* Decorative Glow */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-[var(--info)]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-8 shadow-2xl shadow-black/50 space-y-6 relative">
        {/* Header */}
        <div className="space-y-2 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 mx-auto"
          >
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-semibold text-sm shadow-md shadow-black/40">
              N
            </div>

            <span className="font-semibold text-base tracking-tight text-foreground">
              Nivesh Lens
            </span>
          </Link>

          <h1 className="text-xl font-bold tracking-tight text-foreground pt-2">
            Sign in to Diagnostic Hub
          </h1>

          <p className="text-xs text-muted-foreground">
            Access your AMFI Look-Through, HHI & Portfolio X-Ray
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 rounded-xl border border-[var(--negative)]/30 bg-[var(--negative)]/10 text-xs text-[var(--negative)]"
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={submit} className="space-y-3.5 text-xs">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-muted-foreground mb-1.5 font-semibold"
            >
              Email Address
            </label>

            <input
              id="email"
              name="email"
              required
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);

                if (error) {
                  setError("");
                }
              }}
              placeholder="you@example.com"
              disabled={loading}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-muted-foreground mb-1.5 font-semibold"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              required
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);

                if (error) {
                  setError("");
                }
              }}
              placeholder="Password"
              disabled={loading}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-11 text-xs font-bold gap-2 mt-1"
            disabled={loading}
          >
            <span>
              {loading ? "Authenticating…" : "Sign in to Workspace"}
            </span>

            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-border/60 w-full" />

          <span className="bg-card px-3 text-[10px] font-mono text-muted-foreground uppercase shrink-0">
            OR QUICK ACCESS
          </span>
        </div>

        {/* Demo + OTP */}
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDemoAccess}
            className="w-full h-11 text-xs font-bold gap-2 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
          >
            <Sparkles className="w-4 h-4" />

            <span>Launch Live Demo Diagnostic</span>
          </Button>

          <button
            type="button"
            onClick={handleOtpAccess}
            className="w-full py-2.5 text-center text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-[var(--positive)]" />

            <span>
              Connect with 1-OTP (Account Aggregator)
            </span>
          </button>
        </div>

        {/* Signup */}
        <p className="text-center text-xs text-muted-foreground pt-2 border-t border-border/40">
          New to Nivesh Lens?{" "}
          <Link
            href="/signup"
            className="text-primary font-bold hover:underline"
          >
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
