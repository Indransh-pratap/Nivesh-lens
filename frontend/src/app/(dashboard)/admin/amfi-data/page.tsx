"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Database,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Layers,
  FileCheck,
  ArrowRight,
  ShieldAlert,
  Server,
  Calendar,
  X,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { isUserAdmin } from "@/lib/admin";
import {
  fetchAmfiStatus,
  previewAmfiFile,
  importAmfiFile,
  AMFIStatusResponse,
  AMFIPreviewResponse,
  AMFIImportResponse,
} from "@/lib/amfi-api";

export default function AmfiDataManagementPage() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const isAdmin = isUserAdmin(session?.user?.email);

  // Master Status State
  const [status, setStatus] = useState<AMFIStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  // File & Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [preview, setPreview] = useState<AMFIPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Import State
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<AMFIImportResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Status on mount (only for authorized admins)
  const loadStatus = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoadingStatus(true);
    setStatusError(null);
    try {
      const data = await fetchAmfiStatus();
      setStatus(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load AMFI data status";
      setStatusError(msg);
    } finally {
      setIsLoadingStatus(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadStatus();
    }
  }, [isAdmin, loadStatus]);

  // Handle File Selection
  const handleFileChange = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      setPreviewError("Unsupported file type. Please upload an AMFI Excel file (.xlsx or .xls).");
      return;
    }

    setSelectedFile(file);
    setPreview(null);
    setPreviewError(null);
    setImportResult(null);
    setImportError(null);
    setIsAnalyzing(true);

    try {
      const previewData = await previewAmfiFile(file);
      setPreview(previewData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to parse AMFI Excel file";
      setPreviewError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Import Handler
  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const result = await importAmfiFile(selectedFile);
      setImportResult(result);
      // Reload overall DB status
      await loadStatus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to import AMFI portfolio data";
      setImportError(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setPreview(null);
    setPreviewError(null);
    setImportResult(null);
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!sessionLoading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">
            This administration console is restricted to designated platform administrators. Your account (
            <span className="font-mono text-foreground">{session?.user?.email || "unknown"}</span>) does not have
            administrator privileges.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        eyebrow="SYSTEM & DEVELOPERS"
        title="AMFI Master Data Management"
        description="Centralized master repository for AMFI monthly scheme portfolios and underlying stock holdings. Powers CAS lookthrough and portfolio analytics."
      />

      {/* Info notice explaining normal user vs admin flow */}
      <div className="flex items-start gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm text-indigo-300 dark:bg-indigo-950/20 dark:text-indigo-300">
        <Sparkles className="h-5 w-5 shrink-0 text-indigo-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-indigo-200">
            Automated Master Data Repository
          </p>
          <p className="text-xs text-indigo-300/80 leading-relaxed">
            This administration console is exclusively for ingesting AMFI industry-wide portfolio workbooks. Normal users never upload AMFI files; their uploaded CAS statements automatically query this database to break down mutual funds into underlying company stocks, market capitalization, and sector exposures.
          </p>
        </div>
      </div>

      {/* AMFI Data Status Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-500" />
            AMFI Data Status
          </h2>
          <button
            onClick={loadStatus}
            disabled={isLoadingStatus}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border hover:bg-surface-hover text-muted-foreground transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingStatus ? "animate-spin text-indigo-500" : ""}`} />
            Refresh Status
          </button>
        </div>

        {statusError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{statusError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Latest Statement Date */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Statement Date</span>
              <Calendar className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-foreground">
                {isLoadingStatus ? "..." : (status?.latest_statement_date || "No Data")}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">As-of reported month</p>
          </div>

          {/* Last Ingestion Time */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Last Ingested</span>
              <Clock className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground truncate" title={status?.last_ingestion_time || ""}>
                {isLoadingStatus
                  ? "..."
                  : status?.last_ingestion_time
                  ? new Date(status.last_ingestion_time).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Never"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Audit timestamp</p>
          </div>

          {/* Total Schemes */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Total Schemes</span>
              <Layers className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {isLoadingStatus ? "..." : (status?.schemes_count ?? 0).toLocaleString("en-IN")}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">fund_schemes records</p>
          </div>

          {/* Total Holdings */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Total Holdings</span>
              <FileCheck className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {isLoadingStatus ? "..." : (status?.holdings_count ?? 0).toLocaleString("en-IN")}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">scheme_holdings records</p>
          </div>

          {/* Database Status */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Database</span>
              <Server className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-base font-bold text-foreground">
                {isLoadingStatus ? "..." : (status?.database_status || "Operational")}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">PostgreSQL normalized</p>
          </div>
        </div>
      </div>

      {/* AMFI Portfolio Data Upload Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">AMFI Portfolio Data</h2>
          <p className="text-sm text-muted-foreground">
            Upload AMFI Excel master portfolio sheet to extract and index mutual fund holdings.
          </p>
        </div>

        {/* Drag & Drop Upload Zone */}
        {!selectedFile && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed transition-all p-8 text-center flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? "border-indigo-500 bg-indigo-500/10 scale-[0.99]"
                : "border-border hover:border-indigo-500/60 hover:bg-surface/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Drag &amp; Drop Excel file here
              </p>
              <p className="text-xs text-muted-foreground">
                Supported: <span className="font-medium text-foreground">.xlsx / .xls</span> (Monthly Portfolio format)
              </p>
            </div>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Choose Excel File
            </button>
          </div>
        )}

        {previewError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">File Analysis Failed</p>
              <p className="text-xs leading-relaxed">{previewError}</p>
            </div>
            <button
              onClick={resetUpload}
              className="ml-auto text-xs font-semibold underline hover:text-red-300"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Processing State */}
        {selectedFile && isAnalyzing && (
          <div className="rounded-xl border border-border bg-surface p-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                File: <span className="text-indigo-400">{selectedFile.name}</span>
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <div className="flex items-center gap-3 text-indigo-400">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Status: Processing...</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Parsing workbook sheets, extracting scheme portfolios, and validating ISIN structures...
            </p>
          </div>
        )}

        {/* File Analyzed & Detection Checklist */}
        {selectedFile && preview && !isAnalyzing && (
          <div className="rounded-xl border border-border bg-surface/40 p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-indigo-400" />
                  <span className="font-semibold text-foreground text-sm sm:text-base">
                    File: {preview.filename}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Size: {(preview.filesize_bytes / 1024 / 1024).toFixed(2)} MB &bull; Checksum:{" "}
                  <span className="font-mono text-[11px]">{preview.checksum.slice(0, 16)}...</span>
                </p>
              </div>

              {!importResult && (
                <button
                  onClick={resetUpload}
                  disabled={isImporting}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground transition"
                  title="Remove file"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Deduplication Alert if Duplicate */}
            {preview.is_duplicate && !importResult && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-200">Duplicate Upload Detected</p>
                  <p className="text-xs text-amber-300/90 leading-relaxed">
                    {preview.duplicate_reason || "This portfolio workbook has already been ingested into the master database."}
                  </p>
                  <p className="text-[11px] text-amber-400/80">
                    Re-importing will idempotently refresh the scheme records without duplicating entries.
                  </p>
                </div>
              </div>
            )}

            {/* Checklist of detections */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Analysis &amp; Normalization Status
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="font-medium">
                    {preview.schemes_detected} mutual fund schemes detected
                  </span>
                </div>

                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="font-medium">
                    {(preview.holdings_detected ?? 0).toLocaleString("en-IN")} underlying holdings detected
                  </span>
                </div>

                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="font-medium">
                    Portfolio date: {preview.as_of_date || "Detected from sheet"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="font-medium">Data normalized</span>
                </div>

                <div
                  className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                    importResult
                      ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/10"
                      : "text-muted-foreground bg-surface border-border"
                  }`}
                >
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 ${
                      importResult ? "text-emerald-400" : "text-muted-foreground"
                    }`}
                  />
                  <span className="font-medium">
                    {importResult ? "Saved to database" : "Pending database import"}
                  </span>
                </div>
              </div>
            </div>

            {/* Sample Schemes Preview */}
            {preview.sample_schemes && preview.sample_schemes.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <span className="text-muted-foreground font-medium">Sample Schemes Detected:</span>
                <div className="flex flex-wrap gap-1.5">
                  {preview.sample_schemes.map((name, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-surface px-2 py-1 text-foreground/80 border border-border text-[11px]"
                    >
                      {name}
                    </span>
                  ))}
                  {preview.schemes_detected > preview.sample_schemes.length && (
                    <span className="rounded-md bg-indigo-500/10 px-2 py-1 text-indigo-400 text-[11px] font-medium">
                      +{preview.schemes_detected - preview.sample_schemes.length} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Import Button */}
            {!importResult && (
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={resetUpload}
                  disabled={isImporting}
                  className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition"
                >
                  Choose another file
                </button>

                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isImporting}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Importing to Database...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4" />
                      Import to Database
                    </>
                  )}
                </button>
              </div>
            )}

            {importError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Successful Import Card */}
            {importResult && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-4 text-emerald-300">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-emerald-200">
                      AMFI portfolio data imported successfully.
                    </h4>
                    <p className="text-xs text-emerald-400/90">
                      Master schemes and underlying holdings are now updated in the system database.
                    </p>
                  </div>
                </div>

                {/* Breakdown Details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 text-xs">
                  <div className="rounded-lg bg-background/50 p-2.5 border border-emerald-500/20">
                    <span className="text-muted-foreground block text-[11px]">Schemes Imported</span>
                    <span className="text-lg font-bold text-foreground">
                      {importResult.schemes_imported}
                    </span>
                  </div>

                  <div className="rounded-lg bg-background/50 p-2.5 border border-emerald-500/20">
                    <span className="text-muted-foreground block text-[11px]">Holdings Imported</span>
                    <span className="text-lg font-bold text-foreground">
                      {(importResult.holdings_imported ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="rounded-lg bg-background/50 p-2.5 border border-emerald-500/20">
                    <span className="text-muted-foreground block text-[11px]">Rows Skipped</span>
                    <span className="text-lg font-bold text-foreground">
                      {importResult.rows_skipped}
                    </span>
                  </div>

                  <div className="rounded-lg bg-background/50 p-2.5 border border-emerald-500/20">
                    <span className="text-muted-foreground block text-[11px]">Errors / Warnings</span>
                    <span className="text-lg font-bold text-foreground">
                      {importResult.errors_warnings.length}
                    </span>
                  </div>

                  <div className="rounded-lg bg-background/50 p-2.5 border border-emerald-500/20">
                    <span className="text-muted-foreground block text-[11px]">Statement Date</span>
                    <span className="text-sm font-bold text-foreground">
                      {importResult.statement_date || "N/A"}
                    </span>
                  </div>

                  <div className="rounded-lg bg-background/50 p-2.5 border border-emerald-500/20">
                    <span className="text-muted-foreground block text-[11px]">Ingestion Timestamp</span>
                    <span className="text-[11px] font-mono text-foreground">
                      {new Date(importResult.ingestion_timestamp).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {importResult.errors_warnings && importResult.errors_warnings.length > 0 && (
                  <div className="rounded-lg bg-background/40 p-3 border border-amber-500/20 space-y-1">
                    <span className="text-xs font-medium text-amber-400">Warnings Log:</span>
                    <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-4">
                      {importResult.errors_warnings.map((warn, i) => (
                        <li key={i}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={resetUpload}
                    className="inline-flex items-center gap-2 rounded-lg bg-surface border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-hover transition"
                  >
                    <UploadCloud className="h-4 w-4 text-indigo-400" />
                    Upload Another Workbook
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workflow Architecture Diagram */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          System Data Flow Architecture
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          <div className="flex flex-col items-start rounded-xl border border-border bg-surface p-4 space-y-2">
            <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
              STEP 1
            </span>
            <span className="text-sm font-semibold text-foreground">Admin Uploads AMFI Excel</span>
            <p className="text-xs text-muted-foreground">
              Admin uploads monthly portfolio workbook (.xlsx / .xls) with all mutual fund scheme portfolios.
            </p>
          </div>

          <div className="flex flex-col items-start rounded-xl border border-border bg-surface p-4 space-y-2">
            <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
              STEP 2
            </span>
            <span className="text-sm font-semibold text-foreground">Backend Normalization</span>
            <p className="text-xs text-muted-foreground">
              FastAPI parses ISINs, ticker symbols, weights, market caps, and dates with SHA-256 deduplication.
            </p>
          </div>

          <div className="flex flex-col items-start rounded-xl border border-border bg-surface p-4 space-y-2">
            <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
              STEP 3
            </span>
            <span className="text-sm font-semibold text-foreground">Saves to Database</span>
            <p className="text-xs text-muted-foreground">
              Indexed into <code className="text-indigo-400">fund_schemes</code> and <code className="text-indigo-400">scheme_holdings</code> master tables.
            </p>
          </div>

          <div className="flex flex-col items-start rounded-xl border border-border bg-surface p-4 space-y-2">
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              STEP 4
            </span>
            <span className="text-sm font-semibold text-foreground">CAS Import Automatic Mapping</span>
            <p className="text-xs text-muted-foreground">
              User CAS imports instantly look up these holdings to calculate equity overlap, sector weight, and stress tests.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Sync History */}
      {status?.recent_syncs && status.recent_syncs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" />
            Recent Synchronization History
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="pb-3 font-medium">Timestamp</th>
                  <th className="pb-3 font-medium">Sync Type</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Records Synced</th>
                  <th className="pb-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {status.recent_syncs.map((sync) => (
                  <tr key={sync.id} className="hover:bg-surface/50 transition">
                    <td className="py-3 font-mono text-muted-foreground">
                      {new Date(sync.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 font-medium text-foreground">
                      {sync.sync_type}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          sync.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : sync.status === "failed"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-indigo-500/10 text-indigo-400"
                        }`}
                      >
                        {sync.status}
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-foreground">
                      {(sync.records_synced ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 text-muted-foreground max-w-xs truncate">
                      {sync.metadata_info && typeof sync.metadata_info === "object" && "filename" in sync.metadata_info
                        ? String((sync.metadata_info as Record<string, unknown>).filename)
                        : sync.error_message || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
