# Build context = racine du monorepo (voir docker-compose.yml).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY libs/common /libs/common
RUN pip install --no-cache-dir /libs/common

COPY services/progression-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/progression-service/app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
