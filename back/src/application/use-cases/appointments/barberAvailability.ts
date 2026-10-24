import type { Barber } from "../../../domain/entities/Barber.js";
import { fitsInSchedule } from "../../../domain/services/availability.js";
import { TimeZone } from "../../../domain/value-objects/TimeZone.js";
import type { TransactionalRepositories } from "../../ports/TransactionRunner.js";

/**
 * Si el barbero puede atender en [start, end): que esté dentro de su jornada, sin
 * bloqueos y sin otra cita agendada. Se usa dentro de la transacción de la reserva.
 */
export async function isBarberFree(
  repos: Pick<TransactionalRepositories, "timeBlocks" | "appointments">,
  timeZone: TimeZone,
  barber: Barber,
  start: Date,
  end: Date,
  excludeAppointmentId?: number,
): Promise<boolean> {
  const date = timeZone.localDate(start);
  if (!fitsInSchedule(barber.schedulesOn(TimeZone.weekday(date)), date, timeZone, start, end)) return false;

  const blocks = await repos.timeBlocks.findOverlapping(start, end, [barber.id]);
  if (blocks.length > 0) return false;

  const appointments = await repos.appointments.findScheduledOverlapping(start, end, [barber.id], excludeAppointmentId);
  return appointments.length === 0;
}
