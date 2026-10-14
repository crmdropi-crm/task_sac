import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";

type Tipo = "info" | "error" | "exito";
interface Toast {
  id: number;
  tipo: Tipo;
  mensaje: string;
}

interface ToastCtx {
  mostrar: (mensaje: string, tipo?: Tipo) => void;
  error: (mensaje: string) => void;
  exito: (mensaje: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);
let idSeq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const mostrar = useCallback((mensaje: string, tipo: Tipo = "info") => {
    const id = idSeq++;
    setToasts((t) => [...t, { id, tipo, mensaje }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const valor: ToastCtx = {
    mostrar,
    error: (m) => mostrar(m, "error"),
    exito: (m) => mostrar(m, "exito"),
  };

  return (
    <Ctx.Provider value={valor}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tipo}`}>
            {t.mensaje}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast fuera de ToastProvider");
  return ctx;
}
