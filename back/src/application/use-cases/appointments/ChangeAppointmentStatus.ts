import { ErrorCode } from "../../../domain/errors/ErrorCode.js";
import type { Appointment, AppointmentStatus } from "../../../domain/entities/Appointment.js";
import { NotFoundError } from "../../../domain/errors/DomainError.js";
import type { AppointmentRepository } from "../../../domain/repositories/AppointmentRepository.js";

/** Desde el panel: marcar una cita como completada, no asistió, cancelada o agendada otra vez. */
export class ChangeAppointmentStatus {
  constructor(private readonly appointments: AppointmentRepository) {}

  async execute(input: { appointmentId: number; status: AppointmentStatus }): Promise<Appointment> {
    const appointment = await this.appointments.findById(input.appointmentId);
    if (!appointment) throw new NotFoundError("Cita no encontrada", ErrorCode.AppointmentNotFound);
    appointment.status = input.status;
    return this.appointments.save(appointment);
  }
}
