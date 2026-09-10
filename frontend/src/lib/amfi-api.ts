export interface AMFISyncRecord {
  id: string;
  sync_type: string;
  status: string;
  records_synced: number;
  metadata_info?: Record<string, unknown> | null;
  error_message?: string | null;
  created_at: string;
}

export interface AMFIStatusResponse {
  latest_statement_date: string | null;
  last_ingestion_time: string | null;
  schemes_count: number;
  holdings_count: number;
  database_status: string;
  recent_syncs: AMFISyncRecord[];
}

export interface AMFIPreviewResponse {
  filename: string;
  filesize_bytes: number;
  checksum: string;
  schemes_detected: number;
  holdings_detected: number;
  as_of_date: string | null;
  is_duplicate: boolean;
  duplicate_reason: string | null;
  sample_schemes: string[];
}

export interface AMFIImportResponse {
  status: string;
  message: string;
  schemes_imported: number;
  holdings_imported: number;
  rows_skipped: number;
  errors_warnings: string[];
  statement_date: string | null;
  ingestion_timestamp: string;
}

export async function fetchAmfiStatus(): Promise<AMFIStatusResponse> {
  const res = await fetch("/api/admin/amfi/status", {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error?.message || "Failed to fetch AMFI status");
  }

  return res.json();
}

export async function previewAmfiFile(file: File): Promise<AMFIPreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/admin/amfi/preview", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error?.message || "Failed to analyze AMFI Excel file");
  }

  return res.json();
}

export async function importAmfiFile(file: File): Promise<AMFIImportResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/admin/amfi/import", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error?.message || "Failed to import AMFI Excel file");
  }

  return res.json();
}
