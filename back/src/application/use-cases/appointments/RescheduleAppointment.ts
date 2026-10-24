import type { Appointment } from "../../../domain/entities/Appointment.js";
import { ConflictError, RuleViolationError } from "../../../domain/errors/DomainError.js";
import type { AppointmentRepository } from "../../../domain/repositories/AppointmentRepository.js";
import { addMinutes, type TimeZone } from "../../../domain/value-objects/TimeZone.js";
import type { RescheduleAppointmentInput } from "../../dtos/appointments.js";
import type { Clock } from "../../ports/Clock.js";
import type { TransactionRunner } from "../../ports/TransactionRunner.js";
import { isBarberFree } from "./barberAvailability.js";
import { findOwnedAppointment } from "./ownedAppointment.js";

/** Cambia la hora de la cita con el mismo barbero y el mismo servicio. */
export class RescheduleAppointment {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly transactions: TransactionRunner,
    private readonly clock: Clock,
    private readonly timeZone: TimeZone,
  ) {}

  async execute(input: RescheduleAppointmentInput): Promise<Appointment> {
    const appointment = await findOwnedAppointment(this.appointments, input.appointmentId, input.phone);
    if (!appointment.isScheduled) throw new ConflictError("La cita ya no está activa");
    if (input.start < this.clock.now()) throw new RuleViolationError("Esa hora ya pasó");
    const end = addMinutes(input.start, appointment.service.durationMin);

    return this.transactions.run(async (repos) => {
      // La misma cita no cuenta como ocupada, así se puede correr un rato dentro de su propio espacio
      if (!(await isBarberFree(repos, this.timeZone, appointment.barber, input.start, end, appointment.id))) {
        throw new ConflictError("Esa hora ya no está disponible con ese barbero");
      }
      appointment.reschedule(input.start);
      return repos.appointments.save(appointment);
    });
  }
}
