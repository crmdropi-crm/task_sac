import { FormEvent, useEffect, useState } from "react";
import { Modal } from "../components/Modal";
import { api, ApiError } from "../lib/api";
import { useToast } from "../components/Toasts";
import { Estado, ItemHistorial, ResponsableMini, Tarea } from "../lib/types";
import { ESTADOS } from "../lib/types";
import { fechaHora } from "../lib/format";

interface Props {
  tarea: Tarea | null; // null => nueva
  esAdmin: boolean;
  miUsuarioId: string;
  usuarios: ResponsableMini[];
  onCerrar: () => void;
  onGuardado: () => void;
  onEliminado: () => void;
}

export function TaskModal({
  tarea,
  esAdmin,
  miUsuarioId,
  usuarios,
  onCerrar,
  onGuardado,
  onEliminado,
}: Props) {
  const toast = useToast();
  const editando = Boolean(tarea);

  const [titulo, setTitulo] = useState(tarea?.tarea ?? "");
  const [descripcion, setDescripcion] = useState(tarea?.descripcion ?? "");
  const [estado, setEstado] = useState<Estado>(tarea?.estado ?? "pendiente");
  const [fechaInicio, setFechaInicio] = useState(tarea?.fechaInicio ?? "");
  const [fechaFin, setFechaFin] = useState(tarea?.fechaFin ?? "");
  const [trabajo, setTrabajo] = useState(tarea?.trabajo ?? "");
  const [responsableId, setResponsableId] = useState(
    tarea?.responsableId ?? miUsuarioId
  );
  const [coResponsableId, setCoResponsableId] = useState(
    tarea?.coResponsableId ?? ""
  );

  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [historial, setHistorial] = useState<ItemHistorial[]>([]);

  useEffect(() => {
    if (tarea) {
      api
        .get<{ historial: ItemHistorial[] }>(`/api/tasks/${tarea.id}/historial`)
        .then((r) => setHistorial(r.historial))
        .catch(() => setHistorial([]));
    }
  }, [tarea]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      setError("La fecha fin no puede ser anterior a la fecha inicio.");
      return;
    }

    const payload: Record<string, unknown> = {
      tarea: titulo,
      descripcion: descripcion || null,
      estado,
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      trabajo: trabajo || null,
      coResponsableId: coResponsableId || null,
    };
    if (esAdmin) payload.responsableId = responsableId;

    setEnviando(true);
    try {
      if (editando && tarea) {
        await api.patch(`/api/tasks/${tarea.id}`, payload);
        toast.exito("Tarea actualizada.");
      } else {
        await api.post("/api/tasks", payload);
        toast.exito("Tarea creada.");
      }
      onGuardado();
      onCerrar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado.");
    } finally {
      setEnviando(false);
    }
  };

  const eliminar = async () => {
    if (!tarea) return;
    setEnviando(true);
    try {
      await api.delete(`/api/tasks/${tarea.id}`);
      toast.exito("Tarea eliminada.");
      onEliminado();
      onCerrar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado.");
    } finally {
      setEnviando(false);
    }
  };

  const pie = (
    <>
      {editando ? (
        confirmarEliminar ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem" }}>¿Eliminar definitivamente?</span>
            <button className="btn btn-danger btn-sm" onClick={eliminar} disabled={enviando}>
              Sí, eliminar
            </button>
            <button className="btn btn-sm" onClick={() => setConfirmarEliminar(false)}>
              No
            </button>
          </div>
        ) : (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setConfirmarEliminar(true)}
          >
            🗑️ Eliminar
          </button>
        )
      ) : (
        <span />
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={onCerrar}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          type="submit"
          form="form-tarea"
          disabled={enviando}
        >
          {enviando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </>
  );

  return (
    <Modal
      titulo={editando ? "Editar tarea" : "Nueva tarea"}
      onCerrar={onCerrar}
      pie={pie}
    >
      <form id="form-tarea" onSubmit={onSubmit}>
        <div className="campo">
          <label>Título *</label>
          <input
            className="input"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            maxLength={200}
            autoFocus
          />
        </div>
        <div className="campo">
          <label>Descripción</label>
          <textarea
            className="textarea"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>

        <div className="fila">
          <div className="campo">
            <label>Estado</label>
            <select
              className="select"
              value={estado}
              onChange={(e) => setEstado(e.target.value as Estado)}
            >
              {ESTADOS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label>Trabajo (proyecto/área/cliente)</label>
            <input
              className="input"
              value={trabajo}
              onChange={(e) => setTrabajo(e.target.value)}
              list="lista-trabajos"
            />
          </div>
        </div>

        <div className="fila">
          <div className="campo">
            <label>Fecha inicio</label>
            <input
              className="input"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="campo">
            <label>Fecha fin</label>
            <input
              className="input"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
        </div>

        <div className="fila">
          {esAdmin && (
            <div className="campo">
              <label>Responsable (líder)</label>
              <select
                className="select"
                value={responsableId}
                onChange={(e) => setResponsableId(e.target.value)}
              >
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="campo">
            <label>Co-responsable</label>
            <select
              className="select"
              value={coResponsableId}
              onChange={(e) => setCoResponsableId(e.target.value)}
            >
              <option value="">— Sin co-responsable —</option>
              {usuarios
                .filter((u) => u.id !== responsableId)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}
      </form>

      {editando && historial.length > 0 && (
        <div className="historial">
          <h3>Historial de cambios</h3>
          <ul>
            {historial.map((h) => (
              <li key={h.id}>
                <b>{h.usuario.nombre}</b> — {h.cambio}
                <br />
                <span style={{ opacity: 0.7 }}>{fechaHora(h.fecha)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
