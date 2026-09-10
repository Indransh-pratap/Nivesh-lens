FROM python:3.11-slim

WORKDIR /app

# Install build dependencies if needed for compiling packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Docker's JSON-form CMD does not expand $PORT.  Deployment platforms such as
# Railway inject PORT at runtime, so invoke a shell deliberately and fall back
# to 8000 for local Docker runs.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port \"${PORT:-8000}\""]
