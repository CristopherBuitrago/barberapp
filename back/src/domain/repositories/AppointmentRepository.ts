import type { Appointment } from "../entities/Appointment.js";
import type { Client } from "../entities/Client.js";

/** Las citas vienen con su cliente, su barbero y su servicio. */
export interface AppointmentRepository {
  findById(id: number): Promise<Appointment | null>;
  save(appointment: Appointment): Promise<Appointment>;
  /** Agendadas que todavía no han terminado, de la más próxima a la más lejana */
  findUpcomingByClientPhone(phone: string, now: Date): Promise<Appointment[]>;
  findActiveByClient(client: Client, now: Date): Promise<Appointment | null>;
  /** Las que empiezan en [from, to), en cualquier estado */
  findStartingBetween(from: Date, to: Date, barberId?: number): Promise<Appointment[]>;
  /** Las agendadas que se cruzan con [from, to) */
  findScheduledOverlapping(from: Date, to: Date, barberIds: number[], excludeId?: number): Promise<Appointment[]>;
}
