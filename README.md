# Portfolio X-Ray

Portfolio X-Ray is a Next.js and FastAPI foundation for authenticated portfolio records. CAS parsing and portfolio analytics are intentionally deferred.

## Architecture

`Next.js (Better Auth) → authenticated server proxy → FastAPI → SQLAlchemy → Supabase PostgreSQL`

The browser only talks to Next.js. The proxy validates the Better Auth session, then signs its FastAPI request using `INTERNAL_API_SECRET`. FastAPI rejects requests with missing, invalid, or expired signatures. A raw browser `user_id` is never trusted.

## Setup

1. Copy `backend/.env.example` to `backend/.env`, and `frontend/.env.local.example` to `frontend/.env.local`.
2. Set both `DATABASE_URL` values to the Supabase PostgreSQL connection string and set the same long random `INTERNAL_API_SECRET` in both files. Set an independent `BETTER_AUTH_SECRET` in the frontend file.
3. Create Better Auth's required `user`, `session`, `account`, and `verification` tables from `frontend/`:

   ```powershell
   npx auth@latest migrate
   ```

4. Apply the Portfolio X-Ray tables from `backend/`:

   ```powershell
   .\venv\Scripts\Activate.ps1
   alembic upgrade head
   ```

5. Run FastAPI from `backend/`:

   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```

6. Run Next.js from `frontend/`:

   ```powershell
   npm run dev
   ```

Open `http://localhost:3000/signup`, then create a portfolio from `/dashboard`. FastAPI documentation is at `http://localhost:8000/docs`.

## Tests

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest -q
```

See [architecture.md](docs/architecture.md) and [api-contract.md](docs/api-contract.md).
