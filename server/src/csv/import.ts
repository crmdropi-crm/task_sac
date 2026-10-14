/**
 * Importación de tareas desde un CSV con las columnas de la hoja original:
 * Responsable | Tarea | Descripción | Estado | Fecha Inicio | Fecha Fin | Trabajo
 *
 * El "Responsable" se empareja por correo exacto o por nombre (sin distinción
 * de mayúsculas/acentos). Las tareas se crean para el responsable encontrado;
 * el creador es el usuario que importa (admin).
 */
import { parse } from "csv-parse/sync";
import { prisma } from "../prisma";
import { aFechaDia, fechaHoyDia } from "../lib/time";
import { UsuarioAutenticado } from "../middleware/auth.middleware";

const ESTADO_DESDE_ETIQUETA: Record<string, string> = {
  pendiente: "pendiente",
  "en revisión": "revision",
  "en revision": "revision",
  revisión: "revision",
  revision: "revision",
  bloqueo: "bloqueo",
  bloqueado: "bloqueo",
  hecho: "hecho",
  terminado: "hecho",
  completado: "hecho",
};

function normalizar(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function parseFecha(valor: string | undefined): Date | null {
  if (!valor) return null;
  const v = valor.trim();
  if (!v) return null;
  // Acepta YYYY-MM-DD o DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return aFechaDia(v);
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (m) {
    const [, d, mes, y] = m;
    return aFechaDia(`${y}-${mes.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }
  return null;
}

export interface ResultadoImport {
  creadas: number;
  errores: { fila: number; motivo: string }[];
}

export async function importarCsv(
  u: UsuarioAutenticado,
  contenido: string
): Promise<ResultadoImport> {
  const registros: Record<string, string>[] = parse(contenido, {
    columns: (headers: string[]) => headers.map((h) => normalizar(h)),
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  // Índice de usuarios por correo y por nombre normalizado.
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nombre: true, correo: true, activo: true },
  });
  const porCorreo = new Map(usuarios.map((x) => [normalizar(x.correo), x]));
  const porNombre = new Map(usuarios.map((x) => [normalizar(x.nombre), x]));

  const resultado: ResultadoImport = { creadas: 0, errores: [] };
  const contadorOrden = new Map<string, number>(); // clave responsable|estado

  for (let i = 0; i < registros.length; i++) {
    const fila = registros[i];
    const numFila = i + 2; // +1 header, +1 base 1

    const titulo = (fila["tarea"] ?? "").trim();
    if (!titulo) {
      resultado.errores.push({ fila: numFila, motivo: "Falta 'Tarea'" });
      continue;
    }

    const refResp = (fila["responsable"] ?? "").trim();
    const resp =
      porCorreo.get(normalizar(refResp)) ?? porNombre.get(normalizar(refResp));
    if (!resp) {
      resultado.errores.push({
        fila: numFila,
        motivo: `Responsable no encontrado: "${refResp}"`,
      });
      continue;
    }

    // Co-responsable (opcional): se empareja igual; si no se encuentra, se ignora.
    const refCo = (fila["co-responsable"] ?? fila["coresponsable"] ?? "").trim();
    const co = refCo
      ? porCorreo.get(normalizar(refCo)) ?? porNombre.get(normalizar(refCo))
      : null;

    const estado =
      ESTADO_DESDE_ETIQUETA[normalizar(fila["estado"] ?? "")] ?? "pendiente";

    let fechaFin = parseFecha(fila["fecha fin"]);
    if (estado === "hecho" && !fechaFin) fechaFin = fechaHoyDia();

    const claveOrden = `${resp.id}|${estado}`;
    if (!contadorOrden.has(claveOrden)) {
      const max = await prisma.tarea.aggregate({
        where: { responsableId: resp.id, estado: estado as never },
        _max: { orden: true },
      });
      contadorOrden.set(claveOrden, (max._max.orden ?? -1) + 1);
    }
    const orden = contadorOrden.get(claveOrden)!;
    contadorOrden.set(claveOrden, orden + 1);

    try {
      await prisma.tarea.create({
        data: {
          tarea: titulo,
          descripcion: (fila["descripcion"] ?? fila["descripción"] ?? "").trim() || null,
          estado: estado as never,
          fechaInicio: parseFecha(fila["fecha inicio"]),
          fechaFin,
          trabajo: (fila["trabajo"] ?? "").trim() || null,
          orden,
          responsableId: resp.id,
          coResponsableId: co ? co.id : null,
          creadoPorId: u.id,
          historial: {
            create: { usuarioId: u.id, cambio: "creada por importación CSV" },
          },
        },
      });
      resultado.creadas++;
    } catch (e) {
      resultado.errores.push({ fila: numFila, motivo: String(e) });
    }
  }

  return resultado;
}
