import { useEffect, useRef } from "react";

/**
 * Suscripción a Server-Sent Events. Llama a onCambio cuando el backend emite
 * "tareas:cambio". EventSource reconecta automáticamente si se cae.
 */
export function useSSE(onCambio: () => void) {
  const cbRef = useRef(onCambio);
  cbRef.current = onCambio;

  useEffect(() => {
    const es = new EventSource("/api/events", { withCredentials: true });

    const handler = () => cbRef.current();
    es.addEventListener("tareas:cambio", handler);

    es.onerror = () => {
      // El navegador reintenta solo; no hacemos nada especial.
    };

    return () => {
      es.removeEventListener("tareas:cambio", handler);
      es.close();
    };
  }, []);
}
