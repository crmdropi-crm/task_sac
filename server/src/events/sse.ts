/**
 * Server-Sent Events (SSE) para tiempo real.
 *
 * Cada cliente autenticado abre una conexión GET /api/events. Cuando una tarea
 * se crea/edita/mueve/elimina, el backend emite un evento "tareas:cambio" a
 * todos los clientes conectados. El frontend decide si debe refrescar según el
 * responsable (los miembros solo ven sus tareas).
 */
import { Response } from "express";

export interface ClienteSSE {
  id: number;
  usuarioId: string;
  rol: "admin" | "miembro";
  res: Response;
}

export interface EventoTarea {
  tipo: "creada" | "actualizada" | "movida" | "eliminada";
  tareaId: string;
  responsableId: string;
  porUsuarioId: string;
}

const clientes = new Map<number, ClienteSSE>();
let siguienteId = 1;

export function agregarCliente(
  usuarioId: string,
  rol: "admin" | "miembro",
  res: Response
): number {
  const id = siguienteId++;
  clientes.set(id, { id, usuarioId, rol, res });
  return id;
}

export function quitarCliente(id: number): void {
  clientes.delete(id);
}

/** Difunde un evento de cambio de tarea a todos los clientes conectados. */
export function emitirCambioTarea(evento: EventoTarea): void {
  const data = `event: tareas:cambio\ndata: ${JSON.stringify(evento)}\n\n`;
  for (const cliente of clientes.values()) {
    try {
      cliente.res.write(data);
    } catch {
      clientes.delete(cliente.id);
    }
  }
}

/** Envía un "ping" periódico para mantener viva la conexión. */
export function iniciarHeartbeat(): NodeJS.Timeout {
  return setInterval(() => {
    for (const cliente of clientes.values()) {
      try {
        cliente.res.write(`: ping\n\n`);
      } catch {
        clientes.delete(cliente.id);
      }
    }
  }, 25_000);
}
