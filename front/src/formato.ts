/** Utilidades de fechas y precios. Las fechas del back vienen con desfase de Colombia (-05:00). */

export const DESFASE = "-05:00";
export const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function precio(valor: number): string {
  return `$${miles(valor)}`;
}

/** "15.000" (el signo $ lo pone el ícono del diseño). */
export function miles(valor: number): string {
  return valor.toLocaleString("es-CO");
}

/** "573001234567" → "3001234567" (celulares colombianos); otros quedan igual. */
export function telefonoLocal(telefono: string): string {
  return telefono.length === 12 && telefono.startsWith("573") ? telefono.slice(2) : telefono;
}

/** "30min", "1h", "1h 30min". */
export function duracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h ${m}min` : `${h}h`;
}

/** Fecha local de hoy en Colombia, "YYYY-MM-DD". */
export function hoy(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diaSemana(fecha: string): number {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay();
}

/** Lunes de la semana de la fecha. */
export function inicioSemana(fecha: string): string {
  const dia = diaSemana(fecha);
  return sumarDias(fecha, dia === 0 ? -6 : 1 - dia);
}

/** "10:30" de un ISO con desfase. */
export function hora(iso: string): string {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  const sufijo = h < 12 ? "a. m." : "p. m.";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${sufijo}`;
}

/** "14:45" de un ISO con desfase. */
export function hora24(iso: string): string {
  return iso.slice(11, 16);
}

/** "9:00am" de un ISO con desfase. */
export function horaCompacta(iso: string): string {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}

/** "miércoles 14 de octubre". */
export function fechaLarga(fechaOIso: string): string {
  const f = fechaOIso.slice(0, 10);
  return `${DIAS[diaSemana(f)]} ${Number(f.slice(8, 10))} de ${MESES[Number(f.slice(5, 7)) - 1]}`;
}

/** Minutos desde medianoche local de un ISO con desfase. */
export function minutosDelDia(iso: string): number {
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
}

/** Archivo .ics para que el cliente agregue la cita a su calendario. */
export function descargarIcs(titulo: string, inicio: string, fin: string, lugar: string) {
  const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Barberia//Reservas//ES",
    "BEGIN:VEVENT",
    `UID:${utc(inicio)}-${Math.random().toString(36).slice(2)}@barberia`,
    `DTSTAMP:${utc(new Date().toISOString())}`,
    `DTSTART:${utc(inicio)}`,
    `DTEND:${utc(fin)}`,
    `SUMMARY:${titulo}`,
    `LOCATION:${lugar}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${titulo}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "cita-barberia.ics";
  a.click();
  URL.revokeObjectURL(url);
}
