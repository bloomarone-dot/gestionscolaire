# Build context = racine du monorepo (voir infra/docker-compose.yml).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY libs/common /libs/common
RUN pip install --no-cache-dir /libs/common

COPY services/notifications-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/notifications-service/app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
