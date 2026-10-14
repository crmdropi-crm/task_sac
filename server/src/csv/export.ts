/**
 * Exportación de tareas a CSV con las MISMAS columnas de la hoja original:
 * Responsable | Tarea | Descripción | Estado | Fecha Inicio | Fecha Fin | Trabajo
 */
import { stringify } from "csv-stringify/sync";

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  revision: "En revisión",
  bloqueo: "Bloqueo",
  hecho: "Hecho",
};

export interface TareaExportable {
  tarea: string;
  descripcion: string | null;
  estado: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  trabajo: string | null;
  responsable?: { nombre: string; correo: string } | null;
}

export function tareasACsv(tareas: TareaExportable[]): string {
  const filas = tareas.map((t) => ({
    Responsable: t.responsable?.nombre ?? "",
    Tarea: t.tarea,
    Descripción: t.descripcion ?? "",
    Estado: ETIQUETA_ESTADO[t.estado] ?? t.estado,
    "Fecha Inicio": t.fechaInicio ?? "",
    "Fecha Fin": t.fechaFin ?? "",
    Trabajo: t.trabajo ?? "",
  }));

  return stringify(filas, {
    header: true,
    columns: [
      "Responsable",
      "Tarea",
      "Descripción",
      "Estado",
      "Fecha Inicio",
      "Fecha Fin",
      "Trabajo",
    ],
    bom: true, // para que Excel reconozca UTF-8
  });
}
