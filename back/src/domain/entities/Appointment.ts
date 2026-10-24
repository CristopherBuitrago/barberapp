import type { BarberSummary } from "./Barber.js";

/** Los valores son los que ya guarda la base y recibe el front, por eso siguen en español. */
export const AppointmentStatus = {
  Scheduled: "AGENDADA",
  Cancelled: "CANCELADA",
  Completed: "COMPLETADA",
  NoShow: "NO_ASISTIO",
} as const;
export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const BookingChannel = {
  Web: "WEB",
  WhatsApp: "WHATSAPP",
  Panel: "PANEL",
} as const;
export type BookingChannel = (typeof BookingChannel)[keyof typeof BookingChannel];

export interface Appointment {
  id: number;
  clientId: number;
  barberId: number;
  serviceId: number;
  start: Date;
  end: Date;
  status: AppointmentStatus;
  channel: BookingChannel;
  /** Precio del servicio cuando se agendó, así un cambio de precio no toca citas viejas */
  price: number;
  discountPct: number;
  notes: string;
  createdAt: Date;
}

/** La cita con lo que hace falta para mostrarla: barbero, servicio y cliente. */
export interface AppointmentDetail extends Appointment {
  barber: BarberSummary;
  service: { id: number; name: string; durationMin: number };
  client: { id: number; name: string; phone: string };
}

export function finalPrice(appointment: Pick<Appointment, "price" | "discountPct">): number {
  return Math.round((appointment.price * (100 - appointment.discountPct)) / 100);
}
