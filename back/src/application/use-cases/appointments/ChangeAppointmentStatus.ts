import type { AppointmentStatus } from "../../../domain/entities/Appointment.js";
import { NotFoundError } from "../../../domain/errors/DomainError.js";
import type { AppointmentRepository } from "../../../domain/repositories/AppointmentRepository.js";

/** Desde el panel: marcar una cita como completada, no asistió, cancelada o agendada otra vez. */
export class ChangeAppointmentStatus {
  constructor(private readonly appointments: AppointmentRepository) {}

  async execute(input: { appointmentId: number; status: AppointmentStatus }) {
    if (!(await this.appointments.exists(input.appointmentId))) throw new NotFoundError("Cita no encontrada");
    await this.appointments.updateStatus(input.appointmentId, input.status);
    return { id: input.appointmentId, status: input.status };
  }
}
