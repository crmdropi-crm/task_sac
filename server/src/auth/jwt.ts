/**
 * Emisión y verificación del JWT de sesión, guardado en una cookie httpOnly.
 */
import jwt, { SignOptions } from "jsonwebtoken";
import { Response } from "express";
import { env } from "../env";

export interface PayloadSesion {
  sub: string; // id del usuario
  rol: "admin" | "miembro";
}

export function firmarToken(payload: PayloadSesion): string {
  const opciones: SignOptions = {
    expiresIn: env.SESSION_TTL as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.JWT_SECRET, opciones);
}

export function verificarToken(token: string): PayloadSesion | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as PayloadSesion;
    if (!decoded?.sub || !decoded?.rol) return null;
    return { sub: decoded.sub, rol: decoded.rol };
  } catch {
    return null;
  }
}

/** Escribe la cookie de sesión httpOnly + firmada (el JWT va firmado). */
export function setCookieSesion(res: Response, token: string): void {
  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: ttlMs(env.SESSION_TTL),
  });
}

export function limpiarCookieSesion(res: Response): void {
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
  });
}

/** Convierte "8h", "1d", "30m", "3600s" o milisegundos a milisegundos. */
function ttlMs(ttl: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(ttl.trim());
  if (!match) return 8 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unidad = match[2] ?? "ms";
  const factor: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return n * factor[unidad];
}
