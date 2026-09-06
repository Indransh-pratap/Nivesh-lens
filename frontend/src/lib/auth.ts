import { betterAuth } from "better-auth";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

if (!betterAuthSecret) {
  throw new Error("BETTER_AUTH_SECRET is not configured");
}

// Debug: shows only the database host, never the password
try {
  const dbHost = new URL(databaseUrl).hostname;
  console.log("Better Auth DB HOST:", dbHost);
} catch {
  throw new Error("DATABASE_URL is invalid");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

pool.on("error", (error) => {
  console.error("Better Auth PostgreSQL pool error:", error);
});

export const auth = betterAuth({
  database: pool,

  baseURL:
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),

  secret: betterAuthSecret,

  trustedOrigins: async (request?: Request) => {
    const origins = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://nivesh-lens.vercel.app",
      "https://*.vercel.app",
      ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
      ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
      ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
    ];

    if (request) {
      const originHeader = request.headers.get("origin");
      const refererHeader = request.headers.get("referer");

      for (const candidate of [originHeader, refererHeader]) {
        if (!candidate) continue;
        try {
          const parsed = new URL(candidate);
          if (
            parsed.hostname.endsWith(".vercel.app") ||
            parsed.hostname === "localhost" ||
            parsed.hostname === "127.0.0.1" ||
            parsed.hostname.includes("railway.app")
          ) {
            origins.push(parsed.origin);
          }
        } catch {
          // ignore invalid urls
        }
      }
    }

    return origins;
  },

  emailAndPassword: {
    enabled: true,
  },
});