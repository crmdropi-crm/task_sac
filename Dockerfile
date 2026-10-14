# ─────────────────────────────────────────────────────────────
# task_sac — imagen de producción (frontend + backend en un contenedor)
# ─────────────────────────────────────────────────────────────

# Etapa 1: build (instala todo, genera Prisma Client, compila client + server)
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Necesario para que Prisma descargue sus binarios
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copiamos los manifiestos primero para aprovechar la caché de capas
COPY package.json package-lock.json* ./
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY prisma ./prisma

RUN npm install

# Copiamos el resto del código y construimos
COPY . .
RUN npx prisma generate
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Etapa 2: runtime
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copiamos la app ya construida (incluye node_modules con Prisma CLI y tsx
# para migraciones y seed en el arranque).
COPY --from=builder /app ./

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

# Healthcheck del endpoint /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
