import { fitsInSchedule } from "../../../domain/services/availability.js";
import { TimeZone } from "../../../domain/value-objects/TimeZone.js";
import type { TransactionalRepositories } from "../../ports/TransactionRunner.js";

/**
 * Si el barbero puede atender en [start, end): que esté dentro de su jornada, sin
 * bloqueos y sin otra cita agendada. Se usa dentro de la transacción de la reserva.
 */
export async function isBarberFree(
  repos: Pick<TransactionalRepositories, "schedules" | "timeBlocks" | "appointments">,
  timeZone: TimeZone,
  barberId: number,
  start: Date,
  end: Date,
  excludeAppointmentId?: number,
): Promise<boolean> {
  const date = timeZone.localDate(start);
  const schedules = await repos.schedules.findByWeekday(TimeZone.weekday(date), [barberId]);
  if (!fitsInSchedule(schedules, date, timeZone, start, end)) return false;

  const blocks = await repos.timeBlocks.findOverlapping(start, end, [barberId]);
  if (blocks.length > 0) return false;

  const appointments = await repos.appointments.findScheduledOverlapping(start, end, [barberId], excludeAppointmentId);
  return appointments.length === 0;
}
