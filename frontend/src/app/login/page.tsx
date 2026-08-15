"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const { error: signInError } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (signInError) { setError(signInError.message ?? "Unable to sign in"); return; }
    router.push("/dashboard"); router.refresh();
  }
  return <main className="grid min-h-screen place-items-center p-6"><Card className="w-full max-w-md"><CardContent className="p-6"><h1 className="text-2xl font-semibold">Sign in</h1><p className="mt-2 text-sm text-muted">Access your Portfolio X-Ray workspace.</p>{error && <p role="alert" className="mt-4 text-sm text-red-500">{error}</p>}<form onSubmit={submit} className="mt-6 space-y-4"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /><Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button></form><p className="mt-5 text-sm text-muted">New here? <Link href="/signup" className="text-primary underline">Create an account</Link></p></CardContent></Card></main>;
}
