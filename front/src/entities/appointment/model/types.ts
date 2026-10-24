import type { Barber } from "@/entities/barber/@x/appointment";

/** Los valores son los mismos de la API */
export type AppointmentStatus = "AGENDADA" | "CANCELADA" | "COMPLETADA" | "NO_ASISTIO";
export type BookingChannel = "WEB" | "WHATSAPP" | "PANEL";

export interface Appointment {
  id: number;
  /** Con el desfase de Colombia, "2026-10-30T10:00:00-05:00" */
  start: string;
  end: string;
  status: AppointmentStatus;
  channel: BookingChannel;
  price: number;
  discountPct: number;
  finalPrice: number;
  notes: string;
  barber: Barber;
  service: { id: number; name: string; durationMin: number };
  client: { id: number; name: string; phone: string };
}

/** Lo que se manda para agendar */
export interface NewAppointment {
  serviceId: number;
  barberId?: number;
  start: string;
  client: { name: string; phone: string; acceptsDataPolicy: boolean };
}
