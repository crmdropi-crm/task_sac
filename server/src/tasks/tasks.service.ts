/**
 * Lógica de negocio de tareas: permisos (SIEMPRE en backend), historial y orden.
 *
 * Reglas de permisos:
 *  - Admin: ve/edita/elimina cualquier tarea; puede asignar a cualquiera.
 *  - Miembro: solo ve/edita/mueve/elimina SUS tareas; no puede reasignar ni
 *    ver las de otros.
 *
 * Orden: el campo `orden` es relativo a cada (responsable, estado). Así el
 * tablero de cada persona mantiene su propio orden dentro de cada columna.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { HttpError } from "../middleware/error";
import { UsuarioAutenticado } from "../middleware/auth.middleware";
import { aFechaDia, deFechaDia, estaVencida, fechaHoyDia } from "../lib/time";
import {
  ActualizarTareaInput,
  CrearTareaInput,
  FiltrosTareas,
  MoverTareaInput,
} from "./tasks.schema";

const incluirResponsable = {
  responsable: {
    select: { id: true, nombre: true, correo: true, cargo: true },
  },
} satisfies Prisma.TareaInclude;

type TareaConResponsable = Prisma.TareaGetPayload<{
  include: typeof incluirResponsable;
}>;

export function serializarTarea(t: TareaConResponsable) {
  return {
    id: t.id,
    tarea: t.tarea,
    descripcion: t.descripcion,
    estado: t.estado,
    fechaInicio: deFechaDia(t.fechaInicio),
    fechaFin: deFechaDia(t.fechaFin),
    trabajo: t.trabajo,
    orden: t.orden,
    responsableId: t.responsableId,
    creadoPorId: t.creadoPorId,
    creadoEn: t.creadoEn.toISOString(),
    actualizadoEn: t.actualizadoEn.toISOString(),
    responsable: t.responsable,
    vencida: estaVencida(t.fechaFin, t.estado),
  };
}

function esAdmin(u: UsuarioAutenticado): boolean {
  return u.rol === "admin";
}

/** Lanza 403/404 si el usuario no puede operar sobre la tarea. */
function asegurarAcceso(u: UsuarioAutenticado, tarea: { responsableId: string } | null) {
  if (!tarea) throw new HttpError(404, "Tarea no encontrada");
  if (!esAdmin(u) && tarea.responsableId !== u.id) {
    throw new HttpError(403, "No tienes permiso sobre esta tarea");
  }
}

export async function listarTareas(
  u: UsuarioAutenticado,
  filtros: FiltrosTareas
) {
  const where: Prisma.TareaWhereInput = {};

  // Visibilidad por rol
  if (!esAdmin(u)) {
    where.responsableId = u.id; // miembro: solo las suyas
  } else {
    // Admin: por defecto equipo; si pide "mis" o filtra por responsable, aplica.
    if (filtros.vista === "mis") {
      where.responsableId = u.id;
    } else if (filtros.responsableId) {
      where.responsableId = filtros.responsableId;
    }
  }

  if (filtros.trabajo) {
    where.trabajo = { contains: filtros.trabajo, mode: "insensitive" };
  }

  if (filtros.texto) {
    where.OR = [
      { tarea: { contains: filtros.texto, mode: "insensitive" } },
      { descripcion: { contains: filtros.texto, mode: "insensitive" } },
      { trabajo: { contains: filtros.texto, mode: "insensitive" } },
    ];
  }

  const tareas = await prisma.tarea.findMany({
    where,
    include: incluirResponsable,
    orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
  });

  return tareas.map(serializarTarea);
}

export async function obtenerTarea(u: UsuarioAutenticado, id: string) {
  const tarea = await prisma.tarea.findUnique({
    where: { id },
    include: incluirResponsable,
  });
  asegurarAcceso(u, tarea);
  return serializarTarea(tarea!);
}

export async function obtenerHistorial(u: UsuarioAutenticado, id: string) {
  const tarea = await prisma.tarea.findUnique({
    where: { id },
    select: { id: true, responsableId: true },
  });
  asegurarAcceso(u, tarea);

  const historial = await prisma.historialTarea.findMany({
    where: { tareaId: id },
    orderBy: { fecha: "desc" },
    include: { usuario: { select: { id: true, nombre: true } } },
  });

  return historial.map((h) => ({
    id: h.id,
    cambio: h.cambio,
    fecha: h.fecha.toISOString(),
    usuario: h.usuario,
  }));
}

