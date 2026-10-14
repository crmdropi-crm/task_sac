/**
 * Esquemas zod para gestión de usuarios (admin).
 */
import { z } from "zod";

export const crearUsuarioSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  correo: z.string().email("Correo inválido"),
  cargo: z.string().max(120).optional().nullable(),
  rol: z.enum(["admin", "miembro"]).default("miembro"),
  contrasena: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const actualizarUsuarioSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  cargo: z.string().max(120).optional().nullable(),
  rol: z.enum(["admin", "miembro"]).optional(),
  activo: z.boolean().optional(),
});

export const resetPassSchema = z.object({
  nueva: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
