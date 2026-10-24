/**
 * Fechas de la barbería. El back manda las horas con el desfase de Colombia (-05:00),
 * por ejemplo "2026-10-30T10:00:00-05:00", y las fechas sueltas como "YYYY-MM-DD".
 */

export const TZ_OFFSET = "-05:00";
export const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Hoy en Colombia, "YYYY-MM-DD" */
export function today(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 es domingo */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** El lunes de la semana de esa fecha */
export function startOfWeek(date: string): string {
  const day = weekday(date);
  return addDays(date, day === 0 ? -6 : 1 - day);
}

/** "10:30 a. m." */
export function time12(iso: string): string {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  const suffix = h < 12 ? "a. m." : "p. m.";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "14:45" */
export function time24(iso: string): string {
  return iso.slice(11, 16);
}

/** "9:00am" */
export function timeCompact(iso: string): string {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}

/** "miércoles 14 de octubre" */
export function longDate(dateOrIso: string): string {
  const d = dateOrIso.slice(0, 10);
  return `${DAYS[weekday(d)]} ${Number(d.slice(8, 10))} de ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
}

/** "23 oct 2026" de una marca de tiempo en UTC (como creadoEn), en hora de Colombia */
export function shortDate(isoUtc: string): string {
  const d = new Date(new Date(isoUtc).getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1].slice(0, 3)} ${d.slice(0, 4)}`;
}

/** Minutos desde la medianoche, para ubicar algo en el calendario */
export function minutesOfDay(iso: string): number {
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
}
