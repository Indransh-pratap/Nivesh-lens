import { createHmac } from "crypto";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const fastApiUrl = (
  process.env.FASTAPI_URL?.replace(/\/+$/, "") ||
  (process.env.NODE_ENV === "production"
    ? "https://nivesh-lens-production.up.railway.app"
    : "http://localhost:8000")
).replace(/\/+$/, "");
const sharedSecret = process.env.INTERNAL_API_SECRET;

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!sharedSecret) {
    return NextResponse.json({ error: { code: "CONFIGURATION_ERROR", message: "Server authentication bridge is not configured" } }, { status: 500 });
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Please log in to import your portfolio." } }, { status: 401 });
  }
  const { path } = await context.params;
  const allowedPrefixes = ["portfolios", "imports", "cas"];
  if (!path || path.length === 0 || !allowedPrefixes.includes(path[0])) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Endpoint not found" } }, { status: 404 });
  }
  const backendPath = `/api/${path.join("/")}`;
  const body = request.method === "GET" || request.method === "DELETE" ? Buffer.alloc(0) : Buffer.from(await request.arrayBuffer());
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", sharedSecret)
    .update(Buffer.concat([Buffer.from(`${timestamp}.${request.method}.${backendPath}.${session.user.id}.`), body]))
    .digest("hex");

  const forwardHeaders: Record<string, string> = {
    "X-Portfolio-User-ID": session.user.id,
    "X-Portfolio-Timestamp": timestamp,
    "X-Portfolio-Signature": signature,
  };
  const incomingContentType = request.headers.get("content-type");
  if (incomingContentType) {
    forwardHeaders["Content-Type"] = incomingContentType;
  }

  try {
    const response = await fetch(`${fastApiUrl}${backendPath}`, {
      method: request.method,
      headers: forwardHeaders,
      body: body.length ? body : undefined,
      cache: "no-store",
    });
    const responseBody = await response.arrayBuffer();
    return new NextResponse(responseBody, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    console.error(`Failed to reach backend at ${fastApiUrl}${backendPath}:`, error);
    return NextResponse.json(
      {
        error: {
          code: "BACKEND_UNAVAILABLE",
          message: `Unable to connect to the backend service at ${fastApiUrl}. Please ensure the FastAPI server is running.`,
        },
      },
      { status: 503 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
