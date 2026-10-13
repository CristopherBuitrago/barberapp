import type { Prisma } from "@prisma/client";
import { db } from "../lib/db.js";
import { config } from "../lib/config.js";
import { ErrorNegocio } from "../lib/errores.js";
import {
  aInstante,
  aIsoLocal,
  diaSemana,
  fechaLocal,
  rangoDia,
  seCruzan,
  sumarMinutos,
} from "../lib/fechas.js";

type Tx = Prisma.TransactionClient;

/** Margen mínimo para reservar: no se ofrecen horas que empiezan en menos de esto. */
const ANTICIPACION_MIN = 15;

export interface HoraDisponible {
  inicio: string;
  barberos: { id: number; nombre: string }[];
}

/**
 * Horas libres de un día para un servicio. Si no se indica barbero, junta las de todos
 * y devuelve, por hora, qué barberos pueden atender.
 */
export async function consultarDisponibilidad(
  servicioId: number,
  fecha: string,
  barberoId?: number,
): Promise<HoraDisponible[]> {
  const servicio = await db.servicio.findFirst({ where: { id: servicioId, activo: true } });
  if (!servicio) throw new ErrorNegocio(404, "Servicio no encontrado");

  const { desde, hasta } = rangoDia(fecha);
  const barberos = await db.barbero.findMany({
    where: { activo: true, ...(barberoId ? { id: barberoId } : {}) },
    include: {
      horarios: { where: { diaSemana: diaSemana(fecha) } },
      bloqueos: { where: { inicio: { lt: hasta }, fin: { gt: desde } } },
      citas: { where: { estado: "AGENDADA", inicio: { lt: hasta }, fin: { gt: desde } } },
    },
    orderBy: { id: "asc" },
  });

  const limite = sumarMinutos(new Date(), ANTICIPACION_MIN);
  const porHora = new Map<string, HoraDisponible>();

  for (const barbero of barberos) {
    const ocupados = [...barbero.bloqueos, ...barbero.citas];
    for (const horario of barbero.horarios) {
      const finJornada = aInstante(fecha, horario.horaFin);
      for (
        let inicio = aInstante(fecha, horario.horaInicio);
        sumarMinutos(inicio, servicio.duracionMin) <= finJornada;
        inicio = sumarMinutos(inicio, config.intervaloMin)
      ) {
        const fin = sumarMinutos(inicio, servicio.duracionMin);
        if (inicio < limite) continue;
        if (ocupados.some((o) => seCruzan(inicio, fin, o.inicio, o.fin))) continue;

        const clave = aIsoLocal(inicio);
        const hora = porHora.get(clave) ?? { inicio: clave, barberos: [] };
        hora.barberos.push({ id: barbero.id, nombre: barbero.nombre });
        porHora.set(clave, hora);
      }
    }
  }

  return [...porHora.values()].sort((a, b) => a.inicio.localeCompare(b.inicio));
}

/**
 * Verifica dentro de una transacción que el barbero pueda atender en [inicio, fin):
 * dentro de su jornada, sin bloqueos y sin otra cita agendada.
 */
export async function barberoLibre(
  tx: Tx,
  barberoId: number,
  inicio: Date,
  fin: Date,
  excluirCitaId?: number,
): Promise<boolean> {
  const fecha = fechaLocal(inicio);
  const horarios = await tx.horarioBarbero.findMany({
    where: { barberoId, diaSemana: diaSemana(fecha) },
  });
  const dentroDeJornada = horarios.some(
    (h) => aInstante(fecha, h.horaInicio) <= inicio && fin <= aInstante(fecha, h.horaFin),
  );
  if (!dentroDeJornada) return false;

  const bloqueo = await tx.bloqueoHorario.findFirst({
    where: { barberoId, inicio: { lt: fin }, fin: { gt: inicio } },
  });
  if (bloqueo) return false;

  const cita = await tx.cita.findFirst({
    where: {
      barberoId,
      estado: "AGENDADA",
      inicio: { lt: fin },
      fin: { gt: inicio },
      ...(excluirCitaId ? { id: { not: excluirCitaId } } : {}),
    },
  });
  return !cita;
}
