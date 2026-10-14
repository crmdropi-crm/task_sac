/**
 * Protección CSRF básica con el patrón "double-submit cookie".
 *
 * - Se entrega una cookie `csrf_token` (NO httpOnly) con un valor aleatorio.
 * - El frontend lee esa cookie y la reenvía en el header `x-csrf-token`.
 * - En peticiones que cambian estado (POST/PUT/PATCH/DELETE) se exige que el
 *   header coincida con la cookie. Un atacante en otro origen no puede leer la
 *   cookie ni fijar cabeceras personalizadas, por lo que no puede falsificarla.
 */
import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { env } from "../env";

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Garantiza que exista la cookie csrf_token; la crea si falta. */
export function emitirCsrf(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.[CSRF_COOKIE];
  if (!token) {
    token = crypto.randomBytes(24).toString("hex");
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // el frontend debe poder leerla
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      path: "/",
    });
  }
  (req as Request & { csrfToken?: string }).csrfToken = token;
  next();
}

/** Rechaza peticiones mutadoras sin un token CSRF válido. */
export function requerirCsrf(req: Request, res: Response, next: NextFunction) {
  if (METODOS_SEGUROS.has(req.method)) return next();

  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.get(CSRF_HEADER);

  if (!cookie || !header || cookie !== header) {
    return res.status(403).json({ error: "Token CSRF inválido o ausente" });
  }
  next();
}
