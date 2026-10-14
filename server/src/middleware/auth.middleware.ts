/**
 * Middleware de autenticación y autorización.
 *
 * - `requireAuth`: exige sesión válida y carga el usuario (activo) en req.usuario.
 * - `requireAdmin`: exige además rol admin.
 *
 * Los permisos finos (p. ej. que un miembro solo toque sus tareas) se validan
 * SIEMPRE en el backend, dentro de cada servicio/ruta — nunca solo en la UI.
 */
import { NextFunction, Request, Response } from "express";
import { env } from "../env";
import { verificarToken } from "../auth/jwt";
import { prisma } from "../prisma";

export interface UsuarioAutenticado {
  id: string;
  nombre: string;
  correo: string;
  cargo: string | null;
  rol: "admin" | "miembro";
  activo: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.[env.COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const payload = verificarToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Sesión inválida o expirada" });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      nombre: true,
      correo: true,
      cargo: true,
      rol: true,
      activo: true,
    },
  });

  if (!usuario || !usuario.activo) {
    return res
      .status(401)
      .json({ error: "Usuario inexistente o desactivado" });
  }

  req.usuario = usuario;
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.usuario?.rol !== "admin") {
    return res
      .status(403)
      .json({ error: "Requiere permisos de administrador" });
  }
  next();
}
