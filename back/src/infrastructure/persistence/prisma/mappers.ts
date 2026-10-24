/**
 * La base sigue con sus nombres en español (Barbero, Cita, etc.). Aquí se arman las
 * clases del dominio con sus relaciones a partir de las filas de Prisma, y los include
 * dicen qué relaciones hay que traer para poder armarlas completas.
 */
import type { Cliente, Imagen, Prisma } from "@prisma/client";
import { Appointment } from "../../../domain/entities/Appointment.js";
import { Barber } from "../../../domain/entities/Barber.js";
import { Client } from "../../../domain/entities/Client.js";
import { Image } from "../../../domain/entities/Image.js";
import { Service } from "../../../domain/entities/Service.js";
import { TimeBlock } from "../../../domain/entities/TimeBlock.js";
import { WorkSchedule } from "../../../domain/entities/WorkSchedule.js";

// --- Qué relaciones traer ---

export const barberInclude = { horarios: { orderBy: { id: "asc" } } } satisfies Prisma.BarberoInclude;

export const serviceInclude = {
  creadoPor: { include: barberInclude },
  actualizadoPor: { include: barberInclude },
} satisfies Prisma.ServicioInclude;

export const appointmentInclude = {
  cliente: true,
  barbero: { include: barberInclude },
  servicio: { include: serviceInclude },
} satisfies Prisma.CitaInclude;

export const timeBlockInclude = { barbero: { include: barberInclude } } satisfies Prisma.BloqueoHorarioInclude;


type BarberRow = Prisma.BarberoGetPayload<{ include: typeof barberInclude }>;
type ServiceRow = Prisma.ServicioGetPayload<{ include: typeof serviceInclude }>;
type AppointmentRow = Prisma.CitaGetPayload<{ include: typeof appointmentInclude }>;
type TimeBlockRow = Prisma.BloqueoHorarioGetPayload<{ include: typeof timeBlockInclude }>;

// --- De la fila a la clase ---

export function toBarber(row: BarberRow): Barber {
  return Barber.restore(row.id, {
    name: row.nombre,
    phone: row.telefono,
    active: row.activo,
    passwordHash: row.claveHash,
    isAdmin: row.esAdmin,
    schedules: row.horarios.map((h) =>
      WorkSchedule.restore(h.id, { barberId: h.barberoId, weekday: h.diaSemana, startTime: h.horaInicio, endTime: h.horaFin }),
    ),
  });
}

export function toClient(row: Cliente): Client {
  return Client.restore(row.id, {
    name: row.nombre,
    phone: row.telefono,
    birthDate: row.fechaNacimiento,
    registered: row.registrado,
    acceptsDataPolicy: row.aceptaDatos,
    welcomeDiscountUsed: row.descuentoBienvenidaUsado,
    passwordHash: row.claveHash,
    createdAt: row.creadoEn,
  });
}

export function toService(row: ServiceRow): Service {
  return Service.restore(row.id, {
    name: row.nombre,
    description: row.descripcion,
    durationMin: row.duracionMin,
    price: row.precio,
    imageUrl: row.imagenUrl,
    active: row.activo,
    createdBy: row.creadoPor && toBarber(row.creadoPor),
    updatedBy: row.actualizadoPor && toBarber(row.actualizadoPor),
    createdAt: row.creadoEn,
    updatedAt: row.actualizadoEn,
  });
}

export function toAppointment(row: AppointmentRow): Appointment {
  return Appointment.restore(row.id, {
    client: toClient(row.cliente),
    barber: toBarber(row.barbero),
    service: toService(row.servicio),
    start: row.inicio,
    end: row.fin,
    status: row.estado,
    channel: row.canal,
    price: row.precio,
    discountPct: row.descuentoPct,
    notes: row.notas,
    createdAt: row.creadoEn,
  });
}

export function toTimeBlock(row: TimeBlockRow): TimeBlock {
  return TimeBlock.restore(row.id, { barber: toBarber(row.barbero), start: row.inicio, end: row.fin, reason: row.motivo });
}

export function toImage(row: Imagen): Image {
  return Image.restore(row.id, { type: row.tipo, data: row.datos, createdAt: row.creadaEn });
}
