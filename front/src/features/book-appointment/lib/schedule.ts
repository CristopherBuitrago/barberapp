import { addDays, today, weekday } from "@/shared/lib";

/** La barbería atiende de lunes a sábado, así que la semana del calendario muestra esos 6 días */
export const BOOKABLE_DAYS_PER_WEEK = 6;

/** Si el día no tiene horas, se busca el próximo con cupo hasta esta cantidad de días */
export const SEARCH_DAYS = 14;

/** Las jornadas en que se agrupan las horas: de qué hora a qué hora */
export const DAY_PARTS = [
  { name: "Mañana", from: 0, to: 12 },
  { name: "Tarde", from: 12, to: 17 },
  { name: "Noche", from: 17, to: 24 },
] as const;

export type DayPart = (typeof DAY_PARTS)[number];

/** Primer día que se puede reservar: hoy, o el lunes si hoy es domingo */
export function firstBookableDay(): string {
  return weekday(today()) === 0 ? addDays(today(), 1) : today();
}

/** Las horas que caen en una jornada */
export function inDayPart<T extends { start: string }>(slots: T[], part: DayPart): T[] {
  return slots.filter((slot) => {
    const hour = Number(slot.start.slice(11, 13));
    return hour >= part.from && hour < part.to;
  });
}
