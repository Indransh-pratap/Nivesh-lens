"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


export default function AACallbackPage() {
  const router = useRouter();

  const [message, setMessage] = useState(
    "Checking your Account Aggregator connection..."
  );

  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const checkConsent = async () => {
      try {
        const consentId =
          sessionStorage.getItem("aa_consent_id");

        if (!consentId) {
          throw new Error(
            "Account Aggregator session not found."
          );
        }

        setMessage(
          "Verifying your consent..."
        );

        const response = await fetch(
          `/api/portfolio/aa/consent/${consentId}`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          const detail =
            typeof data?.detail === "object"
              ? data.detail
              : null;

          throw new Error(
            detail?.message ||
              data?.detail ||
              "Unable to check consent status."
          );
        }

        if (cancelled) return;

        const status = String(
          data?.status || ""
        ).toUpperCase();

        console.log(
          "AA consent status:",
          status
        );

        if (
          status === "ACTIVE" ||
          status === "APPROVED"
        ) {
          setMessage(
            "Consent approved. Preparing your portfolio..."
          );

          const sessionResponse =
            await fetch(
              `/api/portfolio/aa/consent/${consentId}/data-session`,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                credentials: "include",
              }
            );

          const sessionData =
            await sessionResponse.json();

          if (!sessionResponse.ok) {
            const detail =
              typeof sessionData?.detail ===
              "object"
                ? sessionData.detail
                : null;

            throw new Error(
              detail?.message ||
                sessionData?.detail ||
                "Unable to create data session."
            );
          }

          if (sessionData?.session_id) {
            sessionStorage.setItem(
              "aa_data_session_id",
              sessionData.session_id
            );
          }

          setMessage("Data session created. Waiting for your bank to prepare financial information...");
          const sessionId = sessionData?.session_id;
          for (let attempt = 0; attempt < 12; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 2500));
            const poll = await fetch(`/api/portfolio/aa/sessions/${sessionId}/poll`, { method: "POST", credentials: "include" });
            const polled = await poll.json().catch(() => null);
            if (!poll.ok) throw new Error(polled?.detail || "Unable to fetch financial information.");
            const syncStatus = String(polled?.status || "PENDING").toUpperCase();
            if (syncStatus === "COMPLETED" || syncStatus === "PARTIAL") {
              setMessage("Financial information saved securely. Redirecting to your dashboard...");
              router.replace("/dashboard?aa_sync=completed");
              return;
            }
            if (syncStatus === "FAILED" || syncStatus === "EXPIRED") throw new Error(polled?.error || "The bank data session did not complete.");
            setMessage(`Waiting for bank data (${syncStatus.toLowerCase()})...`);
          }
          setMessage("Bank data is still pending. You can return to the dashboard and retry shortly.");

          return;
        }

        if (status === "REJECTED") {
          throw new Error(
            "You rejected the Account Aggregator consent."
          );
        }

        if (status === "REVOKED") {
          throw new Error(
            "The Account Aggregator consent was revoked."
          );
        }

        if (status === "EXPIRED") {
          throw new Error(
            "The Account Aggregator consent has expired."
          );
        }

        setMessage(
          `Consent status: ${status || "PENDING"}`
        );
      } catch (err) {
        console.error(
          "AA callback error:",
          err
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to complete portfolio connection."
          );
        }
      }
    };

    checkConsent();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-[var(--card)] p-8 text-center shadow-xl">

        {error ? (
          <>
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--negative)]/10 text-[var(--negative)] text-xl font-bold">
              !
            </div>

            <h1 className="text-lg font-semibold text-foreground">
              Connection Failed
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                router.replace("/dashboard")
              }
              className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white"
            >
              Back to Dashboard
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />

            <h1 className="text-lg font-semibold text-foreground">
              Connecting Portfolio
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {message}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
