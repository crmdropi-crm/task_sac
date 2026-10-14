import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useToast } from "../components/Toasts";
import { Modal } from "../components/Modal";
import { Rol, UsuarioAdmin } from "../lib/types";

export function UsersPage() {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);
  const [creando, setCreando] = useState(false);
  const [resetDe, setResetDe] = useState<UsuarioAdmin | null>(null);

  const cargar = () => {
    setCargando(true);
    api
      .get<{ usuarios: UsuarioAdmin[] }>("/api/users")
      .then((r) => setUsuarios(r.usuarios))
      .catch((e) => toast.error(e instanceof ApiError ? e.message : "Error"))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleActivo = async (u: UsuarioAdmin) => {
    try {
      await api.patch(`/api/users/${u.id}`, { activo: !u.activo });
      toast.exito(u.activo ? "Usuario desactivado." : "Usuario activado.");
      cargar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error");
    }
  };

  if (cargando) return <div className="cargando">Cargando usuarios…</div>;

  return (
    <div className="page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <h1 style={{ margin: 0 }}>Usuarios</h1>
        <button className="btn btn-primary" onClick={() => setCreando(true)}>
          + Nuevo usuario
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Cargo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td>
                <td>{u.correo}</td>
                <td>{u.cargo ?? "—"}</td>
                <td>
                  <span className={`badge ${u.rol === "admin" ? "admin" : ""}`}>
                    {u.rol}
                  </span>
                </td>
                <td>
                  {u.activo ? (
                    <span className="badge">activo</span>
                  ) : (
                    <span className="badge inactivo">inactivo</span>
                  )}
                </td>
                <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  <button className="btn btn-sm" onClick={() => setEditando(u)}>
                    Editar
                  </button>{" "}
                  <button className="btn btn-sm" onClick={() => setResetDe(u)}>
                    Clave
                  </button>{" "}
                  <button
                    className={`btn btn-sm ${u.activo ? "btn-danger" : ""}`}
                    onClick={() => toggleActivo(u)}
                  >
                    {u.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creando && (
        <CrearUsuarioModal
          onCerrar={() => setCreando(false)}
          onGuardado={() => {
            setCreando(false);
            cargar();
          }}
        />
      )}
      {editando && (
        <EditarUsuarioModal
          usuario={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            cargar();
          }}
        />
      )}
      {resetDe && (
        <ResetPassModal
          usuario={resetDe}
          onCerrar={() => setResetDe(null)}
        />
      )}
    </div>
  );
}

function CrearUsuarioModal({
  onCerrar,
  onGuardado,
}: {
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const toast = useToast();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [cargo, setCargo] = useState("");
  const [rol, setRol] = useState<Rol>("miembro");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await api.post("/api/users", {
        nombre,
        correo,
        cargo: cargo || null,
        rol,
        contrasena,
      });
      toast.exito("Usuario creado.");
      onGuardado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      titulo="Nuevo usuario"
      onCerrar={onCerrar}
      pie={
        <>
          <span />
          <button className="btn btn-primary" form="form-user" type="submit" disabled={enviando}>
            Crear
          </button>
        </>
      }
    >
      <form id="form-user" onSubmit={onSubmit}>
        <div className="campo">
          <label>Nombre *</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="campo">
          <label>Correo *</label>
          <input className="input" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
        </div>
        <div className="fila">
          <div className="campo">
            <label>Cargo / área</label>
            <input className="input" value={cargo} onChange={(e) => setCargo(e.target.value)} />
          </div>
          <div className="campo">
            <label>Rol</label>
            <select className="select" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
              <option value="miembro">miembro</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>
        <div className="campo">
          <label>Contraseña (mín. 8) *</label>
          <input className="input" type="text" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required />
        </div>
        {error && <p className="error-text">{error}</p>}
      </form>
    </Modal>
  );
}

function EditarUsuarioModal({
  usuario,
  onCerrar,
  onGuardado,
}: {
  usuario: UsuarioAdmin;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const toast = useToast();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [cargo, setCargo] = useState(usuario.cargo ?? "");
  const [rol, setRol] = useState<Rol>(usuario.rol);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await api.patch(`/api/users/${usuario.id}`, {
        nombre,
        cargo: cargo || null,
        rol,
      });
      toast.exito("Usuario actualizado.");
      onGuardado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      titulo={`Editar: ${usuario.nombre}`}
      onCerrar={onCerrar}
      pie={
        <>
          <span />
          <button className="btn btn-primary" form="form-edit" type="submit" disabled={enviando}>
            Guardar
          </button>
        </>
      }
    >
      <form id="form-edit" onSubmit={onSubmit}>
        <div className="campo">
          <label>Nombre</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="fila">
          <div className="campo">
            <label>Cargo / área</label>
            <input className="input" value={cargo} onChange={(e) => setCargo(e.target.value)} />
          </div>
          <div className="campo">
            <label>Rol</label>
            <select className="select" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
              <option value="miembro">miembro</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
      </form>
    </Modal>
  );
}

function ResetPassModal({
  usuario,
  onCerrar,
}: {
  usuario: UsuarioAdmin;
  onCerrar: () => void;
}) {
  const toast = useToast();
  const [nueva, setNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await api.post(`/api/users/${usuario.id}/reset-password`, { nueva });
      toast.exito("Contraseña restablecida.");
      onCerrar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      titulo={`Restablecer contraseña: ${usuario.nombre}`}
      onCerrar={onCerrar}
      pie={
        <>
          <span />
          <button className="btn btn-primary" form="form-reset" type="submit" disabled={enviando}>
            Restablecer
          </button>
        </>
      }
    >
      <form id="form-reset" onSubmit={onSubmit}>
        <div className="campo">
          <label>Nueva contraseña (mín. 8)</label>
          <input className="input" type="text" value={nueva} onChange={(e) => setNueva(e.target.value)} required />
        </div>
        {error && <p className="error-text">{error}</p>}
      </form>
    </Modal>
  );
}
