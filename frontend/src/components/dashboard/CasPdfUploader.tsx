"use client";

import React, {
  useCallback,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileCheck2,
  FileText,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useToastStore } from "@/store/toastStore";
import { usePortfolioStore } from "@/store/portfolioStore";
import { authClient } from "@/lib/auth-client";
import type { Holding } from "@/types";

export interface CasPdfUploaderProps {
  onSuccess?: (parsedHoldingsCount: number) => void;
  className?: string;
  hideHeader?: boolean;
}

type ApiError = {
  code?: string;
  message?: string;
};

type CasResponse = {
  portfolio_id?: string;
  portfolioId?: string;

  holdings_count?: number;
  holdingsCount?: number;

  transactions_count?: number;
  transactionsCount?: number;

  holdings?: unknown[];
  transactions?: unknown[];

  data?: {
    holdings?: unknown[];
    holdings_count?: number;
    holdingsCount?: number;
    transactions_count?: number;
    transactionsCount?: number;
    transactions?: unknown[];
  };

  result?: {
    holdings?: unknown[];
    holdings_count?: number;
    holdingsCount?: number;
    transactions_count?: number;
    transactionsCount?: number;
    transactions?: unknown[];
  };

  import?: {
    holdings?: unknown[];
    holdings_count?: number;
    holdingsCount?: number;
    transactions_count?: number;
    transactionsCount?: number;
  };

  error?: ApiError;

  detail?: ApiError | string;
};

function numberValue(
  value: unknown
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string"
  ) {
    const parsed = Number(
      value.replace(/,/g, "").trim()
    );

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  return 0;
}

function firstNumber(
  ...values: unknown[]
): number {
  for (const value of values) {
    const parsed =
      numberValue(value);

    if (parsed > 0) {
      return parsed;
    }
  }

  return 0;
}

function normalizeHolding(
  raw: unknown,
  index: number
): Holding | null {
  if (
    !raw ||
    typeof raw !== "object"
  ) {
    return null;
  }

  const item =
    raw as Record<string, unknown>;

  const currentValue =
    firstNumber(
      item.currentValue,
      item.current_value,
      item.value,
      item.marketValue,
      item.market_value
    );

  if (currentValue <= 0) {
    return null;
  }

  const name = String(
    item.name ??
      item.companyName ??
      item.company_name ??
      item.schemeName ??
      item.scheme_name ??
      "Imported Holding"
  ).trim();

  const isin =
    item.isin == null
      ? undefined
      : String(item.isin).trim();

  const units =
    firstNumber(
      item.units,
      item.quantity,
      item.currentBal,
      item.current_bal,
      item.balance
    );

  const currentPrice =
    firstNumber(
      item.currentPrice,
      item.current_price,
      item.marketPrice,
      item.market_price,
      item.nav,
      item.NAV,
      item.price
    );

  const averageCost =
    firstNumber(
      item.averageCost,
      item.average_cost,
      item.avgCost,
      item.avg_cost
    );

  const returns =
    firstNumber(
      item.returns,
      item.returnPercent,
      item.return_percent
    );

  const returnsValue =
    firstNumber(
      item.returnsValue,
      item.returns_value,
      item.gain,
      item.gainValue,
      item.gain_value
    );

  const ticker =
    item.ticker == null
      ? isin?.slice(0, 6) ??
        `CAS_${index + 1}`
      : String(item.ticker);

  const expenseRatio =
    firstNumber(
      item.expenseRatio,
      item.expense_ratio
    );

  const planType =
    item.planType === "Regular" ||
    item.plan_type === "Regular"
      ? "Regular"
      : "Direct";

  const riskGrade =
    item.riskGrade === "High" ||
    item.risk_grade === "High"
      ? "High"
      : item.riskGrade === "Medium" ||
          item.risk_grade === "Medium"
        ? "Medium"
        : "Low";

  const assetClass =
    item.assetClass == null
      ? item.asset_class == null
        ? "Equity"
        : String(item.asset_class)
      : String(item.assetClass);

  const underlyingHoldings =
    Array.isArray(item.underlyingHoldings)
      ? item.underlyingHoldings
      : Array.isArray(item.underlying_holdings)
        ? item.underlying_holdings
        : undefined;

  const rawAssetType = String(
    item.asset_type ?? item.assetType ?? ""
  ).toUpperCase();

  const isMF =
    rawAssetType.includes("MUTUAL") ||
    rawAssetType === "MUTUAL_FUND" ||
    name.toLowerCase().includes("fund") ||
    name.toLowerCase().includes("growth") ||
    name.toLowerCase().includes("direct plan");
  const isStock =
    rawAssetType.includes("STOCK") ||
    rawAssetType.includes("EQUITY") ||
    rawAssetType === "STOCK";
  const type: Holding["type"] = isMF ? "Mutual Fund" : isStock ? "Stock" : "Mutual Fund";

  return {
    ...(item as Partial<Holding>),

    id:
      item.id == null
        ? `cas_${Date.now()}_${index}`
        : String(item.id),

    name,
    type,
    ticker,
    isin,

    units,
    quantity: units,

    averageCost,
    avgPrice: averageCost,

    currentValue,
    currentPrice,

    returns,
    returnsValue,

    planType,
    expenseRatio,
    riskGrade,
    assetClass,

    sector: isMF ? "Diversified MF" : "Equity",
    nomineeStatus: "Verified",
    allocation: 0,

    underlyingHoldings:
      underlyingHoldings as Holding["underlyingHoldings"],
  } as Holding;
}

