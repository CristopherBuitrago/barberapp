/**
 * La base sigue con sus nombres en español (Barbero, Cita, etc.). Aquí se traducen
 * las filas de Prisma a las entidades del dominio.
 */
import type {
  Barbero,
  BloqueoHorario,
  Cita,
  Cliente,
  HorarioBarbero,
  Imagen,
  Prisma,
  Servicio,
  Sesion,
} from "@prisma/client";
import type { Appointment, AppointmentDetail } from "../../../domain/entities/Appointment.js";
import type { Barber, BarberSummary, WorkSchedule } from "../../../domain/entities/Barber.js";
import type { Client } from "../../../domain/entities/Client.js";
import type { Image } from "../../../domain/entities/Image.js";
import type { Service, ServiceWithAuthors } from "../../../domain/entities/Service.js";
import type { Session } from "../../../domain/entities/Session.js";
import type { TimeBlock, TimeBlockWithBarber } from "../../../domain/entities/TimeBlock.js";

export const barberSummarySelect = { select: { id: true, nombre: true } } as const;

export function toBarberSummary(row: { id: number; nombre: string }): BarberSummary {
  return { id: row.id, name: row.nombre };
}

export function toBarber(row: Barbero): Barber {
  return {
    id: row.id,
    name: row.nombre,
    phone: row.telefono,
    active: row.activo,
    passwordHash: row.claveHash,
    isAdmin: row.esAdmin,
  };
}

export function toWorkSchedule(row: HorarioBarbero): WorkSchedule {
  return {
    id: row.id,
    barberId: row.barberoId,
    weekday: row.diaSemana,
    startTime: row.horaInicio,
    endTime: row.horaFin,
  };
}

export function toClient(row: Cliente): Client {
  return {
    id: row.id,
    name: row.nombre,
    phone: row.telefono,
    birthDate: row.fechaNacimiento,
    registered: row.registrado,
    acceptsDataPolicy: row.aceptaDatos,
    welcomeDiscountUsed: row.descuentoBienvenidaUsado,
    passwordHash: row.claveHash,
    createdAt: row.creadoEn,
  };
}

export function toService(row: Servicio): Service {
  return {
    id: row.id,
    name: row.nombre,
    description: row.descripcion,
    durationMin: row.duracionMin,
    price: row.precio,
    imageUrl: row.imagenUrl,
    active: row.activo,
    createdById: row.creadoPorId,
    updatedById: row.actualizadoPorId,
    createdAt: row.creadoEn,
    updatedAt: row.actualizadoEn,
  };
}

export const serviceAuthorsInclude = {
  creadoPor: barberSummarySelect,
  actualizadoPor: barberSummarySelect,
} satisfies Prisma.ServicioInclude;

export function toServiceWithAuthors(
  row: Prisma.ServicioGetPayload<{ include: typeof serviceAuthorsInclude }>,
): ServiceWithAuthors {
  return {
    ...toService(row),
    createdBy: row.creadoPor && toBarberSummary(row.creadoPor),
    updatedBy: row.actualizadoPor && toBarberSummary(row.actualizadoPor),
  };
}

export function toAppointment(row: Cita): Appointment {
  return {
    id: row.id,
    clientId: row.clienteId,
    barberId: row.barberoId,
    serviceId: row.servicioId,
    start: row.inicio,
    end: row.fin,
    status: row.estado,
    channel: row.canal,
    price: row.precio,
    discountPct: row.descuentoPct,
    notes: row.notas,
    createdAt: row.creadoEn,
  };
}

export const appointmentDetailInclude = {
  barbero: barberSummarySelect,
  servicio: { select: { id: true, nombre: true, duracionMin: true } },
  cliente: { select: { id: true, nombre: true, telefono: true } },
} satisfies Prisma.CitaInclude;

export function toAppointmentDetail(
  row: Prisma.CitaGetPayload<{ include: typeof appointmentDetailInclude }>,
): AppointmentDetail {
  return {
    ...toAppointment(row),
    barber: toBarberSummary(row.barbero),
    service: { id: row.servicio.id, name: row.servicio.nombre, durationMin: row.servicio.duracionMin },
    client: { id: row.cliente.id, name: row.cliente.nombre, phone: row.cliente.telefono },
  };
}

export function toTimeBlock(row: BloqueoHorario): TimeBlock {
  return { id: row.id, barberId: row.barberoId, start: row.inicio, end: row.fin, reason: row.motivo };
}

export function toTimeBlockWithBarber(
  row: BloqueoHorario & { barbero: { id: number; nombre: string } },
): TimeBlockWithBarber {
  return { ...toTimeBlock(row), barber: toBarberSummary(row.barbero) };
}

export function toSession(row: Sesion): Session {
  return {
    id: row.id,
    tokenHash: row.tokenHash,
    clientId: row.clienteId,
    barberId: row.barberoId,
    expiresAt: row.expira,
  };
}

export function toImage(row: Imagen): Image {
  return { id: row.id, type: row.tipo, data: row.datos, createdAt: row.creadaEn };
}
