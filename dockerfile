FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY deploy-data/ /app/deploy-data/
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

RUN mkdir -p /app/data/tenants

ENV DATABASE_URL=sqlite:////app/data/master.db
ENV TENANT_DB_DIR=/app/data/tenants

EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
