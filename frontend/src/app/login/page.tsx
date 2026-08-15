"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Shield, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  ChevronLeft,
  Smartphone,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { usePortfolioStore } from "@/store/portfolioStore";

type AuthTab = "login" | "signup" | "forgot" | "otp";

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Set tab based on query param if any
  const initialTab = (searchParams.get("tab") as AuthTab) || "login";
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  
  const { startSync } = usePortfolioStore();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSocialLogin = (provider: "google" | "microsoft") => {
    setIsLoading(true);
    setErrorMsg("");
    setTimeout(() => {
      setIsLoading(false);
      // Simulate redirecting to dashboard
      router.push("/dashboard");
    }, 1200);
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    
    setIsLoading(true);
    setErrorMsg("");
    setTimeout(() => {
      setIsLoading(false);
      // Simulating a successful login
      router.push("/dashboard");
    }, 1500);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setTimeout(() => {
      setIsLoading(false);
      // Move to OTP phase to simulate dual-factor sync setup
      setPhone("+91 98765 43210");
      setActiveTab("otp");
    }, 1500);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Please enter your registered email address.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMsg("Reset link has been sent to your email.");
      setTimeout(() => {
        setSuccessMsg("");
        setActiveTab("login");
      }, 3000);
    }, 1200);
  };

  const handleOtpChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return;
    
    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Auto focus next input
    if (element.value !== "" && element.nextElementSibling) {
      (element.nextElementSibling as HTMLInputElement).focus();
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length < 6) {
      setErrorMsg("Please enter the complete 6-digit OTP code.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    
    // Simulate portfolio OTP synchronization
    startSync("OTP").then(() => {
      setIsLoading(false);
      router.push("/dashboard");
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center mb-8 relative z-10">
        <Link href="/" className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-extrabold text-xl shadow-md">
            N
          </div>
          <span className="font-bold text-2xl tracking-tight">Nivesh Lens</span>
        </Link>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <Shield className="h-3 w-3 text-primary" /> SECURED BY NSDL & CDSL DEPOSITORIES
        </span>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Card className="border-border/60 hover:shadow-xl transition-shadow duration-300">
          
          {/* Status Message Banners */}
          {successMsg && (
            <div className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 p-4 border-b border-green-100 dark:border-green-900/30 text-xs font-semibold text-center rounded-t-xl animate-in fade-in duration-200">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-4 border-b border-red-100 dark:border-red-900/30 text-xs font-semibold text-center rounded-t-xl animate-in fade-in duration-200">
              {errorMsg}
            </div>
          )}

          {/* Form Switcher */}
          <CardContent className="p-8">
            
            {/* LOGIN STATE */}
            {activeTab === "login" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Sign in to platform</h3>
                  <p className="text-xs text-muted-foreground mt-1">Access your portfolio X-ray diagnostics immediately.</p>
                </div>

                <div className="flex gap-4">
                  {/* Google SSO */}
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center justify-center gap-2 h-11 text-xs cursor-pointer"
                    onClick={() => handleSocialLogin("google")}
                    disabled={isLoading}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                      <g transform="matrix(1, 0, 0, 1, 0, 0)">
                        <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.05,3.1l3.2,2.48c1.87,-1.72 2.95,-4.27 2.82,-8.28Z" fill="#4285F4" />
                        <path d="M12,20.7c2.43,0 4.47,-0.81 5.96,-2.2l-3.2,-2.48c-0.89,0.6 -2.03,0.96 -3.2,0.96 -2.46,0 -4.54,-1.66 -5.28,-3.9L2.97,16.2c1.48,2.94 4.51,4.5 9.03,4.5Z" fill="#34A853" />
                        <path d="M6.72,13.08c-0.19,-0.57 -0.3,-1.18 -0.3,-1.8s0.11,-1.23 0.3,-1.8L2.97,6.36C2.1,8.09 1.62,10.01 1.62,12s0.48,3.91 1.35,5.64l3.75,-2.92Z" fill="#FBBC05" />
                        <path d="M12,6.3c1.32,0 2.5,0.45 3.44,1.35l2.58,-2.58C16.46,3.69 14.38,3.3 12,3.3c-4.52,0 -7.55,1.56 -9.03,4.5l3.75,2.92C7.46,8.48 9.54,6.3 12,6.3Z" fill="#EA4335" />
                      </g>
                    </svg>
                    Google
                  </Button>

                  {/* Microsoft SSO */}
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center justify-center gap-2 h-11 text-xs cursor-pointer"
                    onClick={() => handleSocialLogin("microsoft")}
                    disabled={isLoading}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#f35325" d="M0 0h11v11H0z"/>
                      <path fill="#81bc06" d="M12 0h11v11H12z"/>
                      <path fill="#05a6f0" d="M0 12h11v11H0z"/>
                      <path fill="#ffba08" d="M12 12h11v11H12z"/>
                    </svg>
                    Microsoft
                  </Button>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/60" />
                  </div>
                  <span className="relative px-3 bg-card text-[10px] text-muted-foreground uppercase font-bold tracking-wider">OR CONTINUE WITH EMAIL</span>
                </div>

                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-muted-foreground">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="pl-10 h-11 w-full rounded-lg border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-muted-foreground">Password</label>
                      <button 
                        type="button"
                        onClick={() => setActiveTab("forgot")}
                        className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted" />
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-11 w-full rounded-lg border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted hover:text-foreground cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11 text-sm font-semibold flex items-center justify-center gap-1" disabled={isLoading}>
                    {isLoading ? "Signing in..." : <>Sign In <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </form>

                <div className="text-center pt-2 text-xs">
                  <span className="text-muted-foreground">Don&apos;t have an account? </span>
                  <button 
                    onClick={() => setActiveTab("signup")} 
                    className="font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Sign up free
                  </button>
                </div>
              </div>
            )}

            {/* SIGNUP STATE */}
            {activeTab === "signup" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Create your account</h3>
                  <p className="text-xs text-muted-foreground mt-1">Get an instant structural breakdown of your net worth.</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 h-4 w-4 text-muted" />
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Anubhav Thakur"
                        className="pl-10 h-11 w-full rounded-lg border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-muted-foreground">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="pl-10 h-11 w-full rounded-lg border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-muted-foreground">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create strong password"
                        className="pl-10 pr-10 h-11 w-full rounded-lg border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted hover:text-foreground cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <input 
                      id="terms" 
                      type="checkbox" 
                      required
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 mt-0.5 cursor-pointer"
                    />
                    <label htmlFor="terms" className="ml-2 text-xs text-muted-foreground leading-tight">
                      I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
                    </label>
                  </div>

                  <Button type="submit" className="w-full h-11 text-sm font-semibold flex items-center justify-center gap-1" disabled={isLoading}>
                    {isLoading ? "Creating account..." : <>Sign Up Free <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </form>

                <div className="text-center pt-2 text-xs">
                  <span className="text-muted-foreground">Already have an account? </span>
                  <button 
                    onClick={() => setActiveTab("login")} 
                    className="font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </div>
              </div>
            )}

            {/* FORGOT PASSWORD STATE */}
            {activeTab === "forgot" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <button 
                  onClick={() => setActiveTab("login")}
                  className="flex items-center gap-1 text-xs text-muted hover:text-foreground font-semibold cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" /> Back to login
                </button>
                
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Reset password</h3>
                  <p className="text-xs text-muted-foreground mt-1">We will email you a secure link to reset your account password.</p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-muted-foreground">Registered email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="pl-10 h-11 w-full rounded-lg border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={isLoading}>
                    {isLoading ? "Sending email..." : "Send Reset Link"}
                  </Button>
                </form>
              </div>
            )}

            {/* OTP SYNCHRONIZATION STATE */}
            {activeTab === "otp" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" /> OTP Verification
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    We sent a verification code to your depository-registered phone <span className="font-semibold text-foreground">{phone}</span>.
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div className="flex justify-between items-center gap-2">
                    {otp.map((data, index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength={1}
                        value={data}
                        onChange={(e) => handleOtpChange(e.target, index)}
                        onFocus={(e) => e.target.select()}
                        className="w-12 h-12 text-center rounded-lg border border-border bg-accent/20 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-transparent transition-all"
                        disabled={isLoading}
                      />
                    ))}
                  </div>

                  <div className="space-y-3">
                    <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={isLoading}>
                      {isLoading ? "Syncing Portfolio Positions..." : "Verify & Sync Portfolio"}
                    </Button>
                    
                    <button 
                      type="button"
                      onClick={() => setOtp(["", "", "", "", "", ""])}
                      className="w-full text-center text-xs font-semibold text-primary hover:underline cursor-pointer"
                      disabled={isLoading}
                    >
                      Resend Code (30s)
                    </button>
                  </div>
                </form>

                <div className="rounded-lg border border-border/30 bg-accent/20 p-4">
                  <p className="text-[11px] text-muted-foreground leading-normal flex items-start gap-2">
                    <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    Depository connection verifies your stocks and mutual funds directly with SEBI registry database, bypassing manual data entry.
                  </p>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return <Suspense fallback={<div className="min-h-screen bg-background" />}><AuthPageContent /></Suspense>;
}
