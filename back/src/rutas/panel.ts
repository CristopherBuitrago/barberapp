import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { soloEquipo } from "../lib/sesion.js";
import { ErrorNegocio } from "../lib/errores.js";
import { aInstante, aIsoLocal } from "../lib/fechas.js";
import { citasEnRango, crearCita } from "../servicios/citas.js";
import { fecha, id, instante, nuevaCita } from "./esquemas.js";

/** Rutas del panel de la barbería (sesión de un barbero o del admin). */
export const rutasPanel = Router();
rutasPanel.use(soloEquipo);

rutasPanel.get("/verificar", (_req, res) => {
  res.json({ ok: true });
});

/** Citas entre dos fechas locales (ambas incluidas). */
rutasPanel.get("/citas", async (req, res) => {
  const q = z.object({ desde: fecha, hasta: fecha, barberoId: id.optional() }).parse(req.query);
  const hasta = new Date(aInstante(q.hasta, "00:00").getTime() + 24 * 60 * 60 * 1000);
  res.json(await citasEnRango(aInstante(q.desde, "00:00"), hasta, q.barberoId));
});

/** Cita creada desde el panel (cliente que llega o llama). */
rutasPanel.post("/citas", async (req, res) => {
  const datos = nuevaCita.parse(req.body);
  res.status(201).json(await crearCita({ ...datos, canal: "PANEL" }));
});

rutasPanel.patch("/citas/:id/estado", async (req, res) => {
  const citaId = id.parse(req.params.id);
  const { estado } = z
    .object({ estado: z.enum(["AGENDADA", "CANCELADA", "COMPLETADA", "NO_ASISTIO"]) })
    .parse(req.body);
  const existe = await db.cita.findUnique({ where: { id: citaId } });
  if (!existe) throw new ErrorNegocio(404, "Cita no encontrada");
  await db.cita.update({ where: { id: citaId }, data: { estado } });
  res.json({ id: citaId, estado });
});

rutasPanel.get("/barberos", async (_req, res) => {
  res.json(
    await db.barbero.findMany({ include: { horarios: true }, orderBy: { id: "asc" } }),
  );
});

rutasPanel.get("/bloqueos", async (req, res) => {
  const q = z.object({ desde: fecha, hasta: fecha }).parse(req.query);
  const hasta = new Date(aInstante(q.hasta, "00:00").getTime() + 24 * 60 * 60 * 1000);
  const bloqueos = await db.bloqueoHorario.findMany({
    where: { inicio: { lt: hasta }, fin: { gt: aInstante(q.desde, "00:00") } },
    include: { barbero: { select: { id: true, nombre: true } } },
    orderBy: { inicio: "asc" },
  });
  res.json(bloqueos.map((b) => ({ ...b, inicio: aIsoLocal(b.inicio), fin: aIsoLocal(b.fin) })));
});

rutasPanel.post("/bloqueos", async (req, res) => {
  const body = z
    .object({ barberoId: id, inicio: instante, fin: instante, motivo: z.string().max(120).optional() })
    .parse(req.body);
  if (body.fin <= body.inicio) throw new ErrorNegocio(400, "El fin debe ser después del inicio");
  const b = await db.bloqueoHorario.create({
    data: { barberoId: body.barberoId, inicio: body.inicio, fin: body.fin, motivo: body.motivo ?? "" },
  });
  res.status(201).json({ ...b, inicio: aIsoLocal(b.inicio), fin: aIsoLocal(b.fin) });
});

rutasPanel.delete("/bloqueos/:id", async (req, res) => {
  const bloqueoId = id.parse(req.params.id);
  await db.bloqueoHorario.delete({ where: { id: bloqueoId } }).catch(() => {
    throw new ErrorNegocio(404, "Bloqueo no encontrado");
  });
  res.status(204).end();
});
