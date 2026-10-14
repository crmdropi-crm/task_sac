/**
 * Utilidades compartidas por las pruebas: reset de datos, creación de usuarios
 * y un cliente HTTP con manejo de cookies + token CSRF.
 */
import type { Express } from "express";
import request from "supertest";
import { prisma } from "../src/prisma";
import { hashContrasena } from "../src/auth/password";

export async function limpiarBase() {
  await prisma.historialTarea.deleteMany();
  await prisma.tarea.deleteMany();
  await prisma.usuario.deleteMany();
}

export async function crearUsuario(opts: {
  nombre: string;
  correo: string;
  contrasena: string;
  rol?: "admin" | "miembro";
  activo?: boolean;
}) {
  return prisma.usuario.create({
    data: {
      nombre: opts.nombre,
      correo: opts.correo.toLowerCase(),
      contrasenaHash: await hashContrasena(opts.contrasena),
      rol: opts.rol ?? "miembro",
      activo: opts.activo ?? true,
    },
  });
}

/** Extrae el valor de una cookie de la cabecera set-cookie. */
function leerCookie(setCookie: string[] | undefined, nombre: string): string | null {
  if (!setCookie) return null;
  for (const c of setCookie) {
    const m = new RegExp(`${nombre}=([^;]+)`).exec(c);
    if (m) return m[1];
  }
  return null;
}

/**
 * Crea un cliente autenticado: hace login y guarda las cookies (sesión + csrf)
 * para reusarlas, exponiendo el token CSRF para las peticiones mutadoras.
 */
export async function clienteAutenticado(
  app: Express,
  correo: string,
  contrasena: string
) {
  const agent = request.agent(app);

  // 1) Obtener cookie CSRF
  const csrfRes = await agent.get("/api/auth/csrf");
  const csrfToken =
    leerCookie(csrfRes.headers["set-cookie"] as unknown as string[], "csrf_token") ??
    csrfRes.body.csrfToken;

  // 2) Login (requiere header CSRF)
  const loginRes = await agent
    .post("/api/auth/login")
    .set("x-csrf-token", csrfToken)
    .send({ correo, contrasena });

  return { agent, csrfToken, loginRes };
}
