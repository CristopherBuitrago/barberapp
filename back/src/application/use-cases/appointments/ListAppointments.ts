import type { Appointment } from "../../../domain/entities/Appointment.js";
import type { Page, PageRequest } from "../../../domain/repositories/Pagination.js";
import type { AppointmentRepository } from "../../../domain/repositories/AppointmentRepository.js";
import { addDays, type TimeZone } from "../../../domain/value-objects/TimeZone.js";

/** Citas del calendario del panel entre dos fechas locales, las dos incluidas. */
export class ListAppointments {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly timeZone: TimeZone,
  ) {}

  execute(input: { fromDate: string; toDate: string; barberId?: number; page: PageRequest }): Promise<Page<Appointment>> {
    return this.appointments.findStartingBetween(
      this.timeZone.toInstant(input.fromDate, "00:00"),
      this.timeZone.toInstant(addDays(input.toDate, 1), "00:00"),
      { barberId: input.barberId },
      input.page,
    );
  }
}
