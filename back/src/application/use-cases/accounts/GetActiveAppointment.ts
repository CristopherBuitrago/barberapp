import type { AppointmentDetail } from "../../../domain/entities/Appointment.js";
import type { AuthSession } from "../../../domain/entities/Session.js";
import type { AppointmentRepository } from "../../../domain/repositories/AppointmentRepository.js";
import type { Clock } from "../../ports/Clock.js";

/** La próxima cita del cliente con sesión, también si la agendó por WhatsApp. El equipo no tiene. */
export class GetActiveAppointment {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly clock: Clock,
  ) {}

  async execute(session: AuthSession): Promise<AppointmentDetail | null> {
    if (session.role !== "CLIENTE") return null;
    const [next] = await this.appointments.findUpcomingByClientPhone(session.client.phone, this.clock.now());
    return next ?? null;
  }
}