async function siguienteOrden(
  responsableId: string,
  estado: CrearTareaInput["estado"],
  tx: Prisma.TransactionClient = prisma
): Promise<number> {
  const max = await tx.tarea.aggregate({
    where: { responsableId, estado },
    _max: { orden: true },
  });
  return (max._max.orden ?? -1) + 1;
}

export async function crearTarea(u: UsuarioAutenticado, datos: CrearTareaInput) {
  // Miembro: siempre se asigna a sí mismo. Admin: puede asignar a cualquiera.
  let responsableId = u.id;
  if (esAdmin(u) && datos.responsableId) {
    responsableId = datos.responsableId;
    const existe = await prisma.usuario.findUnique({
      where: { id: responsableId },
      select: { id: true, activo: true },
    });
    if (!existe) throw new HttpError(400, "El responsable indicado no existe");
  } else if (!esAdmin(u) && datos.responsableId && datos.responsableId !== u.id) {
    throw new HttpError(403, "No puedes asignar tareas a otra persona");
  }

  const estado = datos.estado ?? "pendiente";
  const orden = await siguienteOrden(responsableId, estado);

  // Si se crea directamente en "hecho" sin fecha fin, poner la de hoy.
  let fechaFin = aFechaDia(datos.fechaFin ?? null);
  if (estado === "hecho" && !fechaFin) fechaFin = fechaHoyDia();

  const tarea = await prisma.tarea.create({
    data: {
      tarea: datos.tarea,
      descripcion: datos.descripcion ?? null,
      estado,
      fechaInicio: aFechaDia(datos.fechaInicio ?? null),
      fechaFin,
      trabajo: datos.trabajo ?? null,
      orden,
      responsableId,
      creadoPorId: u.id,
      historial: {
        create: { usuarioId: u.id, cambio: "creó la tarea" },
      },
    },
    include: incluirResponsable,
  });

  return serializarTarea(tarea);
}

export async function actualizarTarea(
  u: UsuarioAutenticado,
  id: string,
  datos: ActualizarTareaInput
) {
  const actual = await prisma.tarea.findUnique({ where: { id } });
  asegurarAcceso(u, actual);

  // Reasignación: solo admin.
  if (datos.responsableId && datos.responsableId !== actual!.responsableId) {
    if (!esAdmin(u)) {
      throw new HttpError(403, "No puedes reasignar la tarea");
    }
    const existe = await prisma.usuario.findUnique({
      where: { id: datos.responsableId },
      select: { id: true },
    });
    if (!existe) throw new HttpError(400, "El responsable indicado no existe");
  }

  const cambios: string[] = [];
  const data: Prisma.TareaUpdateInput = {};

  if (datos.tarea !== undefined && datos.tarea !== actual!.tarea) {
    cambios.push("título");
    data.tarea = datos.tarea;
  }
  if (
    datos.descripcion !== undefined &&
    (datos.descripcion ?? null) !== actual!.descripcion
  ) {
    cambios.push("descripción");
    data.descripcion = datos.descripcion ?? null;
  }
  if (datos.trabajo !== undefined && (datos.trabajo ?? null) !== actual!.trabajo) {
    cambios.push("trabajo");
    data.trabajo = datos.trabajo ?? null;
  }
  if (datos.fechaInicio !== undefined) {
    const nueva = aFechaDia(datos.fechaInicio);
    if (deFechaDia(nueva) !== deFechaDia(actual!.fechaInicio)) {
      cambios.push("fecha inicio");
      data.fechaInicio = nueva;
    }
  }
  if (datos.fechaFin !== undefined) {
    const nueva = aFechaDia(datos.fechaFin);
    if (deFechaDia(nueva) !== deFechaDia(actual!.fechaFin)) {
      cambios.push("fecha fin");
      data.fechaFin = nueva;
    }
  }
  if (datos.estado !== undefined && datos.estado !== actual!.estado) {
    cambios.push(`estado: ${actual!.estado} → ${datos.estado}`);
    data.estado = datos.estado;
    // Al pasar a hecho sin fecha fin, poner hoy (si no viene una nueva).
    if (
      datos.estado === "hecho" &&
      datos.fechaFin === undefined &&
      !actual!.fechaFin
    ) {
      data.fechaFin = fechaHoyDia();
      cambios.push("fecha fin (auto: hoy)");
    }
    // Reubicar al final de la nueva columna.
    data.orden = await siguienteOrden(actual!.responsableId, datos.estado);
  }
  if (
    datos.responsableId &&
    datos.responsableId !== actual!.responsableId &&
    esAdmin(u)
  ) {
    cambios.push("responsable");
    data.responsable = { connect: { id: datos.responsableId } };
    // Reubicar al final de la columna del nuevo responsable.
    data.orden = await siguienteOrden(
      datos.responsableId,
      (datos.estado as CrearTareaInput["estado"]) ?? actual!.estado
    );
  }

  if (cambios.length === 0) {
    // Nada cambió; devolver la tarea tal cual.
    const sin = await prisma.tarea.findUnique({
      where: { id },
      include: incluirResponsable,
    });
    return serializarTarea(sin!);
  }

  const tarea = await prisma.tarea.update({
    where: { id },
    data: {
      ...data,
      historial: {
        create: { usuarioId: u.id, cambio: cambios.join("; ") },
      },
    },
    include: incluirResponsable,
  });

  return serializarTarea(tarea);
}

