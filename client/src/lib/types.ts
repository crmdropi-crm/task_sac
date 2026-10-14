export type Rol = "admin" | "miembro";
export type Estado = "pendiente" | "revision" | "bloqueo" | "hecho";

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  cargo: string | null;
  rol: Rol;
}

export interface UsuarioAdmin extends Usuario {
  activo: boolean;
  creadoEn: string;
}

export interface ResponsableMini {
  id: string;
  nombre: string;
  correo: string;
  cargo: string | null;
}

export interface Tarea {
  id: string;
  tarea: string;
  descripcion: string | null;
  estado: Estado;
  fechaInicio: string | null;
  fechaFin: string | null;
  trabajo: string | null;
  orden: number;
  responsableId: string;
  creadoPorId: string;
  creadoEn: string;
  actualizadoEn: string;
  responsable: ResponsableMini | null;
  vencida: boolean;
}

export interface ItemHistorial {
  id: string;
  cambio: string;
  fecha: string;
  usuario: { id: string; nombre: string };
}

export const ESTADOS: { id: Estado; etiqueta: string }[] = [
  { id: "pendiente", etiqueta: "Pendiente" },
  { id: "revision", etiqueta: "En revisión" },
  { id: "bloqueo", etiqueta: "Bloqueo" },
  { id: "hecho", etiqueta: "Hecho" },
];

export interface Filtros {
  texto: string;
  trabajo: string;
  responsableId: string;
  vista: "mis" | "equipo";
}
