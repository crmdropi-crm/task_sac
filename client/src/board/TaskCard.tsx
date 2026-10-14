import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tarea } from "../lib/types";
import { colorAvatar, fechaCorta, iniciales } from "../lib/format";

interface Props {
  tarea: Tarea;
  mostrarResponsable: boolean;
  onAbrir: (t: Tarea) => void;
}

export function TaskCard({ tarea, mostrarResponsable, onAbrir }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tarea.id, data: { tipo: "tarea", tarea } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const resp = tarea.responsable;
  const co = tarea.coResponsable;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`tarjeta ${tarea.vencida ? "vencida" : ""} ${
        isDragging ? "arrastrando" : ""
      }`}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Evitar abrir si fue un arrastre
        if (!isDragging) onAbrir(tarea);
        e.stopPropagation();
      }}
    >
      <p className="titulo">{tarea.tarea}</p>
      {tarea.descripcion && <p className="desc">{tarea.descripcion}</p>}

      <div className="meta">
        {tarea.trabajo && <span className="chip" title={tarea.trabajo}>🏷️ {tarea.trabajo}</span>}
        {(tarea.fechaInicio || tarea.fechaFin) && (
          <span className={`fechas ${tarea.vencida ? "vencida" : ""}`}>
            📅 {fechaCorta(tarea.fechaInicio)} → {fechaCorta(tarea.fechaFin)}
          </span>
        )}
        {((mostrarResponsable && resp) || co) && (
          <span className="avatares">
            {mostrarResponsable && resp && (
              <span
                className="avatar"
                title={`Responsable: ${resp.nombre}`}
                style={{ background: `hsl(${colorAvatar(resp.id)} 60% 45%)` }}
              >
                {iniciales(resp.nombre)}
              </span>
            )}
            {co && (
              <span
                className="avatar co"
                title={`Co-responsable: ${co.nombre}`}
                style={{ background: `hsl(${colorAvatar(co.id)} 55% 42%)` }}
              >
                {iniciales(co.nombre)}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
