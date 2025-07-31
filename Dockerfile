# ---------- 1. BUILD STAGE ----------------------------------------------------
FROM node:20-bookworm AS build
WORKDIR /src

# 1. Ön-gereksinimler ----------------------------------------------------------
RUN apt-get update \
 && apt-get install -y --no-install-recommends unzip \
 && rm -rf /var/lib/apt/lists/*

# 2. Wasp CLI kurulumu ---------------------------------------------------------
RUN curl -sSL https://get.wasp.sh/installer.sh | sh \
 && ln -s /root/.local/bin/wasp /usr/local/bin/wasp

# 3. Projeyi kopyala ve Wasp derle --------------------------------------------
COPY . .
RUN wasp build

# 4. React önyüzünü derle ------------------------------------------------------
ARG REACT_APP_API_URL="https://docmentor-fbhdbkgpg0e0a4b6.germanywestcentral-01.azurewebsites.net/"
WORKDIR /src/.wasp/build/web-app
RUN npm ci \
 && REACT_APP_API_URL="$REACT_APP_API_URL" npm run build

# 5. Sunucu kodunu derle -------------------------------------------------------
WORKDIR /src/.wasp/build/server
RUN npm ci \
 && npm run bundle \
 && npm prune --omit=dev          # dev paketlerini temizle

# ---------- 2. RUNTIME STAGE --------------------------------------------------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

# Çalışacak dosyaları kopyala --------------------------------------------------
COPY --from=build /src/.wasp/build/server/bundle   ./bundle
COPY --from=build /src/.wasp/build/server/package*.json ./
COPY --from=build /src/.wasp/build/db              ./db
COPY --from=build /src/.wasp/build/web-app/build   ./web-build

# Prod bağımlılıkları kur ------------------------------------------------------
RUN npm ci --omit=dev

ENV NODE_ENV=production
EXPOSE 8080
CMD ["sh","-c","npx prisma generate --schema=./db/schema.prisma && npx prisma migrate deploy --schema=./db/schema.prisma && node --enable-source-maps bundle/server.js"]
