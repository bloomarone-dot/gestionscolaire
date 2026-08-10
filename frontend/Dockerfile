FROM node:20-alpine AS build
WORKDIR /app
# Évite les échecs silencieux mémoire / registry sur petits VPS
ENV NODE_OPTIONS=--max-old-space-size=2048
COPY package.json package-lock.json ./
# npm ci strict ; fallback install si lock légèrement désaligné sur le serveur
RUN npm ci --no-audit --no-fund \
  || (echo "npm ci failed — falling back to npm install" && npm install --no-audit --no-fund)
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
