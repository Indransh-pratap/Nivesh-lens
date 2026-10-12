
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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // -------------------------
    // Validation
    // -------------------------

    if (!cleanName) {
      setError("Please enter your full name.");
      setLoading(false);
      return;
    }

    if (!cleanEmail) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: signupError } =
        await authClient.signUp.email({
          name: cleanName,
          email: cleanEmail,
          password,
        });

      // -------------------------
      // Better Auth error
      // -------------------------

      if (signupError) {
        console.error("Signup error:", signupError);

        setError(
          signupError.message ||
            "Unable to create account. Please try again."
        );

        return;
      }

      // -------------------------
      // Signup succeeded
      // -------------------------

      if (!data) {
        setError(
          "Account creation did not return a valid response. Please try again."
        );

        return;
      }

      console.log("Account created successfully:", data);

      /*
       * Better Auth should create the session/cookie
       * as part of the successful signup flow.
       *
       * Do not call router.refresh() immediately here.
       */
      router.replace("/dashboard");
    } catch (err) {
      console.error("Signup request failed:", err);

      if (err instanceof Error) {
        const message = err.message.toLowerCase();

        if (
          message.includes("fetch") ||
          message.includes("network") ||
          message.includes("failed to fetch")
        ) {
          setError(
            "Cannot reach the authentication server. Please check your connection and try again."
          );
        } else {
          setError(err.message);
        }
      } else {
        setError(
          "Something went wrong while creating your account."
        );
      }
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
            Create Investor Account
          </h1>

          <p className="text-xs text-muted-foreground">
            Begin your AMFI look-through diagnostic journey
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

        {/* Signup Form */}
        <form
          onSubmit={submit}
          className="space-y-3.5 text-xs"
        >
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-muted-foreground mb-1.5 font-semibold"
            >
              Full Legal Name
            </label>

            <input
              id="name"
              name="name"
              required
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);

                if (error) {
                  setError("");
                }
              }}
              placeholder="Your Name"
              autoComplete="name"
              disabled={loading}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

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
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);

                if (error) {
                  setError("");
                }
              }}
              placeholder="you@example.com"
              autoComplete="email"
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
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);

                if (error) {
                  setError("");
                }
              }}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              minLength={8}
              disabled={loading}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            />

            <p className="text-[10px] text-muted-foreground mt-1.5">
              Password must contain at least 8 characters.
            </p>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-11 text-xs font-bold gap-2 mt-1"
            disabled={loading}
          >
            <span>
              {loading
                ? "Creating Account…"
                : "Create & Launch X-Ray"}
            </span>

            {!loading && (
              <ArrowRight className="w-4 h-4" />
            )}
          </Button>
        </form>

        {/* Login */}
        <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/40">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary font-bold hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
