import { Prisma, type CanalCita } from "@prisma/client";
import { db } from "../lib/db.js";
import { config } from "../lib/config.js";
import { ErrorNegocio } from "../lib/errores.js";
import { aIsoLocal, sumarMinutos } from "../lib/fechas.js";
import { normalizarTelefono } from "../lib/telefono.js";
import { barberoLibre } from "./disponibilidad.js";

export interface DatosNuevaCita {
  servicioId: number;
  barberoId?: number;
  inicio: Date;
  cliente: { nombre: string; telefono: string; aceptaDatos?: boolean };
  canal: CanalCita;
  notas?: string;
}

const incluirDetalle = {
  barbero: { select: { id: true, nombre: true } },
  servicio: { select: { id: true, nombre: true, duracionMin: true } },
  cliente: { select: { id: true, nombre: true, telefono: true } },
} satisfies Prisma.CitaInclude;

type CitaConDetalle = Prisma.CitaGetPayload<{ include: typeof incluirDetalle }>;

/** Forma pública de una cita: fechas en hora local y precio final ya calculado. */
export function presentarCita(c: CitaConDetalle) {
  return {
    id: c.id,
    inicio: aIsoLocal(c.inicio),
    fin: aIsoLocal(c.fin),
    estado: c.estado,
    canal: c.canal,
    precio: c.precio,
    descuentoPct: c.descuentoPct,
    precioFinal: Math.round((c.precio * (100 - c.descuentoPct)) / 100),
    notas: c.notas,
    barbero: c.barbero,
    servicio: c.servicio,
    cliente: c.cliente,
  };
}

/**
 * Reintenta la operación si PostgreSQL aborta la transacción serializable por un
 * choque con otra reserva simultánea (P2034).
 */
async function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let intento = 0; ; intento++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (e) {
      const choque = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
      if (!choque || intento >= 2) throw e;
    }
  }
}

export async function crearCita(datos: DatosNuevaCita) {
  const servicio = await db.servicio.findFirst({ where: { id: datos.servicioId, activo: true } });
  if (!servicio) throw new ErrorNegocio(404, "Servicio no encontrado");

  const inicio = datos.inicio;
  const fin = sumarMinutos(inicio, servicio.duracionMin);
  if (inicio < new Date()) throw new ErrorNegocio(400, "Esa hora ya pasó");
  const telefono = normalizarTelefono(datos.cliente.telefono);

  const cita = await serializable(async (tx) => {
    let barberoId = datos.barberoId;
    if (barberoId) {
      if (!(await barberoLibre(tx, barberoId, inicio, fin))) {
        throw new ErrorNegocio(409, "Esa hora ya no está disponible con ese barbero");
      }
    } else {
      // "Cualquiera": el primer barbero activo que esté libre.
      const barberos = await tx.barbero.findMany({ where: { activo: true }, orderBy: { id: "asc" } });
      for (const b of barberos) {
        if (await barberoLibre(tx, b.id, inicio, fin)) {
          barberoId = b.id;
          break;
        }
      }
      if (!barberoId) throw new ErrorNegocio(409, "Esa hora ya no está disponible");
    }

    const cliente = await tx.cliente.upsert({
      where: { telefono },
      create: {
        telefono,
        nombre: datos.cliente.nombre,
        aceptaDatos: datos.cliente.aceptaDatos ?? false,
      },
      update: {
        nombre: datos.cliente.nombre,
        ...(datos.cliente.aceptaDatos ? { aceptaDatos: true } : {}),
      },
    });

    // Un cliente solo puede tener una cita activa a la vez (el panel sí puede agendar más).
    if (datos.canal !== "PANEL") {
      const activa = await tx.cita.findFirst({
        where: { clienteId: cliente.id, estado: "AGENDADA", fin: { gt: new Date() } },
      });
      if (activa) {
        throw new ErrorNegocio(409, "Ya tienes una cita agendada. Cancélala o espera a que pase para reservar otra.");
      }
    }

    // Descuento de bienvenida: primera cita después de registrarse en la plataforma.
    let descuentoPct = 0;
    if (cliente.registrado && !cliente.descuentoBienvenidaUsado) {
      descuentoPct = config.descuentoRegistroPct;
      await tx.cliente.update({
        where: { id: cliente.id },
        data: { descuentoBienvenidaUsado: true },
      });
    }

    return tx.cita.create({
      data: {
        clienteId: cliente.id,
        barberoId,
        servicioId: servicio.id,
        inicio,
        fin,
        canal: datos.canal,
        precio: servicio.precio,
        descuentoPct,
        notas: datos.notas ?? "",
      },
      include: incluirDetalle,
    });
  });

  return presentarCita(cita);
}

async function citaDelCliente(citaId: number, telefono: string) {
  const cita = await db.cita.findUnique({ where: { id: citaId }, include: incluirDetalle });
  if (!cita || cita.cliente.telefono !== normalizarTelefono(telefono)) {
    throw new ErrorNegocio(404, "Cita no encontrada");
  }
  if (cita.estado !== "AGENDADA") throw new ErrorNegocio(409, "La cita ya no está activa");
  return cita;
}

/** Estado actual de una cita, para el cliente dueño (cualquier estado). */
export async function consultarCita(citaId: number, telefono: string) {
  const cita = await db.cita.findUnique({ where: { id: citaId }, include: incluirDetalle });
  if (!cita || cita.cliente.telefono !== normalizarTelefono(telefono)) {
    throw new ErrorNegocio(404, "Cita no encontrada");
  }
  return presentarCita(cita);
}

export async function cancelarCita(citaId: number, telefono: string) {
  await citaDelCliente(citaId, telefono);
  const cita = await db.cita.update({
    where: { id: citaId },
    data: { estado: "CANCELADA" },
    include: incluirDetalle,
  });
  return presentarCita(cita);
}

export async function reprogramarCita(citaId: number, telefono: string, nuevoInicio: Date) {
  const actual = await citaDelCliente(citaId, telefono);
  if (nuevoInicio < new Date()) throw new ErrorNegocio(400, "Esa hora ya pasó");
  const nuevoFin = sumarMinutos(nuevoInicio, actual.servicio.duracionMin);

  const cita = await serializable(async (tx) => {
    if (!(await barberoLibre(tx, actual.barberoId, nuevoInicio, nuevoFin, citaId))) {
      throw new ErrorNegocio(409, "Esa hora ya no está disponible con ese barbero");
    }
    return tx.cita.update({
      where: { id: citaId },
      data: { inicio: nuevoInicio, fin: nuevoFin },
      include: incluirDetalle,
    });
  });
  return presentarCita(cita);
}

export async function citasProximasDeCliente(telefono: string) {
  const citas = await db.cita.findMany({
    where: {
      cliente: { telefono: normalizarTelefono(telefono) },
      estado: "AGENDADA",
      inicio: { gte: new Date() },
    },
    include: incluirDetalle,
    orderBy: { inicio: "asc" },
  });
  return citas.map(presentarCita);
}

export async function citasEnRango(desde: Date, hasta: Date, barberoId?: number) {
  const citas = await db.cita.findMany({
    where: {
      inicio: { gte: desde, lt: hasta },
      ...(barberoId ? { barberoId } : {}),
    },
    include: incluirDetalle,
    orderBy: { inicio: "asc" },
  });
  return citas.map(presentarCita);
}
