import { betterAuth } from "better-auth";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";

export const auth = betterAuth({
  database: new Pool({ connectionString: databaseUrl }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || "nivesh-lens-secret-key-1234567890-secure",
  trustedOrigins: ["http://localhost:3000"],
  emailAndPassword: { enabled: true },
});
