"use client";

import { useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";

interface AMFIResult {
  status: string;
  filename: string;
  imported_schemes: number;
  skipped_schemes: number;
  total_holdings: number;
  skipped_scheme_codes: string[];
}

interface AMFIPortfolioUploaderProps {
  onSuccess?: () => void;
  className?: string;
}

export function AMFIPortfolioUploader({
  onSuccess,
  className = "",
}: AMFIPortfolioUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<AMFIResult | null>(null);

  const selectFile = (selectedFile: File | null) => {
    setErrorMsg("");
    setResult(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".xlsx")) {
      setErrorMsg("Please upload a valid AMFI XLSX file.");
      setFile(null);
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setErrorMsg("AMFI XLSX file must be 25 MB or smaller.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    setErrorMsg("");
    setResult(null);

    if (!file) {
      setErrorMsg("Please select an AMFI XLSX file first.");
      return;
    }

    const session = await authClient.getSession();

    if (!session.data?.user) {
      setErrorMsg("Please log in to import AMFI data.");
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/portfolio/imports/amfi",
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        throw new Error("Please log in to import AMFI data.");
      }

      if (!response.ok) {
        const detail =
          typeof data?.detail === "object"
            ? data.detail
            : null;

        throw new Error(
          detail?.message ||
            data?.error?.message ||
            (typeof data?.detail === "string"
              ? data.detail
              : "Unable to import AMFI portfolio data.")
        );
      }

      setResult(data);
      onSuccess?.();
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Unable to import AMFI portfolio data."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-border bg-card p-6 ${className}`}
    >
      <div className="mb-5">
        <h3 className="text-sm font-bold">
          AMFI Portfolio Data
        </h3>

        <p className="mt-1 text-xs text-muted-foreground">
          Upload an AMFI monthly portfolio XLSX to update
          mutual-fund look-through holdings.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) =>
          selectFile(event.target.files?.[0] ?? null)
        }
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="w-full rounded-xl border border-dashed border-border p-6 text-center text-sm transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {file ? (
          <>
            <div className="font-semibold">
              {file.name}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </>
        ) : (
          <>
            <div className="font-semibold">
              Select AMFI XLSX
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Maximum file size: 25 MB
            </div>
          </>
        )}
      </button>

      {errorMsg && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          {errorMsg}
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleUpload()}
        disabled={!file || isProcessing}
        className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing
          ? "Importing AMFI data..."
          : "Import AMFI Portfolio"}
      </button>

      {result && (
        <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
          <div className="text-sm font-bold">
            AMFI import completed
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold">
                {result.imported_schemes}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Schemes
              </div>
            </div>

            <div>
              <div className="text-lg font-bold">
                {result.total_holdings}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Holdings
              </div>
            </div>

            <div>
              <div className="text-lg font-bold">
                {result.skipped_schemes}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Skipped
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AMFIPortfolioUploader;