import { useState } from "react";
import { useAuth } from "./auth/AuthContext";
import { useTheme } from "./theme/ThemeContext";
import { LoginPage } from "./auth/LoginPage";
import { BoardPage } from "./board/BoardPage";
import { UsersPage } from "./users/UsersPage";
import { CambiarContrasena } from "./auth/CambiarContrasena";
import { iniciales } from "./lib/format";

type Vista = "tablero" | "usuarios";

export default function App() {
  const { usuario, cargando, logout } = useAuth();
  const { tema, alternar } = useTheme();
  const [vista, setVista] = useState<Vista>("tablero");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cambiarPass, setCambiarPass] = useState(false);

  if (cargando) {
    return <div className="cargando">Cargando…</div>;
  }

  if (!usuario) {
    return <LoginPage />;
  }

  const esAdmin = usuario.rol === "admin";

  return (
    <>
      <header className="appbar">
        <span className="marca">📋 Tareas</span>

        <nav style={{ display: "flex", gap: 6 }}>
          <button
            className={`btn btn-sm ${vista === "tablero" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setVista("tablero")}
          >
            Tablero
          </button>
          {esAdmin && (
            <button
              className={`btn btn-sm ${vista === "usuarios" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setVista("usuarios")}
            >
              Usuarios
            </button>
          )}
        </nav>

        <span className="sep" style={{ flex: 1 }} />

        <button
          className="btn btn-ghost btn-sm"
          onClick={alternar}
          title="Cambiar tema claro/oscuro"
        >
          {tema === "dark" ? "☀️" : "🌙"}
        </button>

        <div style={{ position: "relative" }}>
          <button
            className="btn btn-sm"
            onClick={() => setMenuAbierto((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span
              className="avatar"
              style={{ margin: 0, background: "var(--primary)" }}
            >
              {iniciales(usuario.nombre)}
            </span>
            {usuario.nombre}
          </button>
          {menuAbierto && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "110%",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                boxShadow: "var(--shadow-lg)",
                minWidth: 200,
                zIndex: 40,
                padding: 6,
              }}
              onMouseLeave={() => setMenuAbierto(false)}
            >
              <div style={{ padding: "6px 10px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                {usuario.correo}
                <br />
                {usuario.cargo ?? ""}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: "100%", justifyContent: "flex-start" }}
                onClick={() => {
                  setMenuAbierto(false);
                  setCambiarPass(true);
                }}
              >
                🔑 Cambiar contraseña
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: "100%", justifyContent: "flex-start" }}
                onClick={logout}
              >
                🚪 Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      {vista === "tablero" ? <BoardPage /> : <UsersPage />}

      {cambiarPass && <CambiarContrasena onCerrar={() => setCambiarPass(false)} />}
    </>
  );
}
