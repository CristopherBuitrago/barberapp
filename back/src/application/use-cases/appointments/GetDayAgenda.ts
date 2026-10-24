import type { Appointment } from "../../../domain/entities/Appointment.js";
import type { Page, PageRequest } from "../../../domain/repositories/Pagination.js";
import type { AppointmentRepository } from "../../../domain/repositories/AppointmentRepository.js";
import type { TimeZone } from "../../../domain/value-objects/TimeZone.js";

/** La agenda de un día para el agente, sin las citas canceladas. */
export class GetDayAgenda {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly timeZone: TimeZone,
  ) {}

  execute(input: { date: string; barberId?: number; page: PageRequest }): Promise<Page<Appointment>> {
    const { from, to } = this.timeZone.dayRange(input.date);
    return this.appointments.findStartingBetween(from, to, { barberId: input.barberId, excludeCancelled: true }, input.page);
  }
}
