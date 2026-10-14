/**
 * Directorio: lista mínima de usuarios activos para poblar selectores
 * (responsable / co-responsable). Accesible a cualquier usuario autenticado.
 */
import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth.middleware";

export const directorioRouter = Router();

directorioRouter.use(requireAuth);

directorioRouter.get("/", async (_req, res) => {
  const usuarios = await prisma.usuario.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, correo: true, cargo: true },
    orderBy: { nombre: "asc" },
  });
  res.json({ usuarios });
});
