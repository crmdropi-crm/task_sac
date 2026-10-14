import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearApp } from "../src/app";
import { prisma } from "../src/prisma";
import { clienteAutenticado, crearUsuario, limpiarBase } from "./helpers";

const app = crearApp();

beforeAll(async () => {
  await limpiarBase();
  await crearUsuario({
    nombre: "Admin",
    correo: "admin@test.com",
    contrasena: "secreto123",
    rol: "admin",
  });
  await crearUsuario({
    nombre: "Inactivo",
    correo: "inactivo@test.com",
    contrasena: "secreto123",
    rol: "miembro",
    activo: false,
  });
});

afterAll(async () => {
  await limpiarBase();
  await prisma.$disconnect();
});

describe("Autenticación", () => {
  it("permite iniciar sesión con credenciales correctas", async () => {
    const { loginRes } = await clienteAutenticado(
      app,
      "admin@test.com",
      "secreto123"
    );
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.usuario.correo).toBe("admin@test.com");
    expect(loginRes.body.usuario.rol).toBe("admin");
  });

  it("rechaza contraseña incorrecta con 401", async () => {
    const { loginRes } = await clienteAutenticado(
      app,
      "admin@test.com",
      "claveMala"
    );
    expect(loginRes.status).toBe(401);
  });

  it("rechaza usuarios desactivados", async () => {
    const { loginRes } = await clienteAutenticado(
      app,
      "inactivo@test.com",
      "secreto123"
    );
    expect(loginRes.status).toBe(401);
  });

  it("bloquea peticiones mutadoras sin token CSRF", async () => {
    const res = await (await import("supertest")).default(app)
      .post("/api/auth/login")
      .send({ correo: "admin@test.com", contrasena: "secreto123" });
    expect(res.status).toBe(403); // CSRF ausente
  });

  it("devuelve 401 en /api/auth/me sin sesión", async () => {
    const res = await (await import("supertest")).default(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
