import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Tema = "light" | "dark";

interface ThemeCtx {
  tema: Tema;
  alternar: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function temaInicial(): Tema {
  const guardado = localStorage.getItem("tema");
  if (guardado === "light" || guardado === "dark") return guardado;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("tema", tema);
  }, [tema]);

  const alternar = () => setTema((t) => (t === "dark" ? "light" : "dark"));

  return <Ctx.Provider value={{ tema, alternar }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme fuera de ThemeProvider");
  return ctx;
}
