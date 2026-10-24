import type { AppointmentStatus } from "@/entities/appointment/@x/client";

/** Un cliente como lo ve el admin, con el resumen de sus citas */
export interface ClientSummary {
  id: number;
  name: string;
  /** Como WhatsApp, "573101234567" */
  phone: string;
  /** Si se registró en la web */
  hasAccount: boolean;
  /** Si autorizó el tratamiento de datos (Ley 1581) */
  acceptsDataPolicy: boolean;
  /** Todas sus citas, también las canceladas */
  appointmentCount: number;
  /** La de fecha más reciente, sea cual sea su estado */
  lastAppointment: { start: string; status: AppointmentStatus } | null;
}
