import { config } from "../config.js";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const desfaseMin = (() => {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(config.zonaDesfase);
  if (!m) throw new Error(`ZONA_DESFASE inválida: ${config.zonaDesfase}`);
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
})();

/** Fecha y hora local de la barbería en texto, ej. "martes 13 de octubre de 2026, 3:05 p. m. (2026-10-13)". */
export function ahoraEnTexto(ahora = new Date()): string {
  const l = new Date(ahora.getTime() + desfaseMin * 60 * 1000);
  const h = l.getUTCHours();
  const hora12 = h % 12 === 0 ? 12 : h % 12;
  const min = String(l.getUTCMinutes()).padStart(2, "0");
  const fecha = l.toISOString().slice(0, 10);
  return `${DIAS[l.getUTCDay()]} ${l.getUTCDate()} de ${MESES[l.getUTCMonth()]} de ${l.getUTCFullYear()}, ${hora12}:${min} ${h < 12 ? "a. m." : "p. m."} (${fecha})`;
}

/** "2026-10-14" + "10:30" -> "2026-10-14T10:30:00-05:00". */
export function aIso(fecha: string, hora: string): string {
  return `${fecha}T${hora}:00${config.zonaDesfase}`;
}

/** "2026-10-14T10:30:00-05:00" -> "miércoles 14 oct, 10:30". */
export function describirInicio(iso: string): string {
  const fecha = iso.slice(0, 10);
  const dia = DIAS[new Date(`${fecha}T00:00:00Z`).getUTCDay()];
  const mes = MESES[Number(fecha.slice(5, 7)) - 1].slice(0, 3);
  return `${dia} ${Number(fecha.slice(8, 10))} ${mes}, ${iso.slice(11, 16)}`;
}
