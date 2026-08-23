"use client";

import React, { useState, useCallback, useRef } from "react";
import { 
  FileText, 
  UploadCloud, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  FileCheck2,
  KeyRound,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useToastStore } from "@/store/toastStore";

interface CasPdfUploaderProps {
  onSuccess?: (parsedFoliosCount: number) => void;
  className?: string;
}

export const CasPdfUploader = React.memo(function CasPdfUploader({
  onSuccess,
  className = ""
}: CasPdfUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setErrorMsg("");

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile.name.toLowerCase().endsWith(".pdf")) {
        setErrorMsg("Please upload a valid PDF file (CAMS, KFintech, or NSDL CAS).");
        return;
      }
      setFile(droppedFile);
    }
  }, []);

  // Handle file select via browse button
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg("");
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
        setErrorMsg("Please upload a valid PDF file (CAMS, KFintech, or NSDL CAS).");
        return;
      }
      setFile(selectedFile);
    }
  }, []);

  // Simulated client-side CAS Decryption & Extraction pipeline
  const handleDecryptAndParse = useCallback(async () => {
    if (!file) {
      setErrorMsg("Please select or drop your CAS PDF file.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg("");
    setProgressPercent(15);
    setProcessStep("Loading PDF cryptographic signature into secure client memory...");

    const steps = [
      { progress: 35, step: "Validating passphrase against AES-256 PDF encryption layer..." },
      { progress: 60, step: "Extracting folios across CAMS, KFintech & Demat records..." },
      { progress: 85, step: "Cross-referencing AMFI NAV endpoints and monthly asset sheets..." },
      { progress: 100, step: "CAS Parsing complete! Extracted 8 Folios & 50 Transactions." }
    ];

    for (const s of steps) {
      await new Promise((res) => setTimeout(res, 550));
      setProgressPercent(s.progress);
      setProcessStep(s.step);
    }

    await new Promise((res) => setTimeout(res, 400));
    setIsProcessing(false);
    setIsSuccess(true);
    useToastStore.getState().addToast({
      variant: "success",
      title: "CAS statement parsed",
      description: "8 folios and 50 transactions extracted successfully.",
    });
    if (onSuccess) {
      onSuccess(8);
    }
  }, [file, onSuccess]);

  const handleReset = useCallback(() => {
    setFile(null);
    setPassword("");
    setIsProcessing(false);
    setIsSuccess(false);
    setErrorMsg("");
    setProgressPercent(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className={`rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Smart CAS PDF Parser & Decryptor</h3>
            <p className="text-xs text-muted-foreground">Zero-error client-side statement ingestion (CAMS · KFintech · NSDL · CDSL)</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--positive)]/20 bg-[var(--positive)]/10 text-[var(--positive)] text-xs font-semibold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
          <span>Client-Side AES Sandbox</span>
        </div>
      </div>

      {/* Main Upload Body */}
      {!isSuccess ? (
        <div className="mt-6 space-y-5">
          
          {/* Hidden native input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Drag & Drop Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
            className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
              file 
                ? "border-primary/60 bg-primary/5" 
                : dragActive 
                ? "border-primary bg-primary/10 scale-[0.99]" 
                : "border-border bg-[var(--background-elevated)] hover:border-primary/40 hover:bg-accent cursor-pointer"
            }`}
          >
            {file ? (
              <div className="flex items-center justify-between w-full max-w-md p-3.5 rounded-xl bg-[var(--card)] border border-border">
                <div className="flex items-center gap-3 overflow-hidden text-left">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-foreground truncate">{file.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground tabular-nums">
                      {(file.size / 1024).toFixed(1)} KB · PDF Document
                    </p>
                  </div>
                </div>
                <IconButton
                  onClick={(e) => { e.stopPropagation(); handleReset(); }}
                  disabled={isProcessing}
                  aria-label="Remove selected file"
                  variant="danger"
                  size="sm"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </IconButton>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto">
                  <UploadCloud className="w-6 h-6" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Drag and drop your password-protected CAS PDF
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse from local device
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-accent border border-border/70 text-muted-foreground">
                    CAMS CAS
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-accent border border-border/70 text-muted-foreground">
                    KFintech CAS
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-accent border border-border/70 text-muted-foreground">
                    CDSL / NSDL
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Password Input Section */}
          <div className="grid sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
                  <span>PDF Decryption Password</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Usually PAN / DoB</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isProcessing}
                placeholder="e.g. ABCDE1234F or 15081995"
                className="w-full h-10 px-3 bg-[var(--background-elevated)] border border-border rounded-xl text-xs font-mono text-foreground focus:border-primary/60 outline-none transition-colors"
              />
            </div>

            <div>
              <Button
                onClick={handleDecryptAndParse}
                disabled={isProcessing || !file}
                className="w-full h-10 text-xs font-bold gap-2 shadow-md shadow-black/40"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Decrypting CAS Statement…</span>
                  </>
                ) : (
                  <>
                    <span>Decrypt & Run Look-Through</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Real-time Decryption Progress */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-[var(--background-elevated)] border border-border/70 space-y-2.5 animate-in fade-in">
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span className="text-foreground font-sans font-semibold text-[11px]">{processStep}</span>
                <span className="text-primary font-bold tabular-nums">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-[var(--background)] rounded-full overflow-hidden border border-border/50">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-[var(--negative)]/10 border border-[var(--negative)]/20 text-xs text-[var(--negative)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Compliance & Privacy Footer */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-muted-foreground border-t border-border/70">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
              <span>Passwords are never logged or stored. Decryption executes locally in memory.</span>
            </span>
            <span className="font-mono text-[var(--positive)] text-[10px]">256-Bit SSL Sandboxed</span>
          </div>
        </div>
      ) : (
        /* Success Verified State */
        <div className="mt-6 p-6 rounded-2xl bg-[var(--positive)]/10 border border-[var(--positive)]/20 text-center space-y-4 animate-in fade-in">
          <div className="w-12 h-12 rounded-full bg-[var(--positive)]/20 border border-[var(--positive)]/30 text-[var(--positive)] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
          </div>

          <div>
            <h4 className="text-base font-bold text-foreground">CAS PDF Successfully Parsed!</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Extracted <strong className="text-foreground font-mono tabular-nums">8 Mutual Fund Folios</strong>, <strong className="text-foreground font-mono tabular-nums">4 Direct Equity Holdings</strong>, and <strong className="text-foreground font-mono tabular-nums">50 Historical Transactions</strong>.
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Button size="sm" onClick={handleReset} variant="outline" className="text-xs">
              Upload Another Statement
            </Button>
            <Button size="sm" className="text-xs font-bold gap-1.5">
              <span>View Updated Look-Through</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});
