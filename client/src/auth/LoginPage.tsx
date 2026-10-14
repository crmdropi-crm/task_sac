import { FormEvent, useState } from "react";
import { useAuth } from "./AuthContext";
import { ApiError } from "../lib/api";
import { useTheme } from "../theme/ThemeContext";

export function LoginPage() {
  const { login } = useAuth();
  const { tema, alternar } = useTheme();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await login(correo, contrasena);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No se pudo conectar. Intenta de nuevo.");
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h1>Tareas</h1>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={alternar}
            title="Cambiar tema"
          >
            {tema === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
        <p className="sub">Inicia sesión para ver tu tablero.</p>

        <div className="campo">
          <label htmlFor="correo">Correo</label>
          <input
            id="correo"
            className="input"
            type="email"
            autoComplete="username"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="campo">
          <label htmlFor="pass">Contraseña</label>
          <input
            id="pass"
            className="input"
            type="password"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button
          className="btn btn-primary"
          type="submit"
          disabled={enviando}
          style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
