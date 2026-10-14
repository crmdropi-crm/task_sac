/**
 * Rutas de autenticación: /api/auth/*
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../prisma";
import { validarBody } from "../lib/validate";
import { hashContrasena, verificarContrasena } from "./password";
import {
  firmarToken,
  limpiarCookieSesion,
  setCookieSesion,
} from "./jwt";
import { requireAuth } from "../middleware/auth.middleware";
import { isTest } from "../env";

export const authRouter = Router();

// Límite de intentos de login: 10 por IP cada 15 minutos.
// Se desactiva en entorno de pruebas para no interferir con los tests.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
});

const loginSchema = z.object({
  correo: z.string().email("Correo inválido"),
  contrasena: z.string().min(1, "La contraseña es obligatoria"),
});

authRouter.post(
  "/login",
  loginLimiter,
  validarBody(loginSchema),
  async (req, res) => {
    const { correo, contrasena } = req.body as z.infer<typeof loginSchema>;

    const usuario = await prisma.usuario.findUnique({
      where: { correo: correo.toLowerCase().trim() },
    });

    // Mensaje genérico para no revelar si el correo existe.
    const credsInvalidas = () =>
      res.status(401).json({ error: "Correo o contraseña incorrectos" });

    if (!usuario || !usuario.activo) return credsInvalidas();

    const ok = await verificarContrasena(contrasena, usuario.contrasenaHash);
    if (!ok) return credsInvalidas();

    const token = firmarToken({ sub: usuario.id, rol: usuario.rol });
    setCookieSesion(res, token);

    res.json({
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        cargo: usuario.cargo,
        rol: usuario.rol,
      },
    });
  }
);

authRouter.post("/logout", (_req, res) => {
  limpiarCookieSesion(res);
  res.json({ ok: true });
});

// Devuelve el usuario de la sesión actual (o 401). También sirve de "ping".
authRouter.get("/me", requireAuth, (req, res) => {
  const u = req.usuario!;
  res.json({
    usuario: {
      id: u.id,
      nombre: u.nombre,
      correo: u.correo,
      cargo: u.cargo,
      rol: u.rol,
    },
  });
});

// Cambio de contraseña propio (cualquier usuario autenticado).
const cambioPassSchema = z.object({
  actual: z.string().min(1, "La contraseña actual es obligatoria"),
  nueva: z
    .string()
    .min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});

authRouter.post(
  "/cambiar-contrasena",
  requireAuth,
  validarBody(cambioPassSchema),
  async (req, res) => {
    const { actual, nueva } = req.body as z.infer<typeof cambioPassSchema>;
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario!.id },
    });
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    const ok = await verificarContrasena(actual, usuario.contrasenaHash);
    if (!ok) {
      return res.status(400).json({ error: "La contraseña actual no es correcta" });
    }

    const contrasenaHash = await hashContrasena(nueva);
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { contrasenaHash },
    });

    res.json({ ok: true });
  }
);

// Endpoint para obtener/asegurar el token CSRF (la cookie la emite el middleware).
authRouter.get("/csrf", (req, res) => {
  const token = (req as typeof req & { csrfToken?: string }).csrfToken;
  res.json({ csrfToken: token ?? null });
});
