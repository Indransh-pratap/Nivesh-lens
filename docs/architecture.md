# Architecture

## Request path

```text
Browser → Next.js Better Auth session → Next.js portfolio Route Handler
       → signed internal request → FastAPI → SQLAlchemy → Supabase PostgreSQL
```

Better Auth owns identity and its required authentication tables. Portfolio X-Ray does not duplicate a user table; `portfolios.user_id` stores the Better Auth user ID.

The signed request contains the Better Auth user ID, HTTP method, FastAPI path, timestamp, and raw request body. FastAPI verifies the HMAC with the server-only `INTERNAL_API_SECRET` and rejects timestamps older than five minutes. `FASTAPI_URL`, `DATABASE_URL`, Better Auth secrets, and the shared secret are server-side environment variables; they are never bundled into browser code.

## Database ownership

- Better Auth migrations create authentication tables.
- Alembic owns the `portfolios`, `holdings`, `transactions`, and `import_records` tables.
- `Portfolio` owns holdings, transactions, and import records through cascading foreign keys.

No startup table creation is used in the application.

## Account Aggregator bank data

AA consent, data-session, bank-account and bank-transaction records are user-scoped tables managed by Alembic. They are intentionally separate from CAS portfolios, holdings and investment transactions. The browser calls `/api/portfolio/aa/*`; the existing Next.js route handler validates the Better Auth session and signs the internal request before FastAPI may access AA data.

Setu data sessions remain `PENDING` until Setu reports `PARTIAL` or `COMPLETED`. Only then is decrypted JSON FI data normalised and written in one database transaction. `bank_transactions` is unique on account plus Setu transaction identifier (or a deterministic fallback fingerprint), so safe retries do not duplicate records.
