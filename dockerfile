FROM python:3.11-slim

# Dépendances système (nécessaires pour certains packages Python comme cryptography)
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copie les requirements en premier pour profiter du cache Docker
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copie tout le code du backend
COPY backend/ .

# Lance le serveur avec Uvicorn
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]