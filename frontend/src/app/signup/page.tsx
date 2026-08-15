"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const { error: signUpError } = await authClient.signUp.email({ name, email, password });
    setLoading(false);
    if (signUpError) { setError(signUpError.message ?? "Unable to create account"); return; }
    router.push("/dashboard"); router.refresh();
  }
  return <main className="grid min-h-screen place-items-center p-6"><Card className="w-full max-w-md"><CardContent className="p-6"><h1 className="text-2xl font-semibold">Create your account</h1>{error && <p role="alert" className="mt-4 text-sm text-red-500">{error}</p>}<form onSubmit={submit} className="mt-6 space-y-4"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /><input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /><Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating account…" : "Create account"}</Button></form><p className="mt-5 text-sm text-muted">Already have an account? <Link href="/login" className="text-primary underline">Sign in</Link></p></CardContent></Card></main>;
}
