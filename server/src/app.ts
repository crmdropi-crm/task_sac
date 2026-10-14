/**
 * Construcción de la aplicación Express (API + frontend estático en producción).
 */
import "express-async-errors"; // parchea Express 4 para capturar errores async
import path from "path";
import fs from "fs";
import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { corsOrigins, isProd } from "./env";
import { emitirCsrf, requerirCsrf } from "./auth/csrf";
import { authRouter } from "./auth/auth.routes";
import { tasksRouter } from "./tasks/tasks.routes";
import { usersRouter } from "./users/users.routes";
import { directorioRouter } from "./users/directorio.routes";
import { requireAuth } from "./middleware/auth.middleware";
import {
  agregarCliente,
  quitarCliente,
} from "./events/sse";
import { errorHandler, notFoundApi } from "./middleware/error";

export function crearApp() {
  const app = express();
  app.set("trust proxy", 1); // detrás de Traefik/Nginx

  app.use(
    helmet({
      // El frontend es same-origin; CSP relajada para no romper Vite/estáticos.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  if (corsOrigins.length > 0) {
    app.use(
      cors({
        origin: corsOrigins,
        credentials: true,
      })
    );
  }

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(emitirCsrf);

  // Healthcheck (sin auth)
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // SSE: tiempo real (requiere auth; no pasa por requerirCsrf porque es GET)
  app.get("/api/events", requireAuth, (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    res.write(`: conectado\n\n`);

    const id = agregarCliente(req.usuario!.id, req.usuario!.rol, res);
    req.on("close", () => {
      quitarCliente(id);
    });
  });

  // Protección CSRF para el resto de la API (métodos mutadores)
  app.use("/api", requerirCsrf);

  app.use("/api/auth", authRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/directorio", directorioRouter);

  // 404 para rutas /api desconocidas
  app.use("/api", notFoundApi);

  // En producción, servir el frontend compilado (client/dist)
  if (isProd) {
    const clientDir = path.resolve(__dirname, "../../client/dist");
    if (fs.existsSync(clientDir)) {
      app.use(express.static(clientDir));
      // SPA fallback: cualquier ruta no-API devuelve index.html
      app.get("*", (_req, res) => {
        res.sendFile(path.join(clientDir, "index.html"));
      });
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `[app] No se encontró el build del frontend en ${clientDir}. ` +
          "Ejecuta 'npm run build' antes de levantar en producción."
      );
    }
  }

  app.use(errorHandler);

  return app;
}
