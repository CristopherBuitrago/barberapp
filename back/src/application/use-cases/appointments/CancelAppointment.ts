import { AppointmentStatus, type AppointmentDetail } from "../../../domain/entities/Appointment.js";
import { ConflictError } from "../../../domain/errors/DomainError.js";
import type { AppointmentRepository } from "../../../domain/repositories/AppointmentRepository.js";
import type { OwnerAppointmentInput } from "../../dtos/appointments.js";
import { findOwnedAppointment } from "./ownedAppointment.js";

export class CancelAppointment {
  constructor(private readonly appointments: AppointmentRepository) {}

  async execute(input: OwnerAppointmentInput): Promise<AppointmentDetail> {
    const appointment = await findOwnedAppointment(this.appointments, input.appointmentId, input.phone);
    if (appointment.status !== AppointmentStatus.Scheduled) throw new ConflictError("La cita ya no está activa");
    return this.appointments.updateStatus(appointment.id, AppointmentStatus.Cancelled);
  }
}
