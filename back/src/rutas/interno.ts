import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { config } from "../lib/config.js";
import { soloAgente } from "../lib/auth.js";
import { ErrorNegocio } from "../lib/errores.js";
import { aIsoLocal, rangoDia } from "../lib/fechas.js";
import { normalizarTelefono } from "../lib/telefono.js";
import { citasEnRango, citasProximasDeCliente } from "../servicios/citas.js";
import { fecha, id, instante } from "./esquemas.js";

/** Rutas solo para el agente de WhatsApp (header x-api-key). */
export const rutasInterno = Router();
rutasInterno.use(soloAgente);

/** Quién escribe: un barbero (modo barbero) o un cliente (con sus próximas citas). */
rutasInterno.get("/contactos/:telefono", async (req, res) => {
  const tel = normalizarTelefono(req.params.telefono);
  const barbero = await db.barbero.findFirst({
    where: { telefono: tel, activo: true },
    select: { id: true, nombre: true },
  });
  if (barbero) {
    res.json({ tipo: "barbero", barbero });
    return;
  }
  const cliente = await db.cliente.findUnique({ where: { telefono: tel } });
  res.json({
    tipo: "cliente",
    cliente: cliente && {
      nombre: cliente.nombre,
      registrado: cliente.registrado,
      descuentoPendientePct:
        cliente.registrado && !cliente.descuentoBienvenidaUsado ? config.descuentoRegistroPct : 0,
    },
    citasProximas: await citasProximasDeCliente(tel),
  });
});

rutasInterno.get("/agenda", async (req, res) => {
  const q = z.object({ fecha, barberoId: id.optional() }).parse(req.query);
  const { desde, hasta } = rangoDia(q.fecha);
  const citas = await citasEnRango(desde, hasta, q.barberoId);
  res.json(citas.filter((c) => c.estado !== "CANCELADA"));
});

rutasInterno.post("/bloqueos", async (req, res) => {
  const body = z
    .object({ barberoId: id, inicio: instante, fin: instante, motivo: z.string().max(120).optional() })
    .parse(req.body);
  if (body.fin <= body.inicio) throw new ErrorNegocio(400, "El fin debe ser después del inicio");
  const bloqueo = await db.bloqueoHorario.create({
    data: { barberoId: body.barberoId, inicio: body.inicio, fin: body.fin, motivo: body.motivo ?? "" },
  });
  res.status(201).json({ ...bloqueo, inicio: aIsoLocal(bloqueo.inicio), fin: aIsoLocal(bloqueo.fin) });
});