function getImportedHoldings(
  payload: CasResponse
): Holding[] {
  const candidates: unknown[][] = [
    Array.isArray(payload.holdings)
      ? payload.holdings
      : [],

    Array.isArray(
      payload.data?.holdings
    )
      ? payload.data!.holdings!
      : [],

    Array.isArray(
      payload.result?.holdings
    )
      ? payload.result!.holdings!
      : [],

    Array.isArray(
      payload.import?.holdings
    )
      ? payload.import!.holdings!
      : [],
  ];

  const source =
    candidates.find(
      (items) => items.length > 0
    ) ?? [];

  const list = source
    .map((item, index) =>
      normalizeHolding(
        item,
        index
      )
    )
    .filter(
      (
        item
      ): item is Holding =>
        item !== null
    );

  const totalVal = list.reduce((sum, h) => sum + h.currentValue, 0);
  return list.map((h) => ({
    ...h,
    allocation: totalVal > 0 ? (h.currentValue / totalVal) * 100 : 0,
  }));
}

function getHoldingsCount(
  payload: CasResponse
): number {
  return firstNumber(
    payload.holdings_count,
    payload.holdingsCount,

    payload.data
      ?.holdings_count,

    payload.data
      ?.holdingsCount,

    payload.result
      ?.holdings_count,

    payload.result
      ?.holdingsCount,

    payload.import
      ?.holdings_count,

    payload.import
      ?.holdingsCount
  );
}

function getTransactionsCount(
  payload: CasResponse
): number {
  return firstNumber(
    payload.transactions_count,
    payload.transactionsCount,

    payload.data
      ?.transactions_count,

    payload.data
      ?.transactionsCount,

    payload.result
      ?.transactions_count,

    payload.result
      ?.transactionsCount,

    payload.import
      ?.transactions_count,

    payload.import
      ?.transactionsCount
  );
}

function getErrorMessage(
  payload: CasResponse
): string | null {
  if (
    payload.error?.message
  ) {
    return payload.error.message;
  }

  if (
    typeof payload.detail ===
    "string"
  ) {
    return payload.detail;
  }

  if (
    payload.detail &&
    typeof payload.detail ===
      "object"
  ) {
    return (
      payload.detail.message ??
      null
    );
  }

  return null;
}

