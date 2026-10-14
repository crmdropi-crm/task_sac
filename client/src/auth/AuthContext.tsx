import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { api, ApiError } from "../lib/api";
import { Usuario } from "../lib/types";

interface AuthCtx {
  usuario: Usuario | null;
  cargando: boolean;
  login: (correo: string, contrasena: string) => Promise<void>;
  logout: () => Promise<void>;
  refrescar: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    try {
      const { usuario } = await api.get<{ usuario: Usuario }>("/api/auth/me");
      setUsuario(usuario);
    } catch {
      setUsuario(null);
    }
  }, []);

  useEffect(() => {
    // Asegura cookie CSRF y verifica sesión al cargar.
    (async () => {
      await fetch("/api/auth/csrf", { credentials: "include" });
      await refrescar();
      setCargando(false);
    })();
  }, [refrescar]);

  const login = async (correo: string, contrasena: string) => {
    const { usuario } = await api.post<{ usuario: Usuario }>("/api/auth/login", {
      correo,
      contrasena,
    });
    setUsuario(usuario);
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    }
    setUsuario(null);
  };

  return (
    <Ctx.Provider value={{ usuario, cargando, login, logout, refrescar }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}
