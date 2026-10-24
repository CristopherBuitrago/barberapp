import { ErrorCode } from "../../../domain/errors/ErrorCode.js";
import type { Appointment } from "../../../domain/entities/Appointment.js";
import { NotFoundError } from "../../../domain/errors/DomainError.js";
import type { AppointmentRepository } from "../../../domain/repositories/AppointmentRepository.js";
import { normalizePhone } from "../../../domain/value-objects/PhoneNumber.js";

/**
 * Trae la cita solo si el teléfono es el del dueño. Si no, responde que no existe
 * para no dar pistas de citas ajenas.
 */
export async function findOwnedAppointment(
  appointments: AppointmentRepository,
  appointmentId: number,
  phone: string,
): Promise<Appointment> {
  const appointment = await appointments.findById(appointmentId);
  if (!appointment || !appointment.belongsToPhone(normalizePhone(phone))) {
    throw new NotFoundError("Cita no encontrada", ErrorCode.AppointmentNotFound);
  }
  return appointment;
}
