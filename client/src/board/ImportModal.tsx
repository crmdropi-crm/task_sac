import { useState } from "react";
import { Modal } from "../components/Modal";
import { api, ApiError } from "../lib/api";
import { useToast } from "../components/Toasts";

interface ResultadoImport {
  creadas: number;
  errores: { fila: number; motivo: string }[];
}

export function ImportModal({
  onCerrar,
  onImportado,
}: {
  onCerrar: () => void;
  onImportado: () => void;
}) {
  const toast = useToast();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subir = async () => {
    if (!archivo) return;
    setEnviando(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      const r = await api.post<ResultadoImport>("/api/tasks/import", fd);
      setResultado(r);
      toast.exito(`Importadas ${r.creadas} tarea(s).`);
      onImportado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al importar.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      titulo="Importar tareas desde CSV"
      onCerrar={onCerrar}
      pie={
        <>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Columnas: Responsable, Tarea, Descripción, Estado, Fecha Inicio, Fecha Fin, Trabajo
          </span>
          <button
            className="btn btn-primary"
            onClick={subir}
            disabled={!archivo || enviando}
          >
            {enviando ? "Importando…" : "Importar"}
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
        El responsable se empareja por correo o por nombre. Las fechas aceptan
        formato <code>AAAA-MM-DD</code> o <code>DD/MM/AAAA</code>.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
      />
      {error && <p className="error-text">{error}</p>}
      {resultado && (
        <div style={{ marginTop: 12 }}>
          <p>
            ✅ Creadas: <b>{resultado.creadas}</b>
          </p>
          {resultado.errores.length > 0 && (
            <>
              <p className="error-text">Errores ({resultado.errores.length}):</p>
              <ul style={{ maxHeight: 140, overflow: "auto" }}>
                {resultado.errores.map((e, i) => (
                  <li key={i} style={{ fontSize: "0.82rem" }}>
                    Fila {e.fila}: {e.motivo}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
