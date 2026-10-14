import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { esAgente } from "../lib/auth.js";
import { sesionDe } from "../lib/sesion.js";
import { ErrorNegocio } from "../lib/errores.js";
import { consultarDisponibilidad } from "../servicios/disponibilidad.js";
import { cancelarCita, consultarCita, crearCita, reprogramarCita } from "../servicios/citas.js";
import { fecha, id, instante, nuevaCita, telefono } from "./esquemas.js";

/** Rutas que usa la web del cliente (y también el agente). */
export const rutasPublicas = Router();

rutasPublicas.get("/servicios", async (_req, res) => {
  res.json(await db.servicio.findMany({ where: { activo: true }, orderBy: { id: "asc" } }));
});

rutasPublicas.get("/barberos", async (_req, res) => {
  res.json(
    await db.barbero.findMany({
      where: { activo: true },
      select: { id: true, nombre: true },
      orderBy: { id: "asc" },
    }),
  );
});

rutasPublicas.get("/disponibilidad", async (req, res) => {
  const q = z
    .object({ servicioId: id, fecha, barberoId: id.optional() })
    .parse(req.query);
  res.json(await consultarDisponibilidad(q.servicioId, q.fecha, q.barberoId));
});

rutasPublicas.post("/citas", async (req, res) => {
  const datos = nuevaCita.parse(req.body);
  const canal = esAgente(req.header("x-api-key")) ? "WHATSAPP" : "WEB";
  // Con sesión de cliente, la cita es suya: se usan su nombre y teléfono, no los del formulario.
  const sesion = sesionDe(res);
  if (canal === "WEB" && sesion?.rol === "CLIENTE") {
    datos.cliente = { nombre: sesion.cliente.nombre, telefono: sesion.cliente.telefono, aceptaDatos: true };
  }
  if (canal === "WEB" && !datos.cliente.aceptaDatos) {
    throw new ErrorNegocio(400, "Debes aceptar el tratamiento de datos personales");
  }
  res.status(201).json(await crearCita({ ...datos, canal }));
});

rutasPublicas.get("/citas/:id", async (req, res) => {
  const citaId = id.parse(req.params.id);
  const q = z.object({ telefono }).parse(req.query);
  res.json(await consultarCita(citaId, q.telefono));
});

rutasPublicas.post("/citas/:id/cancelar", async (req, res) => {
  const citaId = id.parse(req.params.id);
  const body = z.object({ telefono }).parse(req.body);
  res.json(await cancelarCita(citaId, body.telefono));
});

rutasPublicas.post("/citas/:id/reprogramar", async (req, res) => {
  const citaId = id.parse(req.params.id);
  const body = z.object({ telefono, inicio: instante }).parse(req.body);
  res.json(await reprogramarCita(citaId, body.telefono, body.inicio));
});
