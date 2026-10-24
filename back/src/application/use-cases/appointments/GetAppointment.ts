import type { AppointmentDetail } from "../../../domain/entities/Appointment.js";
import type { AppointmentRepository } from "../../../domain/repositories/AppointmentRepository.js";
import type { OwnerAppointmentInput } from "../../dtos/appointments.js";
import { findOwnedAppointment } from "./ownedAppointment.js";

/** Cómo va la cita, para el cliente dueño. Sirve en cualquier estado. */
export class GetAppointment {
  constructor(private readonly appointments: AppointmentRepository) {}

  execute(input: OwnerAppointmentInput): Promise<AppointmentDetail> {
    return findOwnedAppointment(this.appointments, input.appointmentId, input.phone);
  }
}
