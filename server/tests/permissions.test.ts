import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearApp } from "../src/app";
import { prisma } from "../src/prisma";
import { clienteAutenticado, crearUsuario, limpiarBase } from "./helpers";

const app = crearApp();

let adminId: string;
let anaId: string;
let beto: { id: string };
let tareaDeAna: string;
let tareaDeBeto: string;

beforeAll(async () => {
  await limpiarBase();
  const admin = await crearUsuario({
    nombre: "Admin",
    correo: "admin@test.com",
    contrasena: "secreto123",
    rol: "admin",
  });
  const ana = await crearUsuario({
    nombre: "Ana",
    correo: "ana@test.com",
    contrasena: "secreto123",
    rol: "miembro",
  });
  beto = await crearUsuario({
    nombre: "Beto",
    correo: "beto@test.com",
    contrasena: "secreto123",
    rol: "miembro",
  });
  adminId = admin.id;
  anaId = ana.id;

  const t1 = await prisma.tarea.create({
    data: {
      tarea: "Tarea de Ana",
      estado: "pendiente",
      responsableId: ana.id,
      creadoPorId: ana.id,
      orden: 0,
    },
  });
  const t2 = await prisma.tarea.create({
    data: {
      tarea: "Tarea de Beto",
      estado: "pendiente",
      responsableId: beto.id,
      creadoPorId: beto.id,
      orden: 0,
    },
  });
  tareaDeAna = t1.id;
  tareaDeBeto = t2.id;
});

afterAll(async () => {
  await limpiarBase();
  await prisma.$disconnect();
});

describe("Permisos: miembro vs admin", () => {
  it("un miembro solo ve SUS tareas", async () => {
    const { agent } = await clienteAutenticado(app, "ana@test.com", "secreto123");
    const res = await agent.get("/api/tasks");
    expect(res.status).toBe(200);
    const ids = res.body.tareas.map((t: { id: string }) => t.id);
    expect(ids).toContain(tareaDeAna);
    expect(ids).not.toContain(tareaDeBeto);
  });

  it("un miembro NO puede ver la tarea de otro (403/404)", async () => {
    const { agent } = await clienteAutenticado(app, "ana@test.com", "secreto123");
    const res = await agent.get(`/api/tasks/${tareaDeBeto}`);
    expect([403, 404]).toContain(res.status);
  });

  it("un miembro NO puede editar la tarea de otro", async () => {
    const { agent, csrfToken } = await clienteAutenticado(
      app,
      "ana@test.com",
      "secreto123"
    );
    const res = await agent
      .patch(`/api/tasks/${tareaDeBeto}`)
      .set("x-csrf-token", csrfToken)
      .send({ tarea: "Hackeada" });
    expect([403, 404]).toContain(res.status);
  });

  it("un miembro NO puede reasignar su tarea a otra persona", async () => {
    const { agent, csrfToken } = await clienteAutenticado(
      app,
      "ana@test.com",
      "secreto123"
    );
    const res = await agent
      .patch(`/api/tasks/${tareaDeAna}`)
      .set("x-csrf-token", csrfToken)
      .send({ responsableId: beto.id });
    expect(res.status).toBe(403);
  });

  it("al crear, un miembro se asigna a sí mismo aunque pida otro responsable", async () => {
    const { agent, csrfToken } = await clienteAutenticado(
      app,
      "ana@test.com",
      "secreto123"
    );
    const res = await agent
      .post("/api/tasks")
      .set("x-csrf-token", csrfToken)
      .send({ tarea: "Nueva de Ana", responsableId: beto.id });
    expect(res.status).toBe(403); // intentar asignar a otro => prohibido
  });

  it("un miembro puede crear una tarea para sí mismo", async () => {
    const { agent, csrfToken } = await clienteAutenticado(
      app,
      "ana@test.com",
      "secreto123"
    );
    const res = await agent
      .post("/api/tasks")
      .set("x-csrf-token", csrfToken)
      .send({ tarea: "Propia de Ana" });
    expect(res.status).toBe(201);
    expect(res.body.tarea.responsableId).toBe(anaId);
  });

  it("el admin ve las tareas de todo el equipo", async () => {
    const { agent } = await clienteAutenticado(app, "admin@test.com", "secreto123");
    const res = await agent.get("/api/tasks?vista=equipo");
    expect(res.status).toBe(200);
    const ids = res.body.tareas.map((t: { id: string }) => t.id);
    expect(ids).toContain(tareaDeAna);
    expect(ids).toContain(tareaDeBeto);
  });

  it("el admin puede reasignar y editar cualquier tarea", async () => {
    const { agent, csrfToken } = await clienteAutenticado(
      app,
      "admin@test.com",
      "secreto123"
    );
    const res = await agent
      .patch(`/api/tasks/${tareaDeBeto}`)
      .set("x-csrf-token", csrfToken)
      .send({ responsableId: anaId });
    expect(res.status).toBe(200);
    expect(res.body.tarea.responsableId).toBe(anaId);
  });

  it("un miembro NO puede entrar a la gestión de usuarios", async () => {
    const { agent } = await clienteAutenticado(app, "ana@test.com", "secreto123");
    const res = await agent.get("/api/users");
    expect(res.status).toBe(403);
  });

  it("no permite desactivar al último admin", async () => {
    const { agent, csrfToken } = await clienteAutenticado(
      app,
      "admin@test.com",
      "secreto123"
    );
    const res = await agent
      .patch(`/api/users/${adminId}`)
      .set("x-csrf-token", csrfToken)
      .send({ activo: false });
    expect(res.status).toBe(400);
  });
});
