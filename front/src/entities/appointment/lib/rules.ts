import type { Appointment, AppointmentStatus, BookingChannel } from "../model/types";

/** Agendada y todavía no ha terminado. Mientras exista, el cliente no puede reservar otra */
export function isActive(appointment: Appointment | null | undefined, now = new Date()): appointment is Appointment {
  return !!appointment && appointment.status === "AGENDADA" && new Date(appointment.end) > now;
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  AGENDADA: "Agendada",
  CANCELADA: "Cancelada",
  COMPLETADA: "Completada",
  NO_ASISTIO: "No asistió",
};

export const CHANNEL_LABEL: Record<BookingChannel, string> = {
  WEB: "Página web",
  WHATSAPP: "WhatsApp",
  PANEL: "Panel",
};
