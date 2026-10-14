/**
 * Cliente HTTP ligero: incluye cookies de sesión y el token CSRF automáticamente.
 */

function leerCookie(nombre: string): string | null {
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + nombre + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public detalles?: unknown) {
    super(message);
  }
}

async function request<T>(
  metodo: string,
  url: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {};
  const esMutador = !["GET", "HEAD"].includes(metodo);

  if (esMutador) {
    // Asegurar que exista la cookie csrf_token.
    let csrf = leerCookie("csrf_token");
    if (!csrf) {
      await fetch("/api/auth/csrf", { credentials: "include" });
      csrf = leerCookie("csrf_token");
    }
    if (csrf) headers["x-csrf-token"] = csrf;
  }

  let opts: RequestInit = {
    method: metodo,
    credentials: "include",
    headers,
  };

  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const texto = await res.text();
  const data = texto ? JSON.parse(texto) : null;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error ?? `Error ${res.status}`,
      data?.detalles
    );
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
  patch: <T>(url: string, body?: unknown) => request<T>("PATCH", url, body),
  delete: <T>(url: string) => request<T>("DELETE", url),
};
