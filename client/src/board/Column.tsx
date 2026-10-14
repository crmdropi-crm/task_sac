import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Estado, Tarea } from "../lib/types";
import { TaskCard } from "./TaskCard";

const COLORES: Record<Estado, string> = {
  pendiente: "var(--col-pendiente)",
  revision: "var(--col-revision)",
  bloqueo: "var(--col-bloqueo)",
  hecho: "var(--col-hecho)",
};

interface Props {
  estado: Estado;
  etiqueta: string;
  tareas: Tarea[];
  mostrarResponsable: boolean;
  onAbrir: (t: Tarea) => void;
}

export function Column({
  estado,
  etiqueta,
  tareas,
  mostrarResponsable,
  onAbrir,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${estado}`,
    data: { tipo: "columna", estado },
  });

  return (
    <div className={`columna ${isOver ? "drop-activo" : ""}`}>
      <div
        className="columna-head"
        style={{ ["--col-color" as string]: COLORES[estado] }}
      >
        <span className="punto" />
        {etiqueta}
        <span className="contador">{tareas.length}</span>
      </div>
      <SortableContext
        items={tareas.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="columna-body" ref={setNodeRef}>
          {tareas.length === 0 && (
            <div className="columna-vacia">Sin tareas</div>
          )}
          {tareas.map((t) => (
            <TaskCard
              key={t.id}
              tarea={t}
              mostrarResponsable={mostrarResponsable}
              onAbrir={onAbrir}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
