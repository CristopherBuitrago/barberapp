import type { Appointment, AppointmentDetail, AppointmentStatus, BookingChannel } from "../entities/Appointment.js";

export interface NewAppointment {
  clientId: number;
  barberId: number;
  serviceId: number;
  start: Date;
  end: Date;
  channel: BookingChannel;
  price: number;
  discountPct: number;
  notes: string;
}

export interface AppointmentRepository {
  create(data: NewAppointment): Promise<AppointmentDetail>;
  findDetailById(id: number): Promise<AppointmentDetail | null>;
  exists(id: number): Promise<boolean>;
  updateStatus(id: number, status: AppointmentStatus): Promise<AppointmentDetail>;
  reschedule(id: number, start: Date, end: Date): Promise<AppointmentDetail>;
  /** Agendadas que todavía no han terminado, de la más próxima a la más lejana */
  findUpcomingByClientPhone(phone: string, now: Date): Promise<AppointmentDetail[]>;
  findActiveByClient(clientId: number, now: Date): Promise<Appointment | null>;
  /** Las que empiezan en [from, to), en cualquier estado */
  findStartingBetween(from: Date, to: Date, barberId?: number): Promise<AppointmentDetail[]>;
  /** Las agendadas que se cruzan con [from, to) */
  findScheduledOverlapping(from: Date, to: Date, barberIds: number[], excludeId?: number): Promise<Appointment[]>;
}
