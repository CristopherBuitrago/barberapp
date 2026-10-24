import type { Barber } from "../entities/Barber.js";
import type { WorkSchedule } from "../entities/WorkSchedule.js";
import { TimeZone, addMinutes, overlaps } from "../value-objects/TimeZone.js";

/** Algo que ocupa al barbero un rato: una cita o un bloqueo. */
export interface BusyPeriod {
  start: Date;
  end: Date;
}

export interface AvailableSlot {
  start: Date;
  barbers: Barber[];
}

/**
 * Horas libres de un día para un servicio. Recorre la jornada de cada barbero cada
 * intervalMin minutos y junta, por hora, quiénes pueden atender.
 */
export function findFreeSlots(params: {
  date: string;
  durationMin: number;
  intervalMin: number;
  /** No se ofrecen horas que empiecen antes de esto */
  earliestStart: Date;
  timeZone: TimeZone;
  barbers: { barber: Barber; busy: BusyPeriod[] }[];
}): AvailableSlot[] {
  const { date, durationMin, intervalMin, earliestStart, timeZone } = params;
  const byStart = new Map<number, AvailableSlot>();

  for (const { barber, busy } of params.barbers) {
    for (const schedule of barber.schedulesOn(TimeZone.weekday(date))) {
      const dayEnd = timeZone.toInstant(date, schedule.endTime);
      for (
        let start = timeZone.toInstant(date, schedule.startTime);
        addMinutes(start, durationMin) <= dayEnd;
        start = addMinutes(start, intervalMin)
      ) {
        const end = addMinutes(start, durationMin);
        if (start < earliestStart) continue;
        if (busy.some((b) => overlaps(start, end, b.start, b.end))) continue;

        const slot = byStart.get(start.getTime()) ?? { start, barbers: [] };
        slot.barbers.push(barber);
        byStart.set(start.getTime(), slot);
      }
    }
  }

  return [...byStart.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Si [start, end) cabe completo dentro de alguna de las jornadas de ese día. */
export function fitsInSchedule(
  schedules: readonly WorkSchedule[],
  date: string,
  timeZone: TimeZone,
  start: Date,
  end: Date,
): boolean {
  return schedules.some(
    (s) => timeZone.toInstant(date, s.startTime) <= start && end <= timeZone.toInstant(date, s.endTime),
  );
}
