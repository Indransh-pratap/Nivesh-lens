import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

const { GET: betterAuthGET, POST: betterAuthPOST } = toNextJsHandler(auth);

async function handleGET(request: Request) {
  try {
    return await betterAuthGET(request);
  } catch (error) {
    console.error("Better Auth GET error:", error);
    return new Response(
      JSON.stringify({
        error: "auth_unavailable",
        message: "Authentication service is temporarily unavailable. Please try again.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function handlePOST(request: Request) {
  try {
    return await betterAuthPOST(request);
  } catch (error) {
    console.error("Better Auth POST error:", error);
    return new Response(
      JSON.stringify({
        error: "auth_unavailable",
        message: "Authentication service is temporarily unavailable. Please try again.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export { handleGET as GET, handlePOST as POST };
