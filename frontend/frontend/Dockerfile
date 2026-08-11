FROM node:22-alpine AS build
WORKDIR /app
# Évite les échecs silencieux mémoire / registry sur petits VPS
ENV NODE_OPTIONS=--max-old-space-size=2048
COPY package.json package-lock.json ./

# Installation souple pour éviter les blocages de dépendances/lockfile
RUN npm install --legacy-peer-deps --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80