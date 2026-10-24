const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Hora local de la barbería. Trabaja con un desfase fijo (Colombia no tiene horario
 * de verano), por ejemplo "-05:00".
 */
export class TimeZone {
  private readonly offsetMin: number;

  constructor(readonly offset: string) {
    const match = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
    if (!match) throw new Error(`ZONA_DESFASE inválida: ${offset}`);
    const sign = match[1] === "-" ? -1 : 1;
    this.offsetMin = sign * (Number(match[2]) * 60 + Number(match[3]));
  }

  /** "2026-10-14" con "09:30" en hora local, convertido al instante real */
  toInstant(date: string, time: string): Date {
    return new Date(`${date}T${time}:00${this.offset}`);
  }

  /** De 00:00 de ese día local a 00:00 del siguiente */
  dayRange(date: string): { from: Date; to: Date } {
    const from = this.toInstant(date, "00:00");
    return { from, to: new Date(from.getTime() + DAY_MS) };
  }

  /** Un instante escrito en hora local, por ejemplo "2026-10-14T09:30:00-05:00" */
  toLocalIso(instant: Date): string {
    const local = new Date(instant.getTime() + this.offsetMin * 60 * 1000);
    return `${local.toISOString().slice(0, 19)}${this.offset}`;
  }

  /** Fecha local "YYYY-MM-DD" de un instante */
  localDate(instant: Date): string {
    return this.toLocalIso(instant).slice(0, 10);
  }

  /** Día de la semana de una fecha local, 0 es domingo */
  static weekday(date: string): number {
    return new Date(`${date}T00:00:00Z`).getUTCDay();
  }
}

export function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60 * 1000);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
