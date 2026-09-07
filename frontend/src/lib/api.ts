export type Portfolio = { id: string; name: string; total_value: number; created_at: string; updated_at: string };

type ApiError = { error?: { message?: string } };

/** Thrown specifically for an expired/invalid session (401), so callers can
 *  distinguish "please log in again" from an ordinary request failure. */
export class SessionExpiredError extends Error {
  constructor() {
    super("Your session has expired. Please log in again.");
    this.name = "SessionExpiredError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isGet = !init?.method || init.method.toUpperCase() === "GET";
  const response = await fetch(`/api/portfolio${path}`, {
    ...init,
    cache: isGet ? "no-store" : init?.cache,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = `/login?reason=session_expired&next=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new SessionExpiredError();
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(body.error?.message ?? "Unable to complete the request");
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

import type { CompanyExposureResponse, LookThroughResponse, DiagnosticsResponse } from "@/types";

export const getPortfolios = () => request<Portfolio[]>("/portfolios");
export const createPortfolio = (name: string) => request<Portfolio>("/portfolios", { method: "POST", body: JSON.stringify({ name }) });
export const getPortfolio = (id: string) => request<Portfolio>(`/portfolios/${id}`);
export const deletePortfolio = (id: string) => request<void>(`/portfolios/${id}`, { method: "DELETE" });
export const getCompanyExposure = (id: string) => request<CompanyExposureResponse>(`/portfolios/${id}/company-exposure`);
export const getPortfolioLookThrough = (id: string) => request<LookThroughResponse>(`/portfolios/${id}/lookthrough`);
export const getDiagnostics = (id: string) => request<DiagnosticsResponse>(`/portfolios/${id}/diagnostics`);

export interface GroupExposureItem {
  group_name: string;
  exposure_value: number;
  exposure_percentage: number;
}

export interface GroupExposureResponse {
  groups: GroupExposureItem[];
  unmapped_percentage: number;
  total_value: number;
}

export const getGroupExposure = (id: string) => request<GroupExposureResponse>(`/portfolios/${id}/group-exposure`);
