/**
 * Rutas de tareas: /api/tasks/*
 * Todas requieren autenticación. Los permisos finos se validan en el servicio.
 */
import { Router } from "express";
import multer from "multer";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware";
import { validarBody } from "../lib/validate";
import {
  actualizarTareaSchema,
  crearTareaSchema,
  filtrosTareasSchema,
  moverTareaSchema,
} from "./tasks.schema";
import {
  actualizarTarea,
  crearTarea,
  eliminarTarea,
  listarTareas,
  moverTarea,
  obtenerHistorial,
  obtenerTarea,
} from "./tasks.service";
import { emitirCambioTarea } from "../events/sse";
import { tareasACsv } from "../csv/export";
import { importarCsv } from "../csv/import";

export const tasksRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

tasksRouter.use(requireAuth);

// Listar tareas (con filtros)
tasksRouter.get("/", async (req, res) => {
  const filtros = filtrosTareasSchema.parse(req.query);
  const tareas = await listarTareas(req.usuario!, filtros);
  res.json({ tareas });
});

// Exportar CSV de las tareas visibles (respeta filtros)
tasksRouter.get("/export.csv", async (req, res) => {
  const filtros = filtrosTareasSchema.parse(req.query);
  const tareas = await listarTareas(req.usuario!, filtros);
  const csv = tareasACsv(tareas);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="tareas-${new Date().toISOString().slice(0, 10)}.csv"`
  );
  res.send(csv);
});

// Importar CSV (solo admin)
tasksRouter.post(
  "/import",
  requireAdmin,
  upload.single("archivo"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Falta el archivo CSV (campo 'archivo')" });
    }
    const contenido = req.file.buffer.toString("utf-8");
    const resultado = await importarCsv(req.usuario!, contenido);
    // Avisar a los clientes que hubo cambios masivos.
    emitirCambioTarea({
      tipo: "creada",
      tareaId: "*",
      responsableId: "*",
      porUsuarioId: req.usuario!.id,
    });
    res.json(resultado);
  }
);

// Obtener una tarea
tasksRouter.get("/:id", async (req, res) => {
  const tarea = await obtenerTarea(req.usuario!, req.params.id);
  res.json({ tarea });
});

// Historial de una tarea
tasksRouter.get("/:id/historial", async (req, res) => {
  const historial = await obtenerHistorial(req.usuario!, req.params.id);
  res.json({ historial });
});

// Crear tarea
tasksRouter.post("/", validarBody(crearTareaSchema), async (req, res) => {
  const tarea = await crearTarea(req.usuario!, req.body);
  emitirCambioTarea({
    tipo: "creada",
    tareaId: tarea.id,
    responsableId: tarea.responsableId,
    porUsuarioId: req.usuario!.id,
  });
  res.status(201).json({ tarea });
});

// Actualizar tarea
tasksRouter.patch(
  "/:id",
  validarBody(actualizarTareaSchema),
  async (req, res) => {
    const tarea = await actualizarTarea(req.usuario!, req.params.id, req.body);
    emitirCambioTarea({
      tipo: "actualizada",
      tareaId: tarea.id,
      responsableId: tarea.responsableId,
      porUsuarioId: req.usuario!.id,
    });
    res.json({ tarea });
  }
);

// Mover/reordenar tarea
tasksRouter.patch(
  "/:id/mover",
  validarBody(moverTareaSchema),
  async (req, res) => {
    const { tarea } = await moverTarea(req.usuario!, req.params.id, req.body);
    emitirCambioTarea({
      tipo: "movida",
      tareaId: tarea.id,
      responsableId: tarea.responsableId,
      porUsuarioId: req.usuario!.id,
    });
    res.json({ tarea });
  }
);

// Eliminar tarea
tasksRouter.delete("/:id", async (req, res) => {
  const { responsableId } = await eliminarTarea(req.usuario!, req.params.id);
  emitirCambioTarea({
    tipo: "eliminada",
    tareaId: req.params.id,
    responsableId,
    porUsuarioId: req.usuario!.id,
  });
  res.json({ ok: true });
});
