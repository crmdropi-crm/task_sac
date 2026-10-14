import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toasts";
import { ESTADOS, Estado, Filtros, ResponsableMini, Tarea } from "../lib/types";
import { Column } from "./Column";
import { Toolbar } from "./Toolbar";
import { TaskModal } from "./TaskModal";
import { ImportModal } from "./ImportModal";
import { useSSE } from "./useSSE";
import { TaskCard } from "./TaskCard";

export function BoardPage() {
  const { usuario } = useAuth();
  const toast = useToast();
  const esAdmin = usuario?.rol === "admin";

  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [usuarios, setUsuarios] = useState<ResponsableMini[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState<Filtros>({
    texto: "",
    trabajo: "",
    responsableId: "",
    vista: esAdmin ? "equipo" : "mis",
  });

  const [modalTarea, setModalTarea] = useState<{ abierto: boolean; tarea: Tarea | null }>(
    { abierto: false, tarea: null }
  );
  const [importAbierto, setImportAbierto] = useState(false);
  const [activa, setActiva] = useState<Tarea | null>(null);

  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;

  const construirQuery = useCallback((f: Filtros) => {
    const p = new URLSearchParams();
    if (f.texto) p.set("texto", f.texto);
    if (f.trabajo) p.set("trabajo", f.trabajo);
    if (esAdmin) {
      p.set("vista", f.vista);
      if (f.vista === "equipo" && f.responsableId)
        p.set("responsableId", f.responsableId);
    }
    return p.toString();
  }, [esAdmin]);

  const cargarTareas = useCallback(async () => {
    try {
      const q = construirQuery(filtrosRef.current);
      const { tareas } = await api.get<{ tareas: Tarea[] }>(
        `/api/tasks${q ? `?${q}` : ""}`
      );
      setTareas(tareas);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setCargando(false);
    }
  }, [construirQuery, toast]);

  // Directorio de usuarios activos (para selectores de responsable / co-responsable)
  useEffect(() => {
    api
      .get<{ usuarios: ResponsableMini[] }>("/api/directorio")
      .then((r) => setUsuarios(r.usuarios))
      .catch(() => {});
  }, []);

  // Recarga al cambiar filtros (con pequeño debounce para el buscador)
  useEffect(() => {
    const t = setTimeout(() => {
      setCargando(true);
      cargarTareas();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  // Tiempo real
  useSSE(cargarTareas);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const trabajos = useMemo(
    () =>
      Array.from(
        new Set(tareas.map((t) => t.trabajo).filter((x): x is string => !!x))
      ).sort(),
    [tareas]
  );

  const porEstado = (e: Estado) =>
    tareas
      .filter((t) => t.estado === e)
      .sort((a, b) => a.orden - b.orden || a.creadoEn.localeCompare(b.creadoEn));

  const onDragStart = (e: DragStartEvent) => {
    const t = tareas.find((x) => x.id === e.active.id);
    setActiva(t ?? null);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiva(null);
    const { active, over } = e;
    if (!over) return;

    const dragged = tareas.find((t) => t.id === active.id);
    if (!dragged) return;

    const overData = over.data.current as
      | { tipo?: string; estado?: Estado }
      | undefined;

    let destino: Estado;
    if (overData?.tipo === "columna" && overData.estado) {
      destino = overData.estado;
    } else {
      const overTarea = tareas.find((t) => t.id === over.id);
      destino = overTarea?.estado ?? dragged.estado;
    }

    // Hermanos en la columna destino, mismo responsable (así se maneja el orden)
    const hermanos = tareas
      .filter(
        (t) =>
          t.estado === destino &&
          t.responsableId === dragged.responsableId &&
          t.id !== dragged.id
      )
      .sort((a, b) => a.orden - b.orden);

    let indice = hermanos.length;
    if (overData?.tipo !== "columna") {
      const pos = hermanos.findIndex((h) => h.id === over.id);
      if (pos >= 0) indice = pos;
    }

    // ¿No-op? mismo estado y misma posición relativa
    const indiceActual = tareas
      .filter(
        (t) =>
          t.estado === dragged.estado &&
          t.responsableId === dragged.responsableId
      )
      .sort((a, b) => a.orden - b.orden)
      .findIndex((t) => t.id === dragged.id);
    if (destino === dragged.estado && indice === indiceActual) return;

    // Actualización optimista
    const snapshot = tareas;
    const nuevosIds = [
      ...hermanos.slice(0, indice).map((h) => h.id),
      dragged.id,
      ...hermanos.slice(indice).map((h) => h.id),
    ];
    const optimista = tareas.map((t) => {
      if (t.id === dragged.id) return { ...t, estado: destino };
      return t;
    });
    nuevosIds.forEach((id, i) => {
      const t = optimista.find((x) => x.id === id);
      if (t) t.orden = i;
    });
    setTareas(optimista);

    try {
      const { tarea } = await api.patch<{ tarea: Tarea }>(
        `/api/tasks/${dragged.id}/mover`,
        { estado: destino, orden: indice }
      );
      // Mezclar versión canónica del servidor (p. ej. fecha fin automática)
      setTareas((prev) => prev.map((t) => (t.id === tarea.id ? tarea : t)));
    } catch (err) {
      setTareas(snapshot); // revertir
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo mover la tarea."
      );
    }
  };

  const exportar = () => {
    const q = construirQuery(filtros);
    const a = document.createElement("a");
    a.href = `/api/tasks/export.csv${q ? `?${q}` : ""}`;
    a.click();
  };

  const mostrarResponsable = esAdmin && filtros.vista === "equipo";

  return (
    <>
      <Toolbar
        esAdmin={esAdmin}
        filtros={filtros}
        setFiltros={setFiltros}
        trabajos={trabajos}
        responsables={usuarios}
        tareas={tareas}
        onNueva={() => setModalTarea({ abierto: true, tarea: null })}
        onExportar={exportar}
        onImportar={() => setImportAbierto(true)}
      />

      <datalist id="lista-trabajos">
        {trabajos.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      {cargando ? (
        <div className="cargando">Cargando tablero…</div>
      ) : (
        <DndContext
          sensors={sensores}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="board">
            {ESTADOS.map((e) => (
              <Column
                key={e.id}
                estado={e.id}
                etiqueta={e.etiqueta}
                tareas={porEstado(e.id)}
                mostrarResponsable={mostrarResponsable}
                onAbrir={(t) => setModalTarea({ abierto: true, tarea: t })}
              />
            ))}
          </div>
          <DragOverlay>
            {activa ? (
              <TaskCard
                tarea={activa}
                mostrarResponsable={mostrarResponsable}
                onAbrir={() => {}}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {modalTarea.abierto && usuario && (
        <TaskModal
          tarea={modalTarea.tarea}
          esAdmin={esAdmin}
          miUsuarioId={usuario.id}
          usuarios={usuarios}
          onCerrar={() => setModalTarea({ abierto: false, tarea: null })}
          onGuardado={cargarTareas}
          onEliminado={cargarTareas}
        />
      )}

      {importAbierto && (
        <ImportModal
          onCerrar={() => setImportAbierto(false)}
          onImportado={cargarTareas}
        />
      )}
    </>
  );
}
