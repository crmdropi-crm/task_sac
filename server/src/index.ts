/**
 * Punto de arranque del servidor.
 */
import { crearApp } from "./app";
import { env } from "./env";
import { prisma } from "./prisma";
import { iniciarHeartbeat } from "./events/sse";

async function main() {
  // Verificar conexión a la base de datos al arrancar.
  try {
    await prisma.$connect();
    // eslint-disable-next-line no-console
    console.log("✅ Conectado a PostgreSQL");
  } catch (e) {
    console.error("❌ No se pudo conectar a la base de datos:", e);
    process.exit(1);
  }

  const app = crearApp();
  const heartbeat = iniciarHeartbeat();

  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 task_sac escuchando en http://localhost:${env.PORT}`);
  });

  const apagar = async (sig: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n${sig} recibido, cerrando...`);
    clearInterval(heartbeat);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void apagar("SIGINT"));
  process.on("SIGTERM", () => void apagar("SIGTERM"));
}

void main();
