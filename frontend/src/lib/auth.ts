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
    "http://localhost:3000",

  secret: betterAuthSecret,

  trustedOrigins: [
    "http://localhost:3000",
  ],

  emailAndPassword: {
    enabled: true,
  },
});