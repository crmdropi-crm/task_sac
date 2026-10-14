import { Estado, Filtros, ResponsableMini, Tarea } from "../lib/types";
import { ESTADOS } from "../lib/types";

interface Props {
  esAdmin: boolean;
  filtros: Filtros;
  setFiltros: (f: Filtros) => void;
  trabajos: string[];
  responsables: ResponsableMini[];
  tareas: Tarea[];
  onNueva: () => void;
  onExportar: () => void;
  onImportar: () => void;
}

export function Toolbar({
  esAdmin,
  filtros,
  setFiltros,
  trabajos,
  responsables,
  tareas,
  onNueva,
  onExportar,
  onImportar,
}: Props) {
  const conteo = (estado: Estado) =>
    tareas.filter((t) => t.estado === estado).length;
  const vencidas = tareas.filter((t) => t.vencida).length;

  return (
    <>
      <div className="toolbar">
        <input
          className="input"
          placeholder="🔎 Buscar…"
          value={filtros.texto}
          onChange={(e) => setFiltros({ ...filtros, texto: e.target.value })}
        />
        <select
          className="select"
          value={filtros.trabajo}
          onChange={(e) => setFiltros({ ...filtros, trabajo: e.target.value })}
        >
          <option value="">Todo el trabajo</option>
          {trabajos.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {esAdmin && (
          <>
            <select
              className="select"
              value={filtros.vista}
              onChange={(e) =>
                setFiltros({
                  ...filtros,
                  vista: e.target.value as "mis" | "equipo",
                })
              }
            >
              <option value="equipo">Equipo</option>
              <option value="mis">Mis tareas</option>
            </select>
            <select
              className="select"
              value={filtros.responsableId}
              onChange={(e) =>
                setFiltros({ ...filtros, responsableId: e.target.value })
              }
              disabled={filtros.vista === "mis"}
            >
              <option value="">Todos los responsables</option>
              {responsables.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </>
        )}

        <span className="sep" style={{ flex: 1 }} />

        <button className="btn btn-sm" onClick={onExportar} title="Exportar CSV">
          ⬇️ CSV
        </button>
        {esAdmin && (
          <button className="btn btn-sm" onClick={onImportar} title="Importar CSV">
            ⬆️ Importar
          </button>
        )}
        <button className="btn btn-primary btn-sm" onClick={onNueva}>
          + Nueva tarea
        </button>
      </div>

      <div className="toolbar" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="resumen">
          {ESTADOS.map((e) => (
            <span className="pill" key={e.id}>
              <span
                className="punto"
                style={{ background: `var(--col-${e.id})` }}
              />
              {e.etiqueta}: <b>{conteo(e.id)}</b>
            </span>
          ))}
          <span className={`pill ${vencidas > 0 ? "vencidas" : ""}`}>
            ⚠️ Vencidas: <b>{vencidas}</b>
          </span>
          <span className="pill">
            Total: <b>{tareas.length}</b>
          </span>
        </div>
      </div>
    </>
  );
}
