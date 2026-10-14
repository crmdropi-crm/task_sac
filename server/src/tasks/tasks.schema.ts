/**
 * Esquemas zod para tareas.
 */
import { z } from "zod";

export const ESTADOS = ["pendiente", "revision", "bloqueo", "hecho"] as const;

const fechaOpcional = z
  .union([z.string(), z.null()])
  .optional()
  .refine(
    (v) =>
      v === undefined ||
      v === null ||
      v === "" ||
      /^\d{4}-\d{2}-\d{2}$/.test(v),
    { message: "Fecha debe tener formato YYYY-MM-DD" }
  );

export const crearTareaSchema = z
  .object({
    tarea: z.string().trim().min(1, "El título es obligatorio").max(200),
    descripcion: z.string().max(5000).optional().nullable(),
    estado: z.enum(ESTADOS).default("pendiente"),
    fechaInicio: fechaOpcional,
    fechaFin: fechaOpcional,
    trabajo: z.string().max(200).optional().nullable(),
    // Solo lo respeta el admin; para miembros se fuerza a sí mismos en el servicio.
    responsableId: z.string().optional(),
    // Co-responsable opcional ("" o null = ninguno).
    coResponsableId: z.string().optional().nullable(),
  })
  .refine(
    (d) => validarRangoFechas(d.fechaInicio, d.fechaFin),
    { message: "La fecha fin no puede ser anterior a la fecha inicio", path: ["fechaFin"] }
  );

export const actualizarTareaSchema = z
  .object({
    tarea: z.string().trim().min(1).max(200).optional(),
    descripcion: z.string().max(5000).optional().nullable(),
    estado: z.enum(ESTADOS).optional(),
    fechaInicio: fechaOpcional,
    fechaFin: fechaOpcional,
    trabajo: z.string().max(200).optional().nullable(),
    responsableId: z.string().optional(),
    coResponsableId: z.string().optional().nullable(),
  })
  .refine(
    (d) => validarRangoFechas(d.fechaInicio, d.fechaFin),
    { message: "La fecha fin no puede ser anterior a la fecha inicio", path: ["fechaFin"] }
  );

export const moverTareaSchema = z.object({
  estado: z.enum(ESTADOS),
  orden: z.number().int().min(0),
});

export const filtrosTareasSchema = z.object({
  texto: z.string().optional(),
  trabajo: z.string().optional(),
  responsableId: z.string().optional(),
  // "mis" | "equipo" — solo el admin puede usar "equipo".
  vista: z.enum(["mis", "equipo"]).optional(),
});

function validarRangoFechas(
  inicio: string | null | undefined,
  fin: string | null | undefined
): boolean {
  if (!inicio || !fin) return true;
  return fin >= inicio;
}

export type CrearTareaInput = z.infer<typeof crearTareaSchema>;
export type ActualizarTareaInput = z.infer<typeof actualizarTareaSchema>;
export type MoverTareaInput = z.infer<typeof moverTareaSchema>;
export type FiltrosTareas = z.infer<typeof filtrosTareasSchema>;
