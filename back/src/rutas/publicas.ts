import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { config } from "../lib/config.js";
import { esAgente } from "../lib/auth.js";
import { ErrorNegocio } from "../lib/errores.js";
import { normalizarTelefono } from "../lib/telefono.js";
import { consultarDisponibilidad } from "../servicios/disponibilidad.js";
import { cancelarCita, crearCita, reprogramarCita } from "../servicios/citas.js";
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
  if (canal === "WEB" && !datos.cliente.aceptaDatos) {
    throw new ErrorNegocio(400, "Debes aceptar el tratamiento de datos personales");
  }
  res.status(201).json(await crearCita({ ...datos, canal }));
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

/** Registro en la plataforma: da el descuento de bienvenida para la próxima cita. */
rutasPublicas.post("/clientes/registro", async (req, res) => {
  const body = z
    .object({
      nombre: z.string().trim().min(1).max(80),
      telefono,
      fechaNacimiento: fecha.optional(),
      aceptaDatos: z.literal(true, { error: "Debes aceptar el tratamiento de datos" }),
    })
    .parse(req.body);

  const tel = normalizarTelefono(body.telefono);
  const datos = {
    nombre: body.nombre,
    registrado: true,
    aceptaDatos: true,
    fechaNacimiento: body.fechaNacimiento ? new Date(`${body.fechaNacimiento}T00:00:00Z`) : null,
  };
  const cliente = await db.cliente.upsert({
    where: { telefono: tel },
    create: { telefono: tel, ...datos },
    update: datos,
  });
  res.json({
    nombre: cliente.nombre,
    descuentoPct: cliente.descuentoBienvenidaUsado ? 0 : config.descuentoRegistroPct,
  });
});
