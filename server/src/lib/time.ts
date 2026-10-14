/**
 * Utilidades de fecha/hora con zona horaria America/Bogota.
 *
 * Las fechas de las tareas (fechaInicio, fechaFin) se manejan como "fecha sin
 * hora". Para evitar desfases por zona horaria las normalizamos a medianoche
 * UTC del día indicado, y comparamos "hoy" según America/Bogota.
 */

const TZ = "America/Bogota";

/** Devuelve "YYYY-MM-DD" del día actual en America/Bogota. */
export function hoyEnBogota(): string {
  // en-CA produce formato YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Convierte "YYYY-MM-DD" a un Date en medianoche UTC (apto para columnas @db.Date).
 * Acepta también un Date o un ISO string y lo normaliza al día.
 */
export function aFechaDia(valor: string | Date | null | undefined): Date | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const str =
    valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}

/** Convierte un Date (columna @db.Date) a "YYYY-MM-DD" o null. */
export function deFechaDia(valor: Date | null | undefined): string | null {
  if (!valor) return null;
  return valor.toISOString().slice(0, 10);
}

/** Date de hoy (medianoche UTC) según America/Bogota, para guardar en @db.Date. */
export function fechaHoyDia(): Date {
  return aFechaDia(hoyEnBogota())!;
}

/**
 * Indica si una tarea está vencida: tiene fechaFin anterior a hoy (Bogota)
 * y su estado no es "hecho".
 */
export function estaVencida(
  fechaFin: Date | null | undefined,
  estado: string
): boolean {
  if (!fechaFin || estado === "hecho") return false;
  const fin = deFechaDia(fechaFin);
  if (!fin) return false;
  return fin < hoyEnBogota();
}