export function CasPdfUploader({
  onSuccess,
  className = "",
  hideHeader = false,
}: CasPdfUploaderProps) {
  const router =
    useRouter();

  const {
    data: session,
  } =
    authClient.useSession();

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [file, setFile] =
    useState<File | null>(
      null
    );

  const [password, setPassword] =
    useState("");

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    progressPercent,
    setProgressPercent,
  ] = useState(0);

  const [
    processStep,
    setProcessStep,
  ] = useState("");

  const [
    isSuccess,
    setIsSuccess,
  ] = useState(false);

  const [
    errorMsg,
    setErrorMsg,
  ] = useState("");

  const [
    authRequired,
    setAuthRequired,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState<{
    holdingsCount: number;
    transactionsCount: number;
  } | null>(null);

  const [
    dragActive,
    setDragActive,
  ] = useState(false);

  const resetNativeInput =
    useCallback(() => {
      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    }, []);

  const selectFile =
    useCallback(
      (selectedFile: File) => {
        if (
          !selectedFile.name
            .toLowerCase()
            .endsWith(".pdf")
        ) {
          setErrorMsg(
            "Please upload a valid PDF file."
          );
          return;
        }

        setFile(
          selectedFile
        );

        setPassword("");
        setErrorMsg("");
        setAuthRequired(false);
        setIsSuccess(false);
        setResult(null);
        setProgressPercent(0);
        setProcessStep("");

        resetNativeInput();
      },
      [resetNativeInput]
    );

  const handleFileChange =
    useCallback(
      (
        event: React.ChangeEvent<HTMLInputElement>
      ) => {
        const selectedFile =
          event.target.files?.[0];

        if (
          selectedFile
        ) {
          selectFile(
            selectedFile
          );
        }

        event.target.value =
          "";
      },
      [selectFile]
    );

  const handleDrag =
    useCallback(
      (
        event: React.DragEvent<HTMLDivElement>
      ) => {
        event.preventDefault();
        event.stopPropagation();

        if (
          event.type ===
            "dragenter" ||
          event.type ===
            "dragover"
        ) {
          setDragActive(true);
        } else {
          setDragActive(false);
        }
      },
      []
    );

  const handleDrop =
    useCallback(
      (
        event: React.DragEvent<HTMLDivElement>
      ) => {
        event.preventDefault();
        event.stopPropagation();

        setDragActive(false);

        const droppedFile =
          event.dataTransfer
            .files?.[0];

        if (
          droppedFile
        ) {
          selectFile(
            droppedFile
          );
        }
      },
      [selectFile]
    );

  const handleReset =
    useCallback(() => {
      setFile(null);
      setPassword("");
      setErrorMsg("");
      setAuthRequired(false);
      setIsSuccess(false);
      setResult(null);
      setProgressPercent(0);
      setProcessStep("");
      setIsProcessing(false);

      resetNativeInput();
    }, [resetNativeInput]);

  const handleDecryptAndParse =
    useCallback(async () => {
      if (!file) {
        setErrorMsg(
          "Please select or drop your CAS PDF file."
        );
        return;
      }

      let currentUser =
        session?.user;

      if (!currentUser) {
        try {
          const currentSession =
            await authClient.getSession();

          currentUser =
            currentSession
              .data?.user;
        } catch {
          currentUser =
            undefined;
        }
      }

      if (!currentUser) {
        setAuthRequired(true);
        setErrorMsg(
          "Please log in to import your portfolio."
        );
        return;
      }

      setAuthRequired(false);
      setErrorMsg("");
      setIsProcessing(true);
      setProgressPercent(15);
      setProcessStep(
        "Uploading and decrypting your CAS securely..."
      );

      try {
        const form =
          new FormData();

        form.append(
          "file",
          file
        );

        form.append(
          "password",
          password
        );

        const response =
          await fetch(
            "/api/portfolio/imports/cas",
            {
              method: "POST",
              body: form,
              credentials: "include",
            }
          );

        const rawText =
          await response.text();

        let payload: CasResponse =
          {};

        if (
          rawText.trim()
        ) {
          try {
            payload =
              JSON.parse(
                rawText
              ) as CasResponse;
          } catch {
            throw new Error(
              "Server returned an invalid response."
            );
          }
        }

        if (
          response.status ===
          401
        ) {
          setAuthRequired(
            true
          );

          throw new Error(
            "Please log in to import your portfolio."
          );
        }

        if (
          response.status ===
          403
        ) {
          throw new Error(
            "You don't have permission to import this portfolio."
          );
        }

        if (
          !response.ok
        ) {
          const code =
            payload.error
              ?.code ??
            (
              typeof payload.detail ===
              "object"
                ? payload.detail
                    ?.code
                : undefined
            );

          if (
            code ===
            "WRONG_PASSWORD"
          ) {
            throw new Error(
              "Could not decrypt the CAS PDF. Please check the password."
            );
          }

          if (
            code ===
            "EMPTY_CAS"
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
            code ===
            "INVALID_PDF"
          ) {
            throw new Error(
              "Please upload a valid CAS PDF."
            );
          }

          throw new Error(
            getErrorMessage(
              payload
            ) ??
              "Unable to parse this CAS statement."
          );
        }

        setProgressPercent(
          70
        );

        setProcessStep(
          "Updating your portfolio..."
        );

        const importedHoldings =
          getImportedHoldings(
            payload
          );

        const backendHoldingsCount =
          getHoldingsCount(
            payload
          );

        const transactionsCount =
          getTransactionsCount(
            payload
          );

        const holdingsCount =
          importedHoldings.length >
          0
            ? importedHoldings.length
            : backendHoldingsCount;

        console.log(
          "CAS import response:",
          payload
        );

        console.log(
          "CAS imported holdings:",
          importedHoldings
        );

        /*
         * Successful HTTP 200 with no holdings is not silently
         * treated as a successful portfolio import.
         */
        if (
          holdingsCount <= 0
        ) {
          throw new Error(
            "CAS import completed, but no investment holdings were returned by the server."
          );
        }

        /*
         * Update Zustand with REAL imported data.
         */
        if (
          importedHoldings.length >
          0
        ) {
          usePortfolioStore
            .getState()
            .clearPortfolioData();
          usePortfolioStore
            .getState()
            .setHoldings(
              importedHoldings
            );
        } else {
          /*
           * The backend may return only counts.
           * In that case do not overwrite the store with mock data.
           * The API response needs to contain holdings for client-side
           * state to update.
           */
          console.warn(
            "CAS backend returned holdings_count but no holdings array.",
            payload
          );
        }

        const returnedPortfolioId =
          payload.portfolio_id ?? payload.portfolioId;
        if (
          returnedPortfolioId &&
          typeof window !== "undefined"
        ) {
          localStorage.setItem(
            "nivesh_active_portfolio_id",
            returnedPortfolioId
          );
          window.dispatchEvent(
            new CustomEvent("nivesh_portfolio_updated", {
              detail: { portfolioId: returnedPortfolioId },
            })
          );
        }

        setProgressPercent(
          100
        );

        setProcessStep(
          "CAS parsed and portfolio updated."
        );

        setResult({
          holdingsCount,
          transactionsCount,
        });

        setIsSuccess(true);

        useToastStore
          .getState()
          .addToast({
            variant:
              "success",
            title:
              "CAS statement parsed",
            description:
              `${holdingsCount} holdings and ${transactionsCount} transactions imported.`,
          });

        onSuccess?.(
          holdingsCount
        );
      } catch (error) {
        setProgressPercent(
          0
        );

        setProcessStep("");

        setErrorMsg(
          error instanceof
            Error
            ? error.message
            : "Unable to parse this CAS statement."
        );
      } finally {
        setIsProcessing(
          false
        );
      }
    }, [
      file,
      onSuccess,
      password,
      session?.user,
    ]);

  return (
    <div
      className={`rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground ${className}`}
    >
      {!hideHeader && (
        <div className="flex items-center justify-between gap-3 pb-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <FileText
                className="w-5 h-5"
                strokeWidth={1.75}
              />
            </div>

            <div>
              <h3 className="text-base font-bold">
                Smart CAS PDF Parser
              </h3>

              <p className="text-xs text-muted-foreground">
                CAMS · KFintech · CDSL · NSDL
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--positive)]/20 bg-[var(--positive)]/10 text-[var(--positive)] text-xs font-semibold">
            <ShieldCheck
              className="w-4 h-4"
              strokeWidth={1.75}
            />

            <span>
              Secure Import
            </span>
          </div>
        </div>
      )}

      {isSuccess ? (
        <div className="mt-6 p-6 rounded-2xl bg-[var(--positive)]/10 border border-[var(--positive)]/20 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--positive)]/20 text-[var(--positive)] flex items-center justify-center mx-auto">
            <CheckCircle2
              className="w-6 h-6"
              strokeWidth={1.75}
            />
          </div>

          <div>
            <h4 className="text-base font-bold">
              CAS PDF Successfully Parsed
            </h4>

            <p className="text-xs text-muted-foreground mt-1">
              Extracted{" "}
              <strong className="text-foreground">
                {result?.holdingsCount ??
                  0} holdings
              </strong>{" "}
              and{" "}
              <strong className="text-foreground">
                {result?.transactionsCount ??
                  0} transactions
              </strong>
              .
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={
                handleReset
              }
              className="text-xs"
            >
              Upload Another
            </Button>

            <Button
              size="sm"
              onClick={() =>
                router.push(
                  "/holdings"
                )
              }
              className="text-xs font-bold gap-1.5"
            >
              View Holdings
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <input
            ref={
              fileInputRef
            }
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={
              handleFileChange
            }
          />

          <div
            onDragEnter={
              handleDrag
            }
            onDragOver={
              handleDrag
            }
            onDragLeave={
              handleDrag
            }
            onDrop={
              handleDrop
            }
            onClick={() => {
              if (
                !file &&
                !isProcessing
              ) {
                fileInputRef.current?.click();
              }
            }}
            className={`p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all ${
              dragActive
                ? "border-primary bg-primary/10"
                : file
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:border-primary/40 cursor-pointer"
            }`}
          >
            {file ? (
              <div className="w-full flex items-center justify-between gap-3 p-4 rounded-xl bg-[var(--background-elevated)] border border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileCheck2
                      className="w-5 h-5"
                      strokeWidth={1.75}
                    />
                  </div>

                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold truncate">
                      {file.name}
                    </p>

                    <p className="text-[10px] text-muted-foreground">
                      {(file.size / 1024).toFixed(
                        1
                      )}{" "}
                      KB · PDF
                    </p>
                  </div>
                </div>

                <IconButton
                  variant="danger"
                  size="sm"
                  title="Remove file"
                  aria-label="Remove file"
                  disabled={
                    isProcessing
                  }
                  onClick={(
                    event
                  ) => {
                    event.stopPropagation();
                    handleReset();
                  }}
                >
                  <X className="w-4 h-4" />
                </IconButton>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <UploadCloud
                    className="w-6 h-6"
                    strokeWidth={1.75}
                  />
                </div>

                <p className="text-sm font-bold">
                  Drag and drop your CAS PDF
                </p>

                <p className="text-xs text-muted-foreground">
                  or click to browse
                </p>

                <div className="flex justify-center gap-2">
                  {[
                    "CAMS",
                    "KFintech",
                    "CDSL",
                    "NSDL",
                  ].map(
                    (item) => (
                      <span
                        key={item}
                        className="text-[10px] font-mono px-2 py-1 rounded-md bg-accent border border-border"
                      >
                        {item}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              <span className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock
                    className="w-3.5 h-3.5 text-primary"
                    strokeWidth={1.75}
                  />
                  CAS PDF Password
                </span>

                <span className="text-[10px] font-mono">
                  Usually PAN / DoB
                </span>
              </span>
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              disabled={
                isProcessing
              }
              placeholder="e.g. ABCDE1234F or DDMMYYYY"
              className="w-full h-10 px-3 rounded-xl border border-border bg-[var(--background-elevated)] text-xs font-mono outline-none focus:border-primary"
            />
          </div>

          <Button
            onClick={
              handleDecryptAndParse
            }
            disabled={
              !file ||
              isProcessing
            }
            className="w-full h-11 text-xs font-bold gap-2"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing CAS…
              </>
            ) : (
              <>
                Decrypt & Parse Statement
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          {isProcessing && (
            <div className="p-4 rounded-xl border border-border bg-[var(--background-elevated)] space-y-2">
              <div className="flex justify-between gap-3">
                <span className="text-xs font-semibold">
                  {processStep}
                </span>

                <span className="text-xs font-mono text-primary">
                  {progressPercent}%
                </span>
              </div>

              <div className="w-full h-2 bg-[var(--background)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-2.5 text-xs ${
                authRequired
                  ? "bg-primary/10 border-primary/30"
                  : "bg-[var(--negative)]/10 border-[var(--negative)]/20 text-[var(--negative)]"
              }`}
            >
              <AlertCircle
                className="w-4 h-4 shrink-0 mt-0.5"
                strokeWidth={1.75}
              />

              <div className="flex-1">
                <p>
                  {errorMsg}
                </p>

                {authRequired && (
                  <div className="flex items-center gap-3 mt-3">
                    <Button
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/login?next=${encodeURIComponent(
                            typeof window !==
                              "undefined"
                              ? window.location.pathname
                              : "/dashboard"
                          )}`
                        )
                      }
                      className="h-8 text-xs gap-1"
                    >
                      Log In
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>

                    <Link
                      href="/signup"
                      className="text-xs font-semibold text-primary"
                    >
                      Create account
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <KeyRound
                className="w-3.5 h-3.5 text-primary"
                strokeWidth={1.75}
              />
              Password is never stored.
            </span>

            <span className="text-[var(--positive)] font-mono">
              Secure Import
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default CasPdfUploader;