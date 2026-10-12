"use client";

import React, {
  useRef,
  useState,
  useEffect,
} from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  X,
  Smartphone,
  FileText,
  ShieldCheck,
  ArrowRight,
  Lock,
  Sparkles,
  RefreshCw,
  FileCheck2,
  Building2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { usePortfolioStore } from "@/store/portfolioStore";
import { Holding } from "@/types";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useDialogA11y } from "@/lib/useDialogA11y";
import { authClient } from "@/lib/auth-client";


export function SyncModal() {
  const router = useRouter();

  const { data: session } = authClient.useSession();

  const {
    isSyncModalOpen,
    closeSyncModal,
    syncMethod,
    syncProgress,
    syncStep,
    isSyncing,
  } = usePortfolioStore();

  const [activeTab, setActiveTab] = useState<
    "OTP" | "CAS"
  >(syncMethod || "OTP");

  /* =========================================================
     AA / OTP STATE
     ========================================================= */

  const [mobileNumber, setMobileNumber] =
    useState("");

  const [otpError, setOtpError] =
    useState("");

  const [otpLoading, setOtpLoading] =
    useState(false);

  const [aaConsentId, setAaConsentId] =
    useState("");

  const [fieldErrors, setFieldErrors] =
    useState<{
      mobile?: string;
    }>({});

  /* =========================================================
     CAS STATE
     ========================================================= */

  const [casPassword, setCasPassword] =
    useState("");

  const [casFile, setCasFile] =
    useState<File | null>(null);

  const [casError, setCasError] =
    useState("");

  const [casAuthRequired, setCasAuthRequired] =
    useState(false);

  const [casProgress, setCasProgress] =
    useState(0);

  const [casStep, setCasStep] =
    useState("");

  const [dragOver, setDragOver] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const dialogRef = useDialogA11y(
    isSyncModalOpen,
    () => {
      if (!isSyncing) {
        closeSyncModal();
      }
    }
  );

  /* =========================================================
     TAB / MODAL RESET
     ========================================================= */

  useEffect(() => {
    if (syncMethod) {
      setActiveTab(syncMethod);
    }
  }, [syncMethod, isSyncModalOpen]);

  useEffect(() => {
    if (!isSyncModalOpen) {
      return;
    }

    setOtpError("");
    setOtpLoading(false);
    setAaConsentId("");
    setFieldErrors({});
  }, [isSyncModalOpen, activeTab]);

  /* =========================================================
     VALIDATE AA MOBILE
     ========================================================= */

  const validateAAMobile = () => {
    const mobile =
      mobileNumber.trim();

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setFieldErrors({
        mobile:
          "Enter a valid 10-digit Indian mobile number.",
      });

      return false;
    }

    setFieldErrors({});

    return true;
  };

  /* =========================================================
     CAS FILE SELECT
     ========================================================= */

  const handleFileSelect = (
    file: File | null
  ) => {
    setCasError("");
    setCasAuthRequired(false);

    if (!file) {
      return;
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith(".pdf") &&
      file.type !== "application/pdf"
    ) {
      setCasFile(null);

      setCasError(
        "Please select a valid PDF file (CAMS, KFintech, or NSDL CAS)."
      );

      return;
    }

    if (
      file.size >
      25 * 1024 * 1024
    ) {
      setCasFile(null);

      setCasError(
        "PDF must be smaller than 25 MB."
      );

      return;
    }

    setCasFile(file);
    setCasProgress(0);
    setCasStep("");
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0] ?? null;

    handleFileSelect(file);

    event.target.value = "";
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    setDragOver(false);

    const file =
      event.dataTransfer.files?.[0] ?? null;

    handleFileSelect(file);
  };

  /* =========================================================
     CAS IMPORT
     ========================================================= */

  const handleCasImport = async () => {
    setCasError("");
    setCasAuthRequired(false);

    if (!casFile) {
      setCasError(
        "Please select your CAS PDF first."
      );

      return;
    }

    let currentUser =
      session?.user;

    if (!currentUser) {
      try {
        const cur =
          await authClient.getSession();

        currentUser =
          cur.data?.user;
      } catch {
        currentUser = undefined;
      }
    }

    if (!currentUser) {
      setCasAuthRequired(true);

      setCasError(
        "Please log in to import your portfolio."
      );

      return;
    }

    setCasProgress(10);
    setCasStep(
      "Uploading CAS statement securely..."
    );

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        casFile
      );

      formData.append(
        "password",
        casPassword
      );

      setCasProgress(25);
      setCasStep(
        "Sending CAS statement to secure parser..."
      );

      const response =
        await fetch(
          "/api/portfolio/imports/cas",
          {
            method: "POST",
            body: formData,
            credentials: "include",
          }
        );

      if (response.status === 401) {
        setCasAuthRequired(true);

        throw new Error(
          "Please log in to import your portfolio."
        );
      }

      if (response.status === 403) {
        throw new Error(
          "You don't have permission to import this portfolio."
        );
      }

      if (response.status >= 500) {
        throw new Error(
          "Server error while processing the statement. Please try again."
        );
      }

      setCasProgress(60);
      setCasStep(
        "Decrypting and parsing CAS statement..."
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        const errDetail =
          typeof data?.detail ===
          "object"
            ? data.detail
            : null;

        const code =
          data?.error?.code ||
          errDetail?.code;

        if (
          code ===
          "WRONG_PASSWORD"
        ) {
          throw new Error(
            "Could not decrypt the CAS PDF. Please check the password."
          );
        }

        if (
          code === "EMPTY_CAS"
        ) {
          throw new Error(
            "No investment records were found in this CAS statement."
          );
        }

        if (
          code ===
          "UNSUPPORTED_CAS"
        ) {
          throw new Error(
            "Unsupported CAS statement format."
          );
        }

        if (
          code === "INVALID_PDF"
        ) {
          throw new Error(
            "Please upload a valid PDF file (CAMS, KFintech, or NSDL CAS)."
          );
        }

        const message =
          data?.error?.message ||
          (typeof data?.detail ===
          "string"
            ? data.detail
            : errDetail?.message) ||
          "Unable to process CAS statement.";

        throw new Error(message);
      }

      const holdingsCount =
        Number(
          data?.holdings_count ?? 0
        );

      const transactionsCount =
        Number(
          data?.transactions_count ?? 0
        );

      if (
        holdingsCount === 0 &&
        (!data?.holdings ||
          data.holdings.length === 0)
      ) {
        throw new Error(
          "No investment records were found in this CAS statement."
        );
      }

      const rawList =
        Array.isArray(data?.holdings)
          ? data.holdings
          : [];

      const normalizedList: Holding[] =
        rawList.map(
          (
            item: any,
            idx: number
          ) => {
            const rawAssetType =
              String(
                item.asset_type ??
                  item.assetType ??
                  ""
              ).toUpperCase();

            const name =
              String(
                item.name ??
                  item.schemeName ??
                  item.scheme_name ??
                  "Imported Holding"
              ).trim();

            const isMF =
              rawAssetType.includes(
                "MUTUAL"
              ) ||
              rawAssetType ===
                "MUTUAL_FUND" ||
              name
                .toLowerCase()
                .includes("fund") ||
              name
                .toLowerCase()
                .includes("growth") ||
              name
                .toLowerCase()
                .includes(
                  "direct plan"
                );

            const isStock =
              rawAssetType.includes(
                "STOCK"
              ) ||
              rawAssetType.includes(
                "EQUITY"
              ) ||
              rawAssetType ===
                "STOCK";

            const type: Holding["type"] =
              isMF
                ? "Mutual Fund"
                : isStock
                  ? "Stock"
                  : "Mutual Fund";

            const curVal =
              Number(
                item.currentValue ??
                  item.current_value
              ) || 0;

            const qty =
              Number(
                item.quantity ??
                  item.units
              ) || 0;

            const avgCost =
              Number(
                item.averageCost ??
                  item.average_cost ??
                  item.average_price ??
                  item.avgPrice
              ) || 0;

            const curPrice =
              Number(
                item.currentPrice ??
                  item.current_price
              ) || 0;

            const returnsVal =
              Number(
                item.returnsValue ??
                  item.returns_value
              ) || 0;

            const returnsPct =
              Number(
                item.returns
              ) || 0;

            return {
              id: String(
                item.id ??
                  `cas_${Date.now()}_${idx}`
              ),

              name,

              type,

              ticker: String(
                item.ticker ??
                  item.isin?.slice(
                    0,
                    6
                  ) ??
                  `CAS_${idx + 1}`
              ),

              isin: item.isin
                ? String(item.isin)
                : undefined,

              quantity: qty,
              units: qty,

              avgPrice: avgCost,
              averageCost: avgCost,

              currentValue: curVal,
              currentPrice: curPrice,

              returns: returnsPct,
              returnsValue: returnsVal,

              allocation: 0,

              planType:
                item.planType ===
                  "Regular" ||
                item.plan_type ===
                  "Regular"
                  ? "Regular"
                  : "Direct",

              expenseRatio:
                Number(
                  item.expenseRatio ??
                    item.expense_ratio
                ) || 0,

              riskGrade:
                item.riskGrade ===
                  "High" ||
                item.risk_grade ===
                  "High"
                  ? "High"
                  : item.riskGrade ===
                        "Medium" ||
                    item.risk_grade ===
                      "Medium"
                    ? "Medium"
                    : "Low",

              sector: isMF
                ? "Diversified MF"
                : "Equity",

              nomineeStatus:
                "Verified",

              assetClass: String(
                item.assetClass ??
                  item.asset_class ??
                  "Equity"
              ),
            } as Holding;
          }
        );

      const totalVal =
        normalizedList.reduce(
          (
            sum: number,
            h: Holding
          ) =>
            sum + h.currentValue,
          0
        );

      const importedHoldings =
        normalizedList.map(
          (h: Holding) => ({
            ...h,

            allocation:
              totalVal > 0
                ? (h.currentValue /
                    totalVal) *
                  100
                : 0,
          })
        );

      if (
        importedHoldings.length >
        0
      ) {
        usePortfolioStore
          .getState()
          .setHoldings(
            importedHoldings
          );
      }

      const returnedPortfolioId =
        data?.portfolio_id ??
        data?.portfolioId;

      if (
        returnedPortfolioId &&
        typeof window !==
          "undefined"
      ) {
        localStorage.setItem(
          "nivesh_active_portfolio_id",
          returnedPortfolioId
        );

        window.dispatchEvent(
          new CustomEvent(
            "nivesh_portfolio_updated",
            {
              detail: {
                portfolioId:
                  returnedPortfolioId,
              },
            }
          )
        );
      }

      setCasProgress(100);

      setCasStep(
        "CAS import completed successfully."
      );

      usePortfolioStore.setState(
        {
          isSyncing: false,
          isSyncModalOpen: false,
          syncProgress: 100,
          syncStep:
            "CAS Import Successful!",
          lastSyncedAt:
            new Date().toISOString(),
          syncSource:
            "CAS Statement",
        }
      );

      const store =
        usePortfolioStore.getState();

      if (
        "addToast" in store &&
        typeof (
          store as any
        ).addToast ===
          "function"
      ) {
        (
          store as any
        ).addToast({
          variant: "success",
          title:
            "CAS statement imported",
          description:
            `${holdingsCount} holdings and ${transactionsCount} transactions extracted successfully.`,
        });
      }
    } catch (error) {
      setCasProgress(0);
      setCasStep("");

      setCasError(
        error instanceof Error
          ? error.message
          : "Unable to process CAS statement."
      );
    }
  };

  /* =========================================================
     SETU ACCOUNT AGGREGATOR
     ========================================================= */

  const handleRequestOtp =
    async () => {
      setOtpError("");

      if (!validateAAMobile()) {
        return;
      }

      try {
        setOtpLoading(true);

        const response =
          await fetch(
            "/api/portfolio/aa/consent",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              credentials: "include",

              body: JSON.stringify({
                mobile_number:
                  mobileNumber.trim(),

               redirect_url:
  `${window.location.origin}/aa-callback`,
              }),
            }
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (!response.ok) {
          const detail =
            typeof data?.detail ===
            "object"
              ? data.detail
              : null;

          throw new Error(
            detail?.message ||
              data?.detail ||
              data?.error?.message ||
              "Unable to start Account Aggregator connection."
          );
        }

        if (
          !data?.consent_id
        ) {
          throw new Error(
            "Setu did not return a consent ID."
          );
        }

        if (
          !data?.consent_url
        ) {
          throw new Error(
            "Setu did not return a consent URL."
          );
        }

        setAaConsentId(
          data.consent_id
        );

        sessionStorage.setItem(
          "aa_consent_id",
          data.consent_id
        );

        /*
         * IMPORTANT:
         *
         * We do NOT collect or verify the
         * AA OTP ourselves.
         *
         * Setu handles:
         * - OTP
         * - AA authentication
         * - FIP discovery
         * - account linking
         * - consent
         */

        window.location.href =
          data.consent_url;
      } catch (error) {
        console.error(
          "Account Aggregator start error:",
          error
        );

        setOtpError(
          error instanceof Error
            ? error.message
            : "Unable to start Account Aggregator connection."
        );

        setOtpLoading(false);
      }
    };

  /* =========================================================
     START CURRENT TAB
     ========================================================= */

  const handleStart = () => {
    if (activeTab === "OTP") {
      handleRequestOtp();
      return;
    }

    handleCasImport();
  };

  /* =========================================================
     CLOSED
     ========================================================= */

  if (!isSyncModalOpen) {
    return null;
  }

  /* =========================================================
     UI
     ========================================================= */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 motion-reduce:animate-none">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-modal-title"
        tabIndex={-1}
        className="relative w-full max-w-xl rounded-2xl border border-border bg-[var(--card)] p-6 shadow-2xl shadow-black/60 text-foreground overflow-hidden outline-none"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        {/* =================================================
            HEADER
            ================================================= */}

        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <Sparkles
                className="w-5 h-5"
                strokeWidth={1.75}
              />
            </div>

            <div>
              <h2
                id="sync-modal-title"
                className="text-base font-semibold tracking-tight text-foreground"
              >
                Connect Live Portfolio
              </h2>

              <p className="text-xs text-muted-foreground">
                Secure Account Aggregator &
                Smart CAS Import
              </p>
            </div>
          </div>

          <IconButton
            onClick={closeSyncModal}
            disabled={isSyncing}
            aria-label="Close sync dialog"
          >
            <X className="w-5 h-5" />
          </IconButton>
        </div>

        {/* =================================================
            TABS
            ================================================= */}

        {!isSyncing && (
          <div className="grid grid-cols-2 gap-2 mt-5 p-1 bg-[var(--background-elevated)] rounded-xl border border-border/70">
            <button
              type="button"
              onClick={() =>
                setActiveTab("OTP")
              }
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "OTP"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone
                className="w-4 h-4"
                strokeWidth={1.75}
              />

              <span>
                1-OTP Fetch (AA & RTA)
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab("CAS")
              }
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "CAS"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText
                className="w-4 h-4"
                strokeWidth={1.75}
              />

              <span>
                Smart CAS PDF Upload
              </span>
            </button>
          </div>
        )}

        {/* =================================================
            ACCOUNT AGGREGATOR
            ================================================= */}

        {!isSyncing &&
          activeTab === "OTP" && (
            <div className="mt-5 space-y-4">
              {/* Info */}

              <div className="p-3.5 rounded-xl border border-[var(--positive)]/20 bg-[var(--positive)]/10 flex items-start gap-3">
                <ShieldCheck
                  className="w-5 h-5 text-[var(--positive)] shrink-0 mt-0.5"
                  strokeWidth={1.75}
                />

                <div className="text-xs">
                  <p className="font-semibold text-[var(--positive)]">
                    Secure Account Aggregator Sync
                  </p>

                  <p className="text-muted-foreground mt-0.5 leading-relaxed">
                    Connect your financial accounts
                    securely through the Account
                    Aggregator consent journey.
                    OTP and account authentication
                    are handled by the AA provider.
                  </p>
                </div>
              </div>

              {/* Error */}

              {otpError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl border border-[var(--negative)]/20 bg-[var(--negative)]/10 text-xs text-[var(--negative)] flex items-center gap-2"
                >
                  <AlertCircle
                    className="w-4 h-4 shrink-0"
                    strokeWidth={1.75}
                  />

                  <span>
                    {otpError}
                  </span>
                </div>
              )}

              {/* Mobile */}

              <div>
                <label
                  htmlFor="aa-mobile"
                  className="block text-xs font-semibold text-muted-foreground mb-1.5"
                >
                  Registered Mobile Number
                </label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                    +91
                  </span>

                  <input
                    id="aa-mobile"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => {
                      const value =
                        e.target.value
                          .replace(
                            /\D/g,
                            ""
                          )
                          .slice(
                            0,
                            10
                          );

                      setMobileNumber(
                        value
                      );

                      setOtpError("");

                      if (
                        fieldErrors.mobile
                      ) {
                        setFieldErrors(
                          {}
                        );
                      }
                    }}
                    aria-invalid={
                      !!fieldErrors.mobile
                    }
                    aria-describedby={
                      fieldErrors.mobile
                        ? "mobile-error"
                        : undefined
                    }
                    className={`w-full h-10 pl-11 pr-3 bg-[var(--background-elevated)] border rounded-xl text-xs font-mono text-foreground outline-none transition-colors tabular-nums ${
                      fieldErrors.mobile
                        ? "border-[var(--negative)]"
                        : "border-border focus:border-primary/60"
                    }`}
                    placeholder="Enter 10-digit mobile number"
                    disabled={
                      otpLoading
                    }
                  />
                </div>

                {fieldErrors.mobile && (
                  <p
                    id="mobile-error"
                    role="alert"
                    className="mt-1 text-[11px] text-[var(--negative)]"
                  >
                    {
                      fieldErrors.mobile
                    }
                  </p>
                )}
              </div>

              {/* Consent explanation */}

              <div className="p-3 rounded-xl bg-[var(--background-elevated)] border border-border">
                <div className="flex gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />

                  <p className="text-[11px] leading-5 text-muted-foreground">
                    After continuing, you will be
                    redirected to the Account
                    Aggregator's secure consent
                    screen. You will choose the
                    accounts you want to connect
                    and approve data sharing there.
                  </p>
                </div>
              </div>

              {/* Provider */}

              <div className="pt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Building2
                    className="w-3.5 h-3.5 text-primary"
                    strokeWidth={1.75}
                  />

                  <span>
                    Powered by Setu Account Aggregator
                  </span>
                </div>

                <span className="text-[var(--positive)] font-medium font-mono text-[10px]">
                  Secure Connection
                </span>
              </div>

              {/* Button */}

              <Button
                onClick={
                  handleRequestOtp
                }
                disabled={
                  otpLoading ||
                  mobileNumber.length !==
                    10
                }
                className="w-full h-11 text-xs font-semibold gap-2 mt-2"
              >
                <span>
                  {otpLoading
                    ? "Connecting to Account Aggregator..."
                    : "Connect & Continue"}
                </span>

                <ArrowRight
                  className="w-4 h-4"
                  strokeWidth={1.75}
                />
              </Button>

              {aaConsentId && (
                <p className="text-center text-[10px] text-muted-foreground font-mono">
                  Consent session created
                </p>
              )}
            </div>
          )}

        {/* =================================================
            CAS
            ================================================= */}

        {!isSyncing &&
          activeTab === "CAS" && (
            <div className="mt-5 space-y-4">
              {/* Info */}

              <div className="p-3.5 rounded-xl border border-[var(--info)]/20 bg-[var(--info)]/10 flex items-start gap-3">
                <FileCheck2
                  className="w-5 h-5 text-[var(--info)] shrink-0 mt-0.5"
                  strokeWidth={1.75}
                />

                <div className="text-xs">
                  <p className="font-semibold text-[var(--info)]">
                    Smart CAS PDF Parser
                  </p>

                  <p className="text-muted-foreground mt-0.5 leading-relaxed">
                    Upload your password-protected
                    CAMS, KFintech, or consolidated
                    CAS PDF. The secure backend
                    decrypts and parses the statement.
                  </p>
                </div>
              </div>

              {/* Drop Zone */}

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() =>
                  setDragOver(false)
                }
                onDrop={handleDrop}
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  dragOver
                    ? "border-primary bg-primary/10"
                    : "border-border bg-[var(--background-elevated)] hover:border-primary/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={
                    handleFileInputChange
                  }
                />

                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-3">
                  <FileText
                    className="w-6 h-6"
                    strokeWidth={1.75}
                  />
                </div>

                <p className="text-xs font-semibold text-foreground break-all">
                  {casFile
                    ? casFile.name
                    : "Select your CAS PDF"}
                </p>

                <p className="text-[11px] text-muted-foreground mt-1">
                  Drag & drop your CAS PDF here
                  or click to browse
                </p>

                <span className="mt-2 text-[10px] text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md font-mono border border-primary/20">
                  CAMS / KFIN / CDSL PDF Supported
                </span>
              </div>

              {/* File information */}

              {casFile && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    File size:{" "}
                    {(
                      casFile.size /
                      (1024 * 1024)
                    ).toFixed(2)}{" "}
                    MB
                  </span>

                  <button
                    type="button"
                    className="text-[var(--negative)] hover:underline"
                    onClick={() => {
                      setCasFile(
                        null
                      );

                      setCasError("");

                      if (
                        fileInputRef.current
                      ) {
                        fileInputRef.current.value =
                          "";
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Error */}

              {casError && (
                <div
                  role="alert"
                  className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    casAuthRequired
                      ? "bg-primary/10 border-primary/30 text-foreground"
                      : "bg-[var(--negative)]/10 border-[var(--negative)]/20 text-[var(--negative)]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <AlertCircle
                      className={`w-4 h-4 shrink-0 ${
                        casAuthRequired
                          ? "text-primary"
                          : "text-[var(--negative)]"
                      }`}
                      strokeWidth={
                        1.75
                      }
                    />

                    <span className="font-medium">
                      {casError}
                    </span>
                  </div>

                  {casAuthRequired && (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Button
                        size="sm"
                        onClick={() => {
                          closeSyncModal();

                          const next =
                            typeof window !==
                            "undefined"
                              ? window.location
                                  .pathname
                              : "/dashboard";

                          router.push(
                            `/login?next=${encodeURIComponent(
                              next
                            )}`
                          );
                        }}
                        className="h-8 text-xs font-bold px-3 gap-1 shadow-sm"
                      >
                        <span>
                          Log In
                        </span>

                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>

                      <Link
                        href="/signup"
                        onClick={() =>
                          closeSyncModal()
                        }
                        className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1"
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Password */}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center justify-between">
                  <span>
                    CAS PDF Password
                  </span>

                  <span className="text-[10px] text-muted-foreground font-mono">
                    Usually PAN or DoB
                  </span>
                </label>

                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                    strokeWidth={1.75}
                  />

                  <input
                    type="password"
                    value={
                      casPassword
                    }
                    onChange={(e) =>
                      setCasPassword(
                        e.target.value
                      )
                    }
                    className="w-full h-10 pl-9 pr-3 bg-[var(--background-elevated)] border border-border rounded-xl text-xs font-mono text-foreground focus:border-primary/60 outline-none"
                    placeholder="e.g. ABCDE1234F or DDMMYYYY"
                    maxLength={512}
                  />
                </div>
              </div>

              {/* CAS Progress */}

              {casProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                    <span>
                      {casStep}
                    </span>

                    <span className="text-primary font-semibold">
                      {casProgress}%
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-[var(--background-elevated)] rounded-full overflow-hidden p-0.5 border border-border/70">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{
                        width: `${casProgress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* CAS Button */}

              <Button
                onClick={
                  handleStart
                }
                disabled={
                  !casFile ||
                  casProgress > 0
                }
                className="w-full h-11 text-xs font-semibold gap-2 mt-2"
              >
                <span>
                  Decrypt & Parse Statement Now
                </span>

                <ArrowRight
                  className="w-4 h-4"
                  strokeWidth={1.75}
                />
              </Button>
            </div>
          )}

        {/* =================================================
            SYNC PROGRESS
            ================================================= */}

        {isSyncing && (
          <div className="py-8 px-4 text-center space-y-6 animate-in fade-in duration-300">
            <div className="relative mx-auto w-20 h-20">
              {syncProgress <
              100 ? (
                <>
                  <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />

                  <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw
                      className="w-7 h-7 text-primary animate-pulse"
                    />
                  </div>
                </>
              ) : (
                <div className="w-20 h-20 rounded-full bg-[var(--positive-soft)] border-2 border-[var(--positive)]/40 flex items-center justify-center">
                  <CheckCircle2
                    className="w-10 h-10 text-[var(--positive)]"
                    strokeWidth={1.75}
                  />
                </div>
              )}
            </div>

            <div>
              <h3 className="text-base font-semibold text-foreground">
                {syncProgress <
                100
                  ? "Syncing Portfolio Assets..."
                  : "Diagnostic Generation Complete!"}
              </h3>

              <p className="text-xs text-primary font-medium mt-1 font-mono">
                {syncStep}
              </p>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                <span>
                  Sync Progress
                </span>

                <span className="text-primary font-semibold tabular-nums">
                  {syncProgress}%
                </span>
              </div>

              <div className="w-full h-2.5 bg-[var(--background-elevated)] rounded-full overflow-hidden p-0.5 border border-border/70">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{
                    width: `${syncProgress}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 max-w-sm mx-auto text-[10px] text-muted-foreground font-medium">
              <span
                className={
                  syncProgress >=
                  25
                    ? "text-[var(--positive)]"
                    : ""
                }
              >
                ✓ AA Sync
              </span>

              <span
                className={
                  syncProgress >=
                  50
                    ? "text-[var(--positive)]"
                    : ""
                }
              >
                ✓ Stocks
              </span>

              <span
                className={
                  syncProgress >=
                  75
                    ? "text-[var(--positive)]"
                    : ""
                }
              >
                ✓ Mutual Funds
              </span>

              <span
                className={
                  syncProgress >=
                  100
                    ? "text-[var(--positive)]"
                    : ""
                }
              >
                ✓ AMFI X-Ray
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
