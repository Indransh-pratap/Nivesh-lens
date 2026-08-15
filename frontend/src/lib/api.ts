export type Portfolio = { id: string; name: string; total_value: number; created_at: string; updated_at: string };

type ApiError = { error?: { message?: string } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/portfolio${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(body.error?.message ?? "Unable to complete the request");
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

export const getPortfolios = () => request<Portfolio[]>("/portfolios");
export const createPortfolio = (name: string) => request<Portfolio>("/portfolios", { method: "POST", body: JSON.stringify({ name }) });
export const getPortfolio = (id: string) => request<Portfolio>(`/portfolios/${id}`);
export const deletePortfolio = (id: string) => request<void>(`/portfolios/${id}`, { method: "DELETE" });
