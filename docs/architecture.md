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