export async function moverTarea(
  u: UsuarioAutenticado,
  id: string,
  datos: MoverTareaInput
) {
  const actual = await prisma.tarea.findUnique({ where: { id } });
  asegurarAcceso(u, actual);

  const estadoAnterior = actual!.estado;
  const nuevoEstado = datos.estado;
  const responsableId = actual!.responsableId;

  const resultado = await prisma.$transaction(async (tx) => {
    // Hermanos en la columna destino (mismo responsable), sin esta tarea.
    const hermanos = await tx.tarea.findMany({
      where: { responsableId, estado: nuevoEstado, id: { not: id } },
      orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
      select: { id: true },
    });

    const indice = Math.max(0, Math.min(datos.orden, hermanos.length));
    const nuevoOrdenIds = [
      ...hermanos.slice(0, indice).map((h) => h.id),
      id,
      ...hermanos.slice(indice).map((h) => h.id),
    ];

    // Renumerar la columna destino.
    for (let i = 0; i < nuevoOrdenIds.length; i++) {
      await tx.tarea.update({
        where: { id: nuevoOrdenIds[i] },
        data: { orden: i },
      });
    }

    // Preparar actualización de estado/fecha de la tarea movida.
    const data: Prisma.TareaUpdateInput = {};
    const cambios: string[] = [];
    if (nuevoEstado !== estadoAnterior) {
      data.estado = nuevoEstado;
      cambios.push(`estado: ${estadoAnterior} → ${nuevoEstado}`);
      if (nuevoEstado === "hecho" && !actual!.fechaFin) {
        data.fechaFin = fechaHoyDia();
        cambios.push("fecha fin (auto: hoy)");
      }
      // Renumerar la columna de origen para cerrar el hueco.
      const origen = await tx.tarea.findMany({
        where: { responsableId, estado: estadoAnterior, id: { not: id } },
        orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
        select: { id: true },
      });
      for (let i = 0; i < origen.length; i++) {
        await tx.tarea.update({ where: { id: origen[i].id }, data: { orden: i } });
      }
    } else {
      cambios.push("reordenó la tarea");
    }

    if (Object.keys(data).length > 0) {
      await tx.tarea.update({ where: { id }, data });
    }

    await tx.historialTarea.create({
      data: { tareaId: id, usuarioId: u.id, cambio: cambios.join("; ") },
    });

    return tx.tarea.findUnique({ where: { id }, include: incluirResponsable });
  });

  return {
    tarea: serializarTarea(resultado!),
    estadoAnterior,
  };
}

export async function eliminarTarea(u: UsuarioAutenticado, id: string) {
  const actual = await prisma.tarea.findUnique({ where: { id } });
  asegurarAcceso(u, actual);
  await prisma.tarea.delete({ where: { id } });
  return { responsableId: actual!.responsableId };
}
