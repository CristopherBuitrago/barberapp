import { config } from "./config.js";

const desfaseMin = (() => {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(config.zonaDesfase);
  if (!m) throw new Error(`ZONA_DESFASE inválida: ${config.zonaDesfase}`);
  const signo = m[1] === "-" ? -1 : 1;
  return signo * (Number(m[2]) * 60 + Number(m[3]));
})();

/** "2026-10-14" + "09:30" (hora local de la barbería) -> instante UTC. */
export function aInstante(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}:00${config.zonaDesfase}`);
}

/** Día de la semana (0 = domingo) de una fecha local "YYYY-MM-DD". */
export function diaSemana(fecha: string): number {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay();
}

/** Inicio y fin (UTC) del día local indicado. */
export function rangoDia(fecha: string): { desde: Date; hasta: Date } {
  const desde = aInstante(fecha, "00:00");
  return { desde, hasta: new Date(desde.getTime() + 24 * 60 * 60 * 1000) };
}

/** Instante -> "2026-10-14T09:30:00-05:00" en hora local de la barbería. */
export function aIsoLocal(d: Date): string {
  const local = new Date(d.getTime() + desfaseMin * 60 * 1000);
  return `${local.toISOString().slice(0, 19)}${config.zonaDesfase}`;
}

/** Fecha local "YYYY-MM-DD" de un instante. */
export function fechaLocal(d: Date): string {
  return aIsoLocal(d).slice(0, 10);
}

export function sumarMinutos(d: Date, minutos: number): Date {
  return new Date(d.getTime() + minutos * 60 * 1000);
}

export function seCruzan(aInicio: Date, aFin: Date, bInicio: Date, bFin: Date): boolean {
  return aInicio < bFin && bInicio < aFin;
}
