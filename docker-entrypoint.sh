#!/bin/sh
# Arranque del contenedor: aplica migraciones, crea el admin inicial (idempotente)
# y levanta el servidor.
set -e

echo "➡️  Aplicando migraciones de Prisma (migrate deploy)..."
npx prisma migrate deploy

echo "➡️  Verificando admin inicial (seed idempotente)..."
npx tsx prisma/seed.ts || echo "⚠️  Seed omitido o ya existían usuarios."

echo "🚀 Iniciando servidor..."
exec node server/dist/index.js
