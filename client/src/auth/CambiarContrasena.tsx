import { FormEvent, useState } from "react";
import { Modal } from "../components/Modal";
import { api, ApiError } from "../lib/api";
import { useToast } from "../components/Toasts";

export function CambiarContrasena({ onCerrar }: { onCerrar: () => void }) {
  const toast = useToast();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (nueva !== repetir) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    setEnviando(true);
    try {
      await api.post("/api/auth/cambiar-contrasena", { actual, nueva });
      toast.exito("Contraseña actualizada.");
      onCerrar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal titulo="Cambiar mi contraseña" onCerrar={onCerrar}>
      <form onSubmit={onSubmit} id="form-pass">
        <div className="campo">
          <label>Contraseña actual</label>
          <input
            className="input"
            type="password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            required
          />
        </div>
        <div className="campo">
          <label>Nueva contraseña (mín. 8)</label>
          <input
            className="input"
            type="password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            required
          />
        </div>
        <div className="campo">
          <label>Repetir nueva contraseña</label>
          <input
            className="input"
            type="password"
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
            required
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button
          className="btn btn-primary"
          type="submit"
          disabled={enviando}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {enviando ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </Modal>
  );
}
