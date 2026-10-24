import type { Appointment, AppointmentDetail, AppointmentStatus } from "../../../domain/entities/Appointment.js";
import type { AppointmentRepository, NewAppointment } from "../../../domain/repositories/AppointmentRepository.js";
import type { Db } from "./client.js";
import { appointmentDetailInclude, toAppointment, toAppointmentDetail } from "./mappers.js";

export class PrismaAppointmentRepository implements AppointmentRepository {
  constructor(private readonly db: Db) {}

  async create(data: NewAppointment): Promise<AppointmentDetail> {
    const row = await this.db.cita.create({
      data: {
        clienteId: data.clientId,
        barberoId: data.barberId,
        servicioId: data.serviceId,
        inicio: data.start,
        fin: data.end,
        canal: data.channel,
        precio: data.price,
        descuentoPct: data.discountPct,
        notas: data.notes,
      },
      include: appointmentDetailInclude,
    });
    return toAppointmentDetail(row);
  }

  async findDetailById(id: number): Promise<AppointmentDetail | null> {
    const row = await this.db.cita.findUnique({ where: { id }, include: appointmentDetailInclude });
    return row && toAppointmentDetail(row);
  }

  async exists(id: number): Promise<boolean> {
    return (await this.db.cita.count({ where: { id } })) > 0;
  }

  async updateStatus(id: number, status: AppointmentStatus): Promise<AppointmentDetail> {
    const row = await this.db.cita.update({ where: { id }, data: { estado: status }, include: appointmentDetailInclude });
    return toAppointmentDetail(row);
  }

  async reschedule(id: number, start: Date, end: Date): Promise<AppointmentDetail> {
    const row = await this.db.cita.update({
      where: { id },
      data: { inicio: start, fin: end },
      include: appointmentDetailInclude,
    });
    return toAppointmentDetail(row);
  }

  async findUpcomingByClientPhone(phone: string, now: Date): Promise<AppointmentDetail[]> {
    const rows = await this.db.cita.findMany({
      where: { cliente: { telefono: phone }, estado: "AGENDADA", fin: { gt: now } },
      include: appointmentDetailInclude,
      orderBy: { inicio: "asc" },
    });
    return rows.map(toAppointmentDetail);
  }

  async findActiveByClient(clientId: number, now: Date): Promise<Appointment | null> {
    const row = await this.db.cita.findFirst({ where: { clienteId: clientId, estado: "AGENDADA", fin: { gt: now } } });
    return row && toAppointment(row);
  }

  async findStartingBetween(from: Date, to: Date, barberId?: number): Promise<AppointmentDetail[]> {
    const rows = await this.db.cita.findMany({
      where: { inicio: { gte: from, lt: to }, ...(barberId ? { barberoId: barberId } : {}) },
      include: appointmentDetailInclude,
      orderBy: { inicio: "asc" },
    });
    return rows.map(toAppointmentDetail);
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
    });
    return rows.map(toAppointment);
  }
}
