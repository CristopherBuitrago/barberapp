import type { Appointment } from "../../../domain/entities/Appointment.js";
import type { AppointmentRepository } from "../../../domain/repositories/AppointmentRepository.js";
import type { OwnerAppointmentInput } from "../../dtos/appointments.js";
import { findOwnedAppointment } from "./ownedAppointment.js";

export class CancelAppointment {
  constructor(private readonly appointments: AppointmentRepository) {}

  async execute(input: OwnerAppointmentInput): Promise<Appointment> {
    const appointment = await findOwnedAppointment(this.appointments, input.appointmentId, input.phone);
    appointment.cancel();
    return this.appointments.save(appointment);
  }
}
