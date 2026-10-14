/**
 * Manejo centralizado de errores y 404.
 */
import { NextFunction, Request, Response } from "express";
import { isProd } from "../env";

/** Error de aplicación con código HTTP. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export function notFoundApi(_req: Request, res: Response) {
  res.status(404).json({ error: "Recurso no encontrado" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error("[error]", err);
  res.status(500).json({
    error: "Error interno del servidor",
    ...(isProd ? {} : { detalle: String(err) }),
  });
}
