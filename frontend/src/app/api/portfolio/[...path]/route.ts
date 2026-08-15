import { createHmac } from "crypto";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const fastApiUrl = process.env.FASTAPI_URL ?? "http://localhost:8000";
const sharedSecret = process.env.INTERNAL_API_SECRET;

async function proxy(request: NextRequest, context: RouteContext<"/api/portfolio/[...path]">) {
  if (!sharedSecret) {
    return NextResponse.json({ error: { code: "CONFIGURATION_ERROR", message: "Server authentication bridge is not configured" } }, { status: 500 });
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
  }
  const { path } = await context.params;
  if (path[0] !== "portfolios") {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Endpoint not found" } }, { status: 404 });
  }
  const backendPath = `/api/${path.join("/")}`;
  const body = request.method === "GET" || request.method === "DELETE" ? Buffer.alloc(0) : Buffer.from(await request.arrayBuffer());
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", sharedSecret)
    .update(Buffer.concat([Buffer.from(`${timestamp}.${request.method}.${backendPath}.${session.user.id}.`), body]))
    .digest("hex");
  const response = await fetch(`${fastApiUrl}${backendPath}`, {
    method: request.method,
    headers: { "Content-Type": "application/json", "X-Portfolio-User-ID": session.user.id, "X-Portfolio-Timestamp": timestamp, "X-Portfolio-Signature": signature },
    body: body.length ? body : undefined,
    cache: "no-store",
  });
  const responseBody = await response.arrayBuffer();
  return new NextResponse(responseBody, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" } });
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
