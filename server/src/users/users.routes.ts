/**
 * Rutas de gestión de usuarios: /api/users/*  (solo admin)
 *
 * Regla de seguridad: nunca dejar el sistema sin al menos un admin activo.
 */
import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware";
import { validarBody } from "../lib/validate";
import { HttpError } from "../middleware/error";
import { hashContrasena } from "../auth/password";
import {
  actualizarUsuarioSchema,
  crearUsuarioSchema,
  resetPassSchema,
} from "./users.schema";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireAdmin);

const seleccion = {
  id: true,
  nombre: true,
  correo: true,
  cargo: true,
  rol: true,
  activo: true,
  creadoEn: true,
} as const;

async function adminsActivos(): Promise<number> {
  return prisma.usuario.count({ where: { rol: "admin", activo: true } });
}

// Listar usuarios
usersRouter.get("/", async (_req, res) => {
  const usuarios = await prisma.usuario.findMany({
    select: seleccion,
    orderBy: { creadoEn: "asc" },
  });
  res.json({ usuarios });
});

// Crear usuario
usersRouter.post("/", validarBody(crearUsuarioSchema), async (req, res) => {
  const datos = req.body as import("./users.schema").CrearUsuarioInput;
  const correo = datos.correo.toLowerCase().trim();

  const existe = await prisma.usuario.findUnique({ where: { correo } });
  if (existe) throw new HttpError(409, "Ya existe un usuario con ese correo");

  const contrasenaHash = await hashContrasena(datos.contrasena);
  const usuario = await prisma.usuario.create({
    data: {
      nombre: datos.nombre,
      correo,
      cargo: datos.cargo ?? null,
      rol: datos.rol,
      contrasenaHash,
    },
    select: seleccion,
  });
  res.status(201).json({ usuario });
});

// Editar usuario (nombre, cargo, rol, activo)
usersRouter.patch(
  "/:id",
  validarBody(actualizarUsuarioSchema),
  async (req, res) => {
    const datos = req.body as import("./users.schema").ActualizarUsuarioInput;
    const actual = await prisma.usuario.findUnique({ where: { id: req.params.id } });
    if (!actual) throw new HttpError(404, "Usuario no encontrado");

    // Evitar quitar el último admin (por cambio de rol o desactivación).
    const dejariaSinAdmin =
      actual.rol === "admin" &&
      actual.activo &&
      ((datos.rol && datos.rol !== "admin") || datos.activo === false);

    if (dejariaSinAdmin && (await adminsActivos()) <= 1) {
      throw new HttpError(
        400,
        "No puedes quitar o desactivar el último administrador activo"
      );
    }

    const usuario = await prisma.usuario.update({
      where: { id: req.params.id },
      data: {
        nombre: datos.nombre,
        cargo: datos.cargo === undefined ? undefined : datos.cargo,
        rol: datos.rol,
        activo: datos.activo,
      },
      select: seleccion,
    });
    res.json({ usuario });
  }
);

// Restablecer contraseña de un usuario
usersRouter.post(
  "/:id/reset-password",
  validarBody(resetPassSchema),
  async (req, res) => {
    const { nueva } = req.body as { nueva: string };
    const actual = await prisma.usuario.findUnique({ where: { id: req.params.id } });
    if (!actual) throw new HttpError(404, "Usuario no encontrado");

    const contrasenaHash = await hashContrasena(nueva);
    await prisma.usuario.update({
      where: { id: req.params.id },
      data: { contrasenaHash },
    });
    res.json({ ok: true });
  }
);
