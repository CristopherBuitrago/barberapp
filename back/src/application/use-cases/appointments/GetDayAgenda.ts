import { AppointmentStatus, type AppointmentDetail } from "../../../domain/entities/Appointment.js";
import type { AppointmentRepository } from "../../../domain/repositories/AppointmentRepository.js";
import type { TimeZone } from "../../../domain/value-objects/TimeZone.js";

/** La agenda de un día para el agente, sin las citas canceladas. */
export class GetDayAgenda {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly timeZone: TimeZone,
  ) {}

  async execute(input: { date: string; barberId?: number }): Promise<AppointmentDetail[]> {
    const { from, to } = this.timeZone.dayRange(input.date);
    const appointments = await this.appointments.findStartingBetween(from, to, input.barberId);
    return appointments.filter((a) => a.status !== AppointmentStatus.Cancelled);
  }
}
