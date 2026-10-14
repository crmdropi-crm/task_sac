/**
 * Helper para validar body/query/params con zod en las rutas de Express.
 */
import { NextFunction, Request, Response } from "express";
import { ZodError, ZodSchema } from "zod";

export function validarBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const resultado = schema.safeParse(req.body);
    if (!resultado.success) {
      return res.status(400).json({
        error: "Datos inválidos",
        detalles: formatearErrores(resultado.error),
      });
    }
    // Reemplaza el body por la versión parseada/transformada
    req.body = resultado.data;
    next();
  };
}

export function validarQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const resultado = schema.safeParse(req.query);
    if (!resultado.success) {
      return res.status(400).json({
        error: "Parámetros inválidos",
        detalles: formatearErrores(resultado.error),
      });
    }
    (req as Request & { validatedQuery: unknown }).validatedQuery =
      resultado.data;
    next();
  };
}

function formatearErrores(error: ZodError): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = issue.path.join(".") || "_";
    salida[campo] = issue.message;
  }
  return salida;
}
