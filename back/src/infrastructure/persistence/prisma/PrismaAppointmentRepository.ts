import type { Appointment } from "../../../domain/entities/Appointment.js";
import type { Client } from "../../../domain/entities/Client.js";
import type { AppointmentRepository } from "../../../domain/repositories/AppointmentRepository.js";
import type { Db } from "./client.js";
import { appointmentInclude, toAppointment } from "./mappers.js";

export class PrismaAppointmentRepository implements AppointmentRepository {
  constructor(private readonly db: Db) {}

  async findById(id: number): Promise<Appointment | null> {
    const row = await this.db.cita.findUnique({ where: { id }, include: appointmentInclude });
    return row && toAppointment(row);
  }

  async save(appointment: Appointment): Promise<Appointment> {
    // Lo único que cambia de una cita ya guardada es el estado, la hora y las notas
    const changes = {
      inicio: appointment.start,
      fin: appointment.end,
      estado: appointment.status,
      notas: appointment.notes,
    };
    const row = appointment.isNew
      ? await this.db.cita.create({
          data: {
            ...changes,
            clienteId: appointment.client.id,
            barberoId: appointment.barber.id,
            servicioId: appointment.service.id,
            canal: appointment.channel,
            precio: appointment.price,
            descuentoPct: appointment.discountPct,
            creadoEn: appointment.createdAt,
          },
          include: appointmentInclude,
        })
      : await this.db.cita.update({ where: { id: appointment.id }, data: changes, include: appointmentInclude });
    return toAppointment(row);
  }

  async findUpcomingByClientPhone(phone: string, now: Date): Promise<Appointment[]> {
    const rows = await this.db.cita.findMany({
      where: { cliente: { telefono: phone }, estado: "AGENDADA", fin: { gt: now } },
      include: appointmentInclude,
      orderBy: { inicio: "asc" },
    });
    return rows.map(toAppointment);
  }

  async findActiveByClient(client: Client, now: Date): Promise<Appointment | null> {
    const row = await this.db.cita.findFirst({
      where: { clienteId: client.id, estado: "AGENDADA", fin: { gt: now } },
      include: appointmentInclude,
    });
    return row && toAppointment(row);
  }

  async findStartingBetween(from: Date, to: Date, barberId?: number): Promise<Appointment[]> {
    const rows = await this.db.cita.findMany({
      where: { inicio: { gte: from, lt: to }, ...(barberId ? { barberoId: barberId } : {}) },
      include: appointmentInclude,
      orderBy: { inicio: "asc" },
    });
    return rows.map(toAppointment);
  }

  async findScheduledOverlapping(from: Date, to: Date, barberIds: number[], excludeId?: number): Promise<Appointment[]> {
    const rows = await this.db.cita.findMany({
      where: {
        barberoId: { in: barberIds },
        estado: "AGENDADA",
        inicio: { lt: to },
        fin: { gt: from },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      include: appointmentInclude,
    });
    return rows.map(toAppointment);
  }
}
