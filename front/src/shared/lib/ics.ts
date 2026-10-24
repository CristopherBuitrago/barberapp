/** Descarga un archivo .ics para que la persona agregue la cita a su calendario, con aviso una hora antes */
export function downloadIcs(title: string, start: string, end: string, place: string) {
  const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Barberia//Reservas//ES",
    "BEGIN:VEVENT",
    `UID:${utc(start)}-${Math.random().toString(36).slice(2)}@barberia`,
    `DTSTAMP:${utc(new Date().toISOString())}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${title}`,
    `LOCATION:${place}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${title}`,
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
